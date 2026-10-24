import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye } from "lucide-react";
import {
  fetchAllOrders,
  updateOrderStatusRemote,
} from "../../services/orderApi";
import "./AdminOrders.css";

export default function AdminOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    loadOrders();

    const handleOrdersUpdate = () => {
      loadOrders();
    };

    window.addEventListener(
      "printExpertOrdersUpdated",
      handleOrdersUpdate
    );

    window.addEventListener(
      "storage",
      handleOrdersUpdate
    );

    return () => {
      window.removeEventListener(
        "printExpertOrdersUpdated",
        handleOrdersUpdate
      );

      window.removeEventListener(
        "storage",
        handleOrdersUpdate
      );
    };
  }, []);

  async function loadOrders() {
    let localOrders = [];

    try {
      const savedOrders =
        localStorage.getItem("printExpertOrders");

      const parsedOrders = savedOrders
        ? JSON.parse(savedOrders)
        : [];

      localOrders = Array.isArray(parsedOrders)
        ? parsedOrders
        : [];
    } catch (error) {
      console.error(
        "Orders loading error:",
        error
      );
    }

    /* Server = source of truth.
       localStorage sirf tab jab API unreachable ho */
    const remoteOrders = await fetchAllOrders();

    setOrders(remoteOrders || localOrders);
  }

  const getStatusClass = (status) => {
    return String(status || "Pending")
      .toLowerCase()
      .replace(/\s+/g, "-");
  };

  const isPendingOrder = (order) => {
    const status = String(order?.status || "").toLowerCase();
    return ["new", "pending", "payment pending"].includes(status);
  };

  const formatPrice = (price) => {
    return Number(price || 0).toLocaleString(
      "en-IN"
    );
  };

  const updateOrderStatus = async (order, status) => {
    const orderId = order.orderId || order.id || order.orderNumber;

    /* DB update — on failure restore the old selection so
       the table never shows a status the DB rejected */
    const remoteOk = await updateOrderStatusRemote(
      order.orderNumber || orderId,
      status
    ).catch(() => false);

    if (remoteOk === false) {
      alert("Status update failed. Please try again.");
      return;
    }

    const updatedOrders = orders.map((item) => {
      const itemId = item.orderId || item.id || item.orderNumber;

      return String(itemId) === String(orderId)
        ? {
            ...item,
            status,
            updatedAt: new Date().toISOString(),
          }
        : item;
    });

    setOrders(updatedOrders);

    /* only update locally-originated orders —
       remote orders (all customers) must not be written
       into the printExpertOrders cache */
    try {
      const savedLocal = JSON.parse(
        localStorage.getItem("printExpertOrders") || "[]"
      );

      if (Array.isArray(savedLocal)) {
        const updatedLocal = savedLocal.map((item) => {
          const itemId =
            item.orderId || item.id || item.orderNumber;

          return String(itemId) === String(orderId)
            ? {
                ...item,
                status,
                updatedAt: new Date().toISOString(),
              }
            : item;
        });

        localStorage.setItem(
          "printExpertOrders",
          JSON.stringify(updatedLocal)
        );
      }
    } catch {
      /* local cache optional */
    }

    window.dispatchEvent(new Event("printExpertOrdersUpdated"));
    window.dispatchEvent(new Event("ordersUpdated"));
  };

  return (
    <div className="admin-orders-page">

      {/* ================= HEADER ================= */}

      <div className="page-heading orders-heading">

        <div>
          <span className="orders-label">
            ORDER MANAGEMENT
          </span>

          <h2>
            Orders
          </h2>

          <p>
            Manage and track all customer orders
          </p>
        </div>

        <div className="orders-count-card">
          <span>
            Total Orders
          </span>

          <strong>
            {orders.length}
          </strong>
        </div>

      </div>


      {/* ================= STATS ================= */}

      <div className="order-stats">

        <div className="order-stat">
          <span className="stat-icon">
            📦
          </span>

          <div>
            <small>
              Total Orders
            </small>

            <strong>
              {orders.length}
            </strong>
          </div>
        </div>


        <div className="order-stat">
          <span className="stat-icon">
            ⏳
          </span>

          <div>
            <small>
              Pending
            </small>

            <strong>
              {
                orders.filter(
                  isPendingOrder
                ).length
              }
            </strong>
          </div>
        </div>


        <div className="order-stat">
          <span className="stat-icon">
            🚚
          </span>

          <div>
            <small>
              Shipped
            </small>

            <strong>
              {
                orders.filter(
                  (order) =>
                    String(
                      order.status
                    ).toLowerCase() ===
                    "shipped"
                ).length
              }
            </strong>
          </div>
        </div>


        <div className="order-stat">
          <span className="stat-icon">
            ✓
          </span>

          <div>
            <small>
              Delivered
            </small>

            <strong>
              {
                orders.filter(
                  (order) =>
                    String(
                      order.status
                    ).toLowerCase() ===
                    "delivered"
                ).length
              }
            </strong>
          </div>
        </div>

      </div>


      {/* ================= ORDERS TABLE ================= */}

      <section className="panel orders-panel">

        <div className="panel-head">

          <div>
            <h3>
              All Orders
            </h3>

            <p>
              Customer order history
            </p>
          </div>

          <button
            className="refresh-orders"
            onClick={loadOrders}
          >
            ↻ Refresh
          </button>

        </div>


        {orders.length === 0 ? (

          <div className="empty-orders">

            <div className="empty-orders-icon">
              📦
            </div>

            <h3>
              No Orders Yet
            </h3>

            <p>
              Customer orders will appear
              here after checkout.
            </p>

          </div>

        ) : (

          <div className="table-wrap">

            <table className="admin-table orders-table">

              <thead>
                <tr>

                  <th>
                    Order ID
                  </th>

                  <th>
                    Customer
                  </th>

                  <th>
                    Products
                  </th>

                  <th>
                    Amount
                  </th>

                  <th>
                    Payment
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Date
                  </th>

                  <th>
                    Manage Status
                  </th>

                  <th>
                    View
                  </th>

                </tr>
              </thead>


              <tbody>

                {orders.map(
                  (order, index) => {

                    const orderItems =
                      Array.isArray(
                        order.cart
                      )
                        ? order.cart
                        : Array.isArray(
                            order.items
                          )
                        ? order.items
                        : [];

                    return (

                      <tr
                        key={
                          order.id ||
                          order.orderId ||
                          index
                        }
                      >

                        {/* ORDER ID */}

                        <td>

                          <strong className="order-id">
                            {order.orderId ||
                              order.id ||
                              `#ORD-${1000 + index}`}
                          </strong>

                        </td>


                        {/* CUSTOMER */}

                        <td>

                          <div className="customer-cell">

                            <div className="customer-avatar">
                              {(
                                order.name ||
                                order.customerName ||
                                order.userName ||
                                "C"
                              )
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div>

                              <strong>
                                {order.name ||
                                  order.customerName ||
                                  order.userName ||
                                  "Customer"}
                              </strong>

                              <small>
                                {order.email ||
                                  order.customerEmail ||
                                  "No email"}
                              </small>

                            </div>

                          </div>

                        </td>


                        {/* PRODUCTS */}

                        <td>

                          <span className="products-count">

                            {orderItems.length ||
                              order.totalProducts ||
                              0}

                            {" "}
                            product
                            {
                              (
                                orderItems.length ||
                                order.totalProducts ||
                                0
                              ) !== 1
                                ? "s"
                                : ""
                            }

                          </span>

                        </td>


                        {/* AMOUNT */}

                        <td>

                          <strong className="order-amount">

                            ₹
                            {formatPrice(
                              order.totalPrice ||
                                order.amount
                            )}

                          </strong>

                        </td>


                        {/* PAYMENT */}

                        <td>

                          <span
                            className={`payment-status ${
                              String(
                                order.paymentStatus ||
                                  "Pending"
                              ).toLowerCase()
                            }`}
                          >
                            {order.paymentStatus ||
                              "Pending"}
                          </span>

                        </td>


                        {/* STATUS */}

                        <td>

                          <span
                            className={`status ${getStatusClass(
                              order.status
                            )}`}
                          >
                            {order.status ||
                              "Pending"}
                          </span>

                        </td>


                        {/* DATE */}

                        <td>

                          <span className="order-date">

                            {order.createdAt
                              ? new Date(
                                  order.createdAt
                                ).toLocaleDateString(
                                  "en-IN"
                                )
                              : "—"}

                          </span>

                        </td>

                        <td>
                          <select
                            className="order-status-select"
                            value={order.status || "New"}
                            onChange={(event) =>
                              updateOrderStatus(
                                order,
                                event.target.value
                              )
                            }
                            aria-label={`Update status for ${order.orderId || order.id}`}
                          >
                            <option value="New">New</option>
                            <option value="Confirmed">Confirmed</option>
                            <option value="Processing">Processing</option>
                            <option value="Shipped">Shipped</option>
                            <option value="Out for Delivery">Out for Delivery</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </td>

                        {/* VIEW DETAILS */}

                        <td>
                          <button
                            className="order-view-btn"
                            title="View order details"
                            onClick={() =>
                              navigate(
                                `/admin/orders/${
                                  order.orderNumber ||
                                  order.orderId ||
                                  order.id
                                }`
                              )
                            }
                          >
                            <Eye size={16} />
                          </button>
                        </td>

                      </tr>

                    );
                  }
                )}

              </tbody>

            </table>

          </div>

        )}

      </section>

    </div>
  );
}

