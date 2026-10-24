import { useEffect, useState } from "react";
import {
  MailQuestion,
  Trash2,
  Clock,
  Phone,
  Mail,
  Building2,
  Search,
  X,
  Eye,
  MessageSquare,
} from "lucide-react";

import {
  fetchInquiries,
  updateInquiry,
  deleteInquiry,
} from "../../services/inquiryApi";

const STATUS_CONFIG = {
  new: {
    label: "NEW",
    bg: "#fcddec",
    color: "#d81d77",
    icon: Clock,
  },
  contacted: {
    label: "CONTACTED",
    bg: "#fef3c7",
    color: "#b45309",
    icon: Phone,
  },
  in_progress: {
    label: "IN PROGRESS",
    bg: "#fde2ef",
    color: "#e54693",
    icon: Eye,
  },
  resolved: {
    label: "RESOLVED",
    bg: "#dcfce7",
    color: "#15803d",
    icon: MailQuestion,
  },
};

const STATUS_FILTERS = [
  { key: "All", label: "All" },
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "in_progress", label: "In Progress" },
  { key: "resolved", label: "Resolved" },
];

function StatusBadge({ status }) {
  const cfg =
    STATUS_CONFIG[status] || STATUS_CONFIG.new;
  const Icon = cfg.icon;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "3px 10px",
        borderRadius: "12px",
        fontSize: "11px",
        fontWeight: 700,
        letterSpacing: "0.4px",
        background: cfg.bg,
        color: cfg.color,
        whiteSpace: "nowrap",
      }}
    >
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

const formatDate = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  const today = new Date();
  const isToday =
    d.toDateString() === today.toDateString();

  return isToday
    ? `Today ${d.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })}`
    : d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
};

