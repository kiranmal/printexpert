import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

import StatCard from "../components/StatCard";
import { API_URL } from "../../services/apiConfig";
import { fetchAllOrders } from "../../services/orderApi";
import { fetchProducts } from "../../services/productApi";
import "./AdminDashboard.css";

/* ---------- helpers ---------- */

const toDate = (v) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

const isCancelled = (o) =>
  String(o.status || "")
    .toLowerCase()
    .includes("cancel");

const orderTotal = (o) =>
  Number(o.grandTotal ?? o.total ?? 0) || 0;

/* last 30 days vs previous 30 days % change */
const monthChange = (items, dateOf) => {
  const now = Date.now();
  const d30 = 30 * 24 * 60 * 60 * 1000;

  let cur = 0;
  let prev = 0;

  items.forEach((item) => {
    const d = dateOf(item);
    if (!d) return;
    const diff = now - d.getTime();
    if (diff <= d30) cur++;
    else if (diff <= 2 * d30) prev++;
  });

  if (prev === 0) {
    return cur > 0 ? "+100%" : null;
  }

  const pct = Math.round(((cur - prev) / prev) * 100);
  return `${pct > 0 ? "+" : ""}${pct}%`;
};

const statusBucket = (status) => {
  const s = String(status || "").toLowerCase();
  if (s.includes("cancel")) return "cancelled";
  if (s === "delivered") return "delivered";
  if (
    s.includes("process") ||
    s.includes("ship") ||
    s.includes("deliver") ||
    s.includes("pack") ||
    s.includes("confirm")
  ) {
    return "processing";
  }
  return "pending"; /* New / Pending */
};

const STATUS_META = [
  { key: "delivered", label: "Delivered" },
  { key: "processing", label: "Processing" },
  { key: "pending", label: "Pending" },
  { key: "cancelled", label: "Cancelled" },
];

const STATUS_COLORS = {
  delivered: "#22c55e",
  processing: "#f13f95",
  pending: "#f59e0b",
  cancelled: "#ef4444",
};

