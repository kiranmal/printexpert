import { Fragment, useEffect, useState } from "react";
import {
  Star,
  Eye,
  Clock,
  CheckCircle,
  StarOff,
  Pencil,
  Save,
  X,
} from "lucide-react";

import { API_URL } from "../../services/apiConfig";

const API_BASE = `${API_URL}/admin/feedback`;

const STATUS_COLORS = {
  Pending: { bg: "#fef3c7", color: "#b45309", icon: Clock },
  Reviewed: { bg: "#fcddec", color: "#d81d77", icon: Eye },
  Resolved: { bg: "#dcfce7", color: "#15803d", icon: CheckCircle },
};

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: "Bearer " + localStorage.getItem("authToken"),
});

function StarRating({ rating }) {
  if (!rating) return <span style={{ color: "#9ca3af" }}>—</span>;
  return (
    <span style={{ display: "inline-flex", gap: "2px" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={14}
          fill={i <= rating ? "#f59e0b" : "none"}
          color={i <= rating ? "#f59e0b" : "#d1d5db"}
        />
      ))}
    </span>
  );
}

function EditableStars({ rating, onChange }) {
  return (
    <span style={{ display: "inline-flex", gap: "2px", cursor: "pointer" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={16}
          fill={i <= rating ? "#f59e0b" : "none"}
          color={i <= rating ? "#f59e0b" : "#d1d5db"}
          onClick={() => onChange(i)}
          style={{ cursor: "pointer" }}
        />
      ))}
    </span>
  );
}