export default function AdminInquiries() {
  const [inquiries, setInquiries] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [selected, setSelected] = useState(null);
  const [editStatus, setEditStatus] =
    useState("new");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setError("");
      const data = await fetchInquiries({
        status: filter,
        q: search,
        sort,
      });

      setInquiries(data.inquiries);
      setCounts(data.counts);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    setLoading(true);
    load();
  }, [filter, sort]);
  /* eslint-enable */

  /* search debounce */
  useEffect(() => {
    const t = setTimeout(load, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [search]);

  const openInquiry = (inq) => {
    setSelected(inq);
    setEditStatus(inq.status || "new");
    setEditNotes(inq.admin_notes || "");
  };

  const saveChanges = async () => {
    if (!selected) return;

    setSaving(true);
    try {
      await updateInquiry(selected.id, {
        status: editStatus,
        adminNotes: editNotes,
      });

      setSelected(null);
      await load();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const removeInquiry = async (id) => {
    if (!window.confirm("Delete this inquiry?"))
      return;

    try {
      await deleteInquiry(id);
      setSelected(null);
      await load();
    } catch (err) {
      alert(err.message);
    }
  };

  const totalNew = Number(counts?.new || 0);

  return (
    <div
      className="admin-page"
      style={{ padding: "24px" }}
    >
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "18px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "22px",
              fontWeight: 800,
              color: "#25262d",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <MailQuestion size={22} />
            Contact Inquiries
            {totalNew > 0 && (
              <span
                style={{
                  background: "#eb2585",
                  color: "#fff",
                  fontSize: "12px",
                  fontWeight: 700,
                  padding: "2px 10px",
                  borderRadius: "12px",
                }}
              >
                {totalNew} new
              </span>
            )}
          </h1>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: "13px",
              color: "#64748b",
            }}
          >
            Customer requests from the website
            contact form.
          </p>
        </div>
      </div>

      {/* FILTERS + SEARCH */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: "7px 14px",
              borderRadius: "8px",
              border: "1px solid",
              borderColor:
                filter === f.key
                  ? "#bd1265"
                  : "#e2e8f0",
              background:
                filter === f.key
                  ? "#fceaf3"
                  : "#fff",
              color:
                filter === f.key
                  ? "#bd1265"
                  : "#475569",
              fontSize: "12.5px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {f.label}
            {f.key !== "All" &&
              counts[f.key] > 0 &&
              ` (${counts[f.key]})`}
          </button>
        ))}

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: "8px",
            alignItems: "center",
          }}
        >
          <div
            style={{
              position: "relative",
            }}
          >
            <Search
              size={15}
              style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform:
                  "translateY(-50%)",
                color: "#94a3b8",
              }}
            />
            <input
              type="search"
              placeholder="Search name, phone, product..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              style={{
                height: "36px",
                width: "240px",
                paddingLeft: "32px",
                paddingRight: "10px",
                border:
                  "1px solid #e2e8f0",
                borderRadius: "8px",
                fontSize: "13px",
              }}
            />
          </div>

          <select
            value={sort}
            onChange={(e) =>
              setSort(e.target.value)
            }
            style={{
              height: "36px",
              padding: "0 10px",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              fontSize: "12.5px",
              background: "#fff",
            }}
          >
            <option value="newest">
              Newest first
            </option>
            <option value="oldest">
              Oldest first
            </option>
          </select>
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div
          style={{
            padding: "12px 16px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "8px",
            color: "#b91c1c",
            fontSize: "13px",
            marginBottom: "14px",
          }}
        >
          {error}
        </div>
      )}

      {/* TABLE */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          overflow: "hidden",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "13px",
          }}
        >
          <thead>
            <tr
              style={{
                background: "#fcf8fa",
                textAlign: "left",
              }}
            >
              {[
                "Name",
                "Product",
                "Phone",
                "Quantity",
                "Status",
                "Date",
                "",
              ].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "12px 14px",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#64748b",
                    textTransform:
                      "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan="7"
                  style={{
                    padding: "40px",
                    textAlign: "center",
                    color: "#94a3b8",
                  }}
                >
                  Loading inquiries...
                </td>
              </tr>
            ) : inquiries.length === 0 ? (
              <tr>
                <td
                  colSpan="7"
                  style={{
                    padding: "40px",
                    textAlign: "center",
                    color: "#94a3b8",
                  }}
                >
                  <MessageSquare
                    size={28}
                    style={{
                      marginBottom: "8px",
                      opacity: 0.5,
                    }}
                  />
                  <div>No inquiries found.</div>
                </td>
              </tr>
            ) : (
              inquiries.map((inq) => (
                <tr
                  key={inq.id}
                  onClick={() =>
                    openInquiry(inq)
                  }
                  style={{
                    borderTop:
                      "1px solid #f9f1f5",
                    cursor: "pointer",
                    background:
                      inq.status === "new"
                        ? "#fffbfd"
                        : "#fff",
                  }}
                >
                  <td
                    style={{
                      padding: "12px 14px",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        color: "#25262d",
                      }}
                    >
                      {inq.name}
                    </div>
                    <div
                      style={{
                        fontSize: "11.5px",
                        color: "#94a3b8",
                      }}
                    >
                      {inq.company_name ||
                        inq.email}
                    </div>
                  </td>

                  <td
                    style={{
                      padding: "12px 14px",
                      color: "#334155",
                    }}
                  >
                    {inq.product_name || "—"}
                  </td>

                  <td
                    style={{
                      padding: "12px 14px",
                      color: "#334155",
                    }}
                  >
                    {inq.phone}
                  </td>

                  <td
                    style={{
                      padding: "12px 14px",
                      color: "#334155",
                    }}
                  >
                    {inq.quantity || "—"}
                  </td>

                  <td
                    style={{
                      padding: "12px 14px",
                    }}
                  >
                    <StatusBadge
                      status={inq.status}
                    />
                  </td>

                  <td
                    style={{
                      padding: "12px 14px",
                      fontSize: "12px",
                      color: "#64748b",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatDate(
                      inq.created_at
                    )}
                  </td>

                  <td
                    style={{
                      padding: "12px 14px",
                    }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeInquiry(inq.id);
                      }}
                      title="Delete"
                      style={{
                        border: "none",
                        background:
                          "transparent",
                        color: "#94a3b8",
                        cursor: "pointer",
                        padding: "4px",
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* DETAIL DRAWER */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(25, 26, 31,.4)",
            zIndex: 100,
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <div
            onClick={(e) =>
              e.stopPropagation()
            }
            style={{
              width: "min(460px, 95vw)",
              height: "100%",
              background: "#fff",
              padding: "24px",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: "18px",
                  fontWeight: 800,
                  color: "#25262d",
                }}
              >
                Inquiry Details
              </h2>

              <button
                onClick={() =>
                  setSelected(null)
                }
                style={{
                  border: "none",
                  background: "#f9f1f5",
                  borderRadius: "8px",
                  padding: "8px",
                  cursor: "pointer",
                  color: "#64748b",
                }}
              >
                <X size={17} />
              </button>
            </div>

            {/* CUSTOMER */}
            <Section title="Customer Information">
              <Row
                label="Name"
                value={selected.name}
              />
              {selected.company_name && (
                <Row
                  label="Company"
                  value={
                    selected.company_name
                  }
                />
              )}
              <Row
                label="Email"
                value={selected.email}
                icon={<Mail size={13} />}
              />
              <Row
                label="Phone"
                value={selected.phone}
                icon={<Phone size={13} />}
              />
            </Section>

            {/* REQUIREMENT */}
            <Section title="Requirement">
              <Row
                label="Product"
                value={
                  selected.product_name ||
                  "Not specified"
                }
              />
              {selected.product_options && (
                <Row
                  label="Options"
                  value={
                    selected.product_options
                  }
                />
              )}
              <Row
                label="Quantity"
                value={
                  selected.quantity ||
                  "—"
                }
              />
              <Row
                label="Source"
                value={selected.source}
              />
            </Section>

            {/* MESSAGE */}
            <Section title="Message">
              <p
                style={{
                  margin: 0,
                  fontSize: "13.5px",
                  lineHeight: 1.65,
                  color: "#334155",
                  background: "#fcf8fa",
                  padding: "12px 14px",
                  borderRadius: "8px",
                }}
              >
                "{selected.message}"
              </p>
            </Section>

            {/* STATUS */}
            <div
              style={{
                marginTop: "18px",
              }}
            >
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#475569",
                  marginBottom: "6px",
                }}
              >
                Status
              </label>
              <select
                value={editStatus}
                onChange={(e) =>
                  setEditStatus(
                    e.target.value
                  )
                }
                style={{
                  width: "100%",
                  height: "40px",
                  border:
                    "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "0 10px",
                  fontSize: "13.5px",
                }}
              >
                {Object.keys(
                  STATUS_CONFIG
                ).map((s) => (
                  <option
                    key={s}
                    value={s}
                  >
                    {STATUS_CONFIG[s].label}
                  </option>
                ))}
              </select>
            </div>

            {/* NOTES */}
            <div
              style={{
                marginTop: "14px",
              }}
            >
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#475569",
                  marginBottom: "6px",
                }}
              >
                Admin Notes
              </label>
              <textarea
                value={editNotes}
                onChange={(e) =>
                  setEditNotes(
                    e.target.value
                  )
                }
                rows="3"
                placeholder="Add internal note..."
                style={{
                  width: "100%",
                  border:
                    "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "10px 12px",
                  fontSize: "13px",
                  fontFamily: "inherit",
                  resize: "vertical",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div
              style={{
                fontSize: "11.5px",
                color: "#94a3b8",
                marginTop: "12px",
              }}
            >
              Received:{" "}
              {formatDate(
                selected.created_at
              )}
            </div>

            {/* ACTIONS */}
            <div
              style={{
                display: "flex",
                gap: "10px",
                marginTop: "20px",
              }}
            >
              <button
                onClick={saveChanges}
                disabled={saving}
                style={{
                  flex: 1,
                  height: "44px",
                  border: "none",
                  borderRadius: "9px",
                  background: "#bd1265",
                  color: "#fff",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: "pointer",
                  opacity: saving
                    ? 0.6
                    : 1,
                }}
              >
                {saving
                  ? "Saving..."
                  : "Save Changes"}
              </button>

              <button
                onClick={() =>
                  removeInquiry(
                    selected.id
                  )
                }
                style={{
                  width: "44px",
                  height: "44px",
                  border:
                    "1px solid #fecaca",
                  borderRadius: "9px",
                  background: "#fef2f2",
                  color: "#dc2626",
                  cursor: "pointer",
                }}
                title="Delete inquiry"
              >
                <Trash2 size={17} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: "18px" }}>
      <div
        style={{
          fontSize: "11px",
          fontWeight: 800,
          color: "#94a3b8",
          textTransform: "uppercase",
          letterSpacing: "0.7px",
          borderBottom:
            "1px solid #f9f1f5",
          paddingBottom: "6px",
          marginBottom: "10px",
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({ label, value, icon }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "12px",
        padding: "4px 0",
        fontSize: "13.5px",
      }}
    >
      <span
        style={{
          color: "#64748b",
          display: "inline-flex",
          alignItems: "center",
          gap: "5px",
        }}
      >
        {icon}
        {label}
      </span>
      <strong
        style={{
          color: "#25262d",
          fontWeight: 600,
          textAlign: "right",
          wordBreak: "break-word",
        }}
      >
        {value}
      </strong>
    </div>
  );
}