/* Sales chart buckets */
const buildBuckets = (orders, period) => {
  const now = new Date();

  if (period === "6") {
    /* last 6 months, one bar per month */
    const buckets = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(
        now.getFullYear(),
        now.getMonth() - i,
        1
      );
      buckets.push({
        label: d.toLocaleDateString("en-IN", {
          month: "short",
        }),
        year: d.getFullYear(),
        month: d.getMonth(),
        total: 0,
      });
    }

    orders.forEach((o) => {
      const d = toDate(o.createdAt);
      if (!d || isCancelled(o)) return;
      const b = buckets.find(
        (x) =>
          x.year === d.getFullYear() &&
          x.month === d.getMonth()
      );
      if (b) b.total += orderTotal(o);
    });

    return buckets;
  }

  const days = period === "30" ? 30 : 7;
  const size = period === "30" ? 3 : 1;
  const count = Math.ceil(days / size);

  const buckets = [];
  for (let i = count - 1; i >= 0; i--) {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - i * size);

    const end = new Date(start);
    end.setDate(end.getDate() + size);

    buckets.push({
      label: String(start.getDate()),
      start,
      end,
      total: 0,
    });
  }

  orders.forEach((o) => {
    const d = toDate(o.createdAt);
    if (!d || isCancelled(o)) return;
    const b = buckets.find(
      (x) => d >= x.start && d < x.end
    );
    if (b) b.total += orderTotal(o);
  });

  return buckets;
};

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("7");

  /* ---------- load real data ---------- */

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const token =
          localStorage.getItem("authToken") || "";

        const [ordersRes, usersRes, prods] =
          await Promise.all([
            fetchAllOrders(),
            fetch(`${API_URL}/admin/users`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }).then((r) => r.json()).catch(() => ({})),
            fetchProducts("", { includeAll: true }).catch(() => []),
          ]);

        if (cancelled) return;

        setOrders(
          Array.isArray(ordersRes) ? ordersRes : []
        );
        setUsers(
          Array.isArray(usersRes?.users)
            ? usersRes.users
            : []
        );
        setProducts(
          Array.isArray(prods) ? prods : []
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------- computed stats ---------- */

  const stats = useMemo(() => {
    const live = orders.filter((o) => !isCancelled(o));
    const revenue = live.reduce(
      (s, o) => s + orderTotal(o),
      0
    );

    return {
      revenue,
      orderCount: orders.length,
      userCount: users.filter(
        (u) => u.role !== "admin"
      ).length,
      productCount: products.length,
      revenueChange: null,
      orderChange: monthChange(orders, (o) =>
        toDate(o.createdAt)
      ),
      userChange: monthChange(users, (u) =>
        toDate(u.created_at)
      ),
    };
  }, [orders, users, products]);

  /* revenue change last 30d vs prev 30d */
  const revenueChange = useMemo(() => {
    const now = Date.now();
    const d30 = 30 * 24 * 60 * 60 * 1000;
    let cur = 0;
    let prev = 0;

    orders.forEach((o) => {
      if (isCancelled(o)) return;
      const d = toDate(o.createdAt);
      if (!d) return;
      const diff = now - d.getTime();
      if (diff <= d30) cur += orderTotal(o);
      else if (diff <= 2 * d30) prev += orderTotal(o);
    });

    if (prev === 0) return cur > 0 ? "+100%" : null;
    const pct = Math.round(
      ((cur - prev) / prev) * 100
    );
    return `${pct > 0 ? "+" : ""}${pct}%`;
  }, [orders]);

  /* ---------- status distribution ---------- */

  const statusDist = useMemo(() => {
    const counts = {
      delivered: 0,
      processing: 0,
      pending: 0,
      cancelled: 0,
    };
    orders.forEach((o) => {
      counts[statusBucket(o.status)]++;
    });
    return counts;
  }, [orders]);

  const donutStyle = useMemo(() => {
    const total = orders.length;
    if (!total) {
      return {
        background: "#e5e7eb",
      };
    }

    let acc = 0;
    const parts = STATUS_META.map(({ key }) => {
      const pct = (statusDist[key] / total) * 360;
      const seg = `${STATUS_COLORS[key]} ${acc}deg ${
        acc + pct
      }deg`;
      acc += pct;
      return seg;
    });

    return {
      background: `conic-gradient(${parts.join(", ")})`,
    };
  }, [orders, statusDist]);

  /* ---------- sales chart ---------- */

  const buckets = useMemo(
    () => buildBuckets(orders, period),
    [orders, period]
  );

  const maxBucket = Math.max(
    1,
    ...buckets.map((b) => b.total)
  );

  /* ---------- recent orders ---------- */

  const recentOrders = orders.slice(0, 5);

  const handleAddProduct = () => {
    navigate("/admin/products/add");
  };

  const handleDeliveryManagement = () => {
    navigate("/admin/delivery");
  };

  const handleViewOrders = () => {
    navigate("/admin/orders");
  };

  const fmtINR = (n) =>
    `₹${Number(n || 0).toLocaleString("en-IN")}`;

  const fmtNum = (n) =>
    Number(n || 0).toLocaleString("en-IN");

  return (
    <div className="admin-dashboard">

      {/* =====================================================
          PAGE HEADING
      ===================================================== */}

      <div className="page-heading">

        <div>
          <h2>Good afternoon, Admin 👋</h2>

          <p>
            Here is what's happening with your store today.
          </p>
        </div>

        <div className="dashboard-actions">

          <button
            type="button"
            className="delivery-top-btn"
            onClick={handleDeliveryManagement}
          >
            📍 Delivery Settings
          </button>

          <button
            type="button"
            className="primary-btn"
            onClick={handleAddProduct}
          >
            ＋ Add Product
          </button>

        </div>

      </div>


      {/* =====================================================
          STATISTICS
      ===================================================== */}

      <div className="stats-grid">

        <StatCard
          icon="💰"
          title="Total Revenue"
          value={
            loading ? "…" : fmtINR(stats.revenue)
          }
          change={revenueChange}
          accent="#16a34a"
        />

        <StatCard
          icon="🛒"
          title="Total Orders"
          value={
            loading
              ? "…"
              : fmtNum(stats.orderCount)
          }
          change={stats.orderChange}
          accent="#eb2585"
        />

        <StatCard
          icon="👥"
          title="Total Users"
          value={
            loading ? "…" : fmtNum(stats.userCount)
          }
          change={stats.userChange}
          accent="#7c3aed"
        />

        <StatCard
          icon="📦"
          title="Total Products"
          value={
            loading
              ? "…"
              : fmtNum(stats.productCount)
          }
          change={null}
          accent="#ea580c"
        />

      </div>


      {/* =====================================================
          DELIVERY MANAGEMENT
      ===================================================== */}

      <section className="delivery-dashboard-card">

        <div className="delivery-dashboard-content">

          <div className="delivery-dashboard-icon">
            🚚
          </div>

          <div className="delivery-dashboard-text">

            <span className="delivery-dashboard-label">
              DELIVERY MANAGEMENT
            </span>

            <h3>
              Manage Delivery Locations
            </h3>

            <p>
              Add, edit or remove cities, areas and
              pincodes where you want to provide delivery.
            </p>

          </div>

        </div>

        <button
          type="button"
          className="delivery-dashboard-btn"
          onClick={handleDeliveryManagement}
        >
          Manage Delivery →
        </button>

      </section>


      {/* =====================================================
          CHARTS
      ===================================================== */}

      <div className="dashboard-grid">

        {/* SALES OVERVIEW */}

        <section className="panel">

          <div className="panel-head">

            <div>
              <h3>Sales Overview</h3>
              <p>
                Revenue{" "}
                {period === "6"
                  ? "last 6 months"
                  : `last ${period} days`}
              </p>
            </div>

            <select
              value={period}
              onChange={(e) =>
                setPeriod(e.target.value)
              }
              aria-label="Sales period"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="6">Last 6 months</option>
            </select>

          </div>


          <div className="fake-chart">

            {buckets.map((b, i) => (
              <div className="bar-col" key={i}>

                <div
                  className="bar"
                  title={`${b.label}: ${fmtINR(b.total)}`}
                  style={{
                    height: `${Math.max(
                      4,
                      Math.round(
                        (b.total / maxBucket) * 100
                      )
                    )}%`,
                    opacity:
                      b.total === 0 ? 0.35 : 1,
                  }}
                />

                <small>{b.label}</small>

              </div>
            ))}

          </div>

        </section>


        {/* ORDER STATUS */}

        <section className="panel">

          <div className="panel-head">

            <div>
              <h3>Order Status</h3>
              <p>Current order distribution</p>
            </div>

          </div>


          <div className="donut" style={donutStyle}>

            <div>
              <strong>
                {fmtNum(stats.orderCount)}
              </strong>
              <span>Orders</span>
            </div>

          </div>


          <div className="legend">

            {STATUS_META.map(({ key, label }) => (
              <span key={key}>
                <i className={`dot ${key}`}></i>
                {label}
                <b>
                  {stats.orderCount
                    ? Math.round(
                        (statusDist[key] /
                          stats.orderCount) *
                          100
                      )
                    : 0}
                  %
                </b>
              </span>
            ))}

          </div>

        </section>

      </div>


      {/* =====================================================
          RECENT ORDERS
      ===================================================== */}

      <section className="panel recent-panel">

        <div className="panel-head">

          <div>
            <h3>Recent Orders</h3>
            <p>Latest customer orders</p>
          </div>

          <button
            type="button"
            className="view-all-btn"
            onClick={handleViewOrders}
          >
            View All →
          </button>

        </div>


        <div className="table-wrap">

          <table className="admin-table">

            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>


            <tbody>

              {loading && (
                <tr>
                  <td
                    colSpan="4"
                    style={{
                      padding: "34px",
                      textAlign: "center",
                      color: "#9ca3af",
                    }}
                  >
                    Loading orders...
                  </td>
                </tr>
              )}

              {!loading &&
                recentOrders.map((order) => (
                  <tr key={order.orderNumber}>

                    <td>
                      <strong>
                        {order.orderNumber}
                      </strong>
                    </td>

                    <td>
                      {order.customerName || "—"}
                    </td>

                    <td>
                      {fmtINR(orderTotal(order))}
                    </td>

                    <td>
                      <span
                        className={`status ${statusBucket(
                          order.status
                        )}`}
                      >
                        {order.status || "New"}
                      </span>
                    </td>

                  </tr>
                ))}

              {!loading &&
                recentOrders.length === 0 && (
                  <tr>
                    <td
                      colSpan="4"
                      style={{
                        padding: "34px",
                        textAlign: "center",
                        color: "#9ca3af",
                      }}
                    >
                      No orders yet.
                    </td>
                  </tr>
                )}

            </tbody>

          </table>

        </div>

      </section>

    </div>
  );
}