function StatusBadge({ status }) {
  const cfg = STATUS_COLORS[status] || STATUS_COLORS.Pending;
  const Icon = cfg.icon;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "3px 10px",
        borderRadius: "12px",
        fontSize: "12px",
        fontWeight: 600,
        background: cfg.bg,
        color: cfg.color,
      }}
    >
      <Icon size={12} />
      {status || "Pending"}
    </span>
  );
}

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchReviews = async () => {
    try {
      const res = await fetch(API_BASE, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setReviews((data.feedback || []).filter((f) => f.type === "review"));
      }
    } catch (err) {
      console.error("Failed to load reviews:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReviews(); }, []);

  const startEdit = (f) => {
    setEditingId(f.id);
    setEditData({
      name: f.name || "",
      subject: f.subject || "",
      rating: f.rating || 5,
      message: f.message || "",
      status: f.status || "Pending",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEdit = async (id) => {
    setSaving(true);
    try {
      await fetch(`${API_BASE}/${id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({
          name: editData.name,
          subject: editData.subject,
          rating: editData.rating,
          message: editData.message,
          status: editData.status,
        }),
      });
      setEditingId(null);
      setEditData({});
      await fetchReviews();
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setSaving(false);
    }
  };

  const filtered =
    filter === "All" ? reviews : reviews.filter((f) => f.status === filter);

  const counts = {
    Total: reviews.length,
    Pending: reviews.filter((f) => f.status === "Pending").length,
    Reviewed: reviews.filter((f) => f.status === "Reviewed").length,
    Resolved: reviews.filter((f) => f.status === "Resolved").length,
  };

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1)
      : "0.0";

  return (
    <div>
      <div className="page-heading">
        <div>
          <h2>Customer Reviews</h2>
          <p>Product reviews submitted by customers</p>
        </div>
      </div>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "12px",
          marginBottom: "24px",
        }}
      >
        {[
          { label: "Total Reviews", value: counts.Total, color: "#7c3aed", bg: "#faf5ff", icon: Star },
          { label: "Avg Rating", value: avgRating, color: "#f59e0b", bg: "#fffbeb", icon: Star },
          { label: "Pending", value: counts.Pending, color: "#b45309", bg: "#fef3c7", icon: Clock },
          { label: "Reviewed", value: counts.Reviewed, color: "#d81d77", bg: "#fcddec", icon: Eye },
          { label: "Resolved", value: counts.Resolved, color: "#15803d", bg: "#dcfce7", icon: CheckCircle },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: "10px",
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              gap: "14px",
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "10px",
                background: s.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <s.icon size={20} color={s.color} />
            </div>
            <div>
              <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "2px" }}>{s.label}</div>
              <div style={{ fontSize: "24px", fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter + Table */}
      <section className="panel">
        <div style={{ display: "flex", gap: "6px", marginBottom: "16px", flexWrap: "wrap" }}>
          {["All", "Pending", "Reviewed", "Resolved"].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              style={{
                padding: "6px 14px",
                borderRadius: "20px",
                border: filter === tab ? "1px solid #7c3aed" : "1px solid #e5e7eb",
                background: filter === tab ? "#7c3aed" : "#fff",
                color: filter === tab ? "#fff" : "#374151",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 500,
              }}
            >
              {tab} {tab !== "All" ? `(${counts[tab]})` : `(${counts.Total})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#9ca3af" }}>
            <StarOff size={36} color="#d1d5db" style={{ marginBottom: "8px" }} />
            <p style={{ margin: 0 }}>No reviews found</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr
                  style={{
                    textAlign: "left",
                    borderBottom: "2px solid #fdeaf3",
                    fontSize: "12px",
                    color: "#6b7280",
                    background: "#faf5ff",
                  }}
                >
                  <th style={{ padding: "10px" }}>Customer</th>
                  <th style={{ padding: "10px" }}>Product</th>
                  <th style={{ padding: "10px" }}>Rating</th>
                  <th style={{ padding: "10px" }}>Review</th>
                  <th style={{ padding: "10px" }}>Date</th>
                  <th style={{ padding: "10px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((f) => {
                  const isEditing = editingId === f.id;

                  return (
                    <tr
                      key={f.id}
                      style={{
                        borderBottom: "1px solid #f3f4f6",
                        verticalAlign: "top",
                        background: isEditing ? "#faf5ff" : "transparent",
                      }}
                    >
                      {/* Customer */}
                      <td style={{ padding: "10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div
                            style={{
                              width: "34px",
                              height: "34px",
                              borderRadius: "50%",
                              background: "#7c3aed",
                              color: "#fff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "14px",
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {(f.name || "?")[0].toUpperCase()}
                          </div>
                          <div>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editData.name}
                                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                style={{
                                  padding: "4px 8px",
                                  fontSize: "13px",
                                  border: "1px solid #d1d5db",
                                  borderRadius: "6px",
                                  width: "120px",
                                }}
                              />
                            ) : (
                              <>
                                <strong style={{ fontSize: "13px" }}>{f.name}</strong>
                                {f.email && <div style={{ fontSize: "11px", color: "#9ca3af" }}>{f.email}</div>}
                              </>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Product */}
                      <td style={{ padding: "10px", fontSize: "13px", fontWeight: 500, color: "#374151" }}>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editData.subject}
                            onChange={(e) => setEditData({ ...editData, subject: e.target.value })}
                            style={{
                              padding: "4px 8px",
                              fontSize: "13px",
                              border: "1px solid #d1d5db",
                              borderRadius: "6px",
                              width: "160px",
                            }}
                          />
                        ) : (
                          f.subject || "—"
                        )}
                      </td>

                      {/* Rating */}
                      <td style={{ padding: "10px" }}>
                        {isEditing ? (
                          <EditableStars
                            rating={editData.rating}
                            onChange={(r) => setEditData({ ...editData, rating: r })}
                          />
                        ) : (
                          <StarRating rating={f.rating} />
                        )}
                      </td>

                      {/* Review */}
                      <td style={{ padding: "10px", fontSize: "13px", maxWidth: "280px" }}>
                        {isEditing ? (
                          <textarea
                            value={editData.message}
                            onChange={(e) => setEditData({ ...editData, message: e.target.value })}
                            rows={2}
                            style={{
                              width: "100%",
                              padding: "6px 8px",
                              fontSize: "13px",
                              border: "1px solid #d1d5db",
                              borderRadius: "6px",
                              resize: "vertical",
                              fontFamily: "inherit",
                            }}
                          />
                        ) : (
                          f.message
                        )}
                      </td>

                      {/* Date */}
                      <td style={{ padding: "10px", fontSize: "12px", color: "#6b7280", whiteSpace: "nowrap" }}>
                        {f.created_at ? new Date(f.created_at).toLocaleDateString() : "—"}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "10px", whiteSpace: "nowrap" }}>
                        {isEditing ? (
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              onClick={() => saveEdit(f.id)}
                              disabled={saving}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "6px 14px",
                                fontSize: "12px",
                                fontWeight: 600,
                                border: "none",
                                borderRadius: "6px",
                                background: "#15803d",
                                color: "#fff",
                                cursor: "pointer",
                              }}
                            >
                              <Save size={13} />
                              {saving ? "Saving..." : "Save"}
                            </button>
                            <button
                              onClick={cancelEdit}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "6px 14px",
                                fontSize: "12px",
                                fontWeight: 600,
                                border: "1px solid #e5e7eb",
                                borderRadius: "6px",
                                background: "#fff",
                                color: "#374151",
                                cursor: "pointer",
                              }}
                            >
                              <X size={13} />
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(f)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "6px 14px",
                              fontSize: "12px",
                              fontWeight: 600,
                              border: "1px solid #e5e7eb",
                              borderRadius: "6px",
                              background: "#fff",
                              color: "#374151",
                              cursor: "pointer",
                            }}
                          >
                            <Pencil size={13} />
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
