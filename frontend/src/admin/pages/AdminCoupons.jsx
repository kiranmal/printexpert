import { useEffect, useState } from "react";
import {
  fetchCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} from "../../services/couponApi";
import {
  TicketPercent,
  Plus,
  Pencil,
  Trash2,
  X,
  Clock3,
} from "lucide-react";

const emptyForm = {
  code: "",
  type: "percent",
  value: "",
  minOrder: "",
  validFrom: "",
  validTo: "",
};

const toInputDateTime = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formatDateTime = (date) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getCouponState = (coupon) => {
  if (!coupon.active) {
    return { label: "Inactive", color: "#6b7280", bg: "#f3f4f6" };
  }
  const now = new Date();
  if (now < new Date(coupon.validFrom)) {
    return { label: "Scheduled", color: "#b45309", bg: "#fffbeb" };
  }
  if (now > new Date(coupon.validTo)) {
    return { label: "Expired", color: "#dc2626", bg: "#fef2f2" };
  }
  return { label: "Live", color: "#15803d", bg: "#f0fdf4" };
};

const inputStyle = {
  width: "100%",
  height: "42px",
  padding: "0 12px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  fontSize: "14px",
  outline: "none",
};

const labelStyle = {
  display: "block",
  fontSize: "13px",
  fontWeight: 600,
  color: "#374151",
  marginBottom: "6px",
};

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadCoupons = async () => {
    try {
      setCoupons(await fetchCoupons());
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (coupon) => {
    setEditing(coupon);
    setForm({
      code: coupon.code,
      type: coupon.type,
      value: String(coupon.value),
      minOrder: String(coupon.minOrder || ""),
      validFrom: toInputDateTime(coupon.validFrom),
      validTo: toInputDateTime(coupon.validTo),
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!form.code.trim() || !form.value || !form.validFrom || !form.validTo) {
      alert("Please fill code, discount value and validity dates.");
      return;
    }

    setSaving(true);

    const payload = {
      code: form.code.trim().toUpperCase(),
      type: form.type,
      value: Number(form.value),
      minOrder: Number(form.minOrder) || 0,
      /* Browser ke local time ko absolute
         instant mein convert karo — server
         ka timezone matter nahi karega */
      validFrom: new Date(form.validFrom).toISOString(),
      validTo: new Date(form.validTo).toISOString(),
    };

    try {
      if (editing) {
        await updateCoupon(editing.id, payload);
      } else {
        await createCoupon(payload);
      }
      closeForm();
      await loadCoupons();
    } catch (error) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (coupon) => {
    try {
      await updateCoupon(coupon.id, { active: !coupon.active });
      await loadCoupons();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDelete = async (coupon) => {
    if (!window.confirm(`Delete coupon "${coupon.code}"?`)) {
      return;
    }

    setDeletingId(coupon.id);

    try {
      await deleteCoupon(coupon.id);
      await loadCoupons();
    } catch (error) {
      alert(error.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div style={{ width: "100%" }}>

      {/* HEADING */}

      <div className="page-heading">
        <div>
          <h2>Discount Coupons</h2>
          <p>Create and manage discount codes with validity</p>
        </div>

        <button
          type="button"
          onClick={() => (showForm ? closeForm() : openAdd())}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 18px",
            border: "none",
            borderRadius: "10px",
            background: "#bd1265",
            color: "#fff",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? "Cancel" : "Add Coupon"}
        </button>
      </div>

      {/* FORM */}

      {showForm && (
        <form
          onSubmit={handleSave}
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "14px",
            padding: "22px 24px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              fontSize: "15px",
              fontWeight: 700,
              color: "#191a1f",
              marginBottom: "16px",
            }}
          >
            {editing
              ? `Edit Coupon: ${editing.code}`
              : "Add New Coupon"}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(170px, 1fr))",
              gap: "16px",
              alignItems: "end",
            }}
          >
            <div>
              <label style={labelStyle}>Coupon Code *</label>
              <input
                type="text"
                name="code"
                value={form.code}
                onChange={handleChange}
                placeholder="e.g. SAVE10"
                style={{
                  ...inputStyle,
                  textTransform: "uppercase",
                }}
              />
            </div>

            <div>
              <label style={labelStyle}>Discount Type *</label>
              <select
                name="type"
                value={form.type}
                onChange={handleChange}
                style={{ ...inputStyle, background: "#fff" }}
              >
                <option value="percent">Percent (%)</option>
                <option value="flat">Flat (₹)</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>
                {form.type === "percent"
                  ? "Percent Off *"
                  : "Amount Off (₹) *"}
              </label>
              <input
                type="number"
                name="value"
                value={form.value}
                onChange={handleChange}
                min="1"
                max={form.type === "percent" ? "100" : undefined}
                placeholder={form.type === "percent" ? "e.g. 10" : "e.g. 200"}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Min Order (₹)</label>
              <input
                type="number"
                name="minOrder"
                value={form.minOrder}
                onChange={handleChange}
                min="0"
                placeholder="0 = no minimum"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Valid From *</label>
              <input
                type="datetime-local"
                name="validFrom"
                value={form.validFrom}
                onChange={handleChange}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Valid To *</label>
              <input
                type="datetime-local"
                name="validTo"
                value={form.validTo}
                onChange={handleChange}
                style={inputStyle}
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              style={{
                height: "42px",
                padding: "0 22px",
                border: "none",
                borderRadius: "8px",
                background: saving ? "#9ca3af" : "#10b981",
                color: "#fff",
                fontSize: "14px",
                fontWeight: 600,
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving
                ? "Saving..."
                : editing
                  ? "Save"
                  : "Add Coupon"}
            </button>
          </div>
        </form>
      )}

      {/* LIST */}

      {loading ? (
        <p style={{ color: "#6b7280" }}>Loading coupons...</p>
      ) : coupons.length === 0 ? (
        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "14px",
            padding: "50px 20px",
            textAlign: "center",
            color: "#6b7280",
          }}
        >
          <TicketPercent
            size={40}
            style={{ marginBottom: "10px", opacity: 0.4 }}
          />
          <div style={{ fontWeight: 600 }}>
            No coupons yet
          </div>
          <div style={{ fontSize: "13px", marginTop: "4px" }}>
            Add your first discount code above.
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fill, minmax(330px, 1fr))",
            gap: "18px",
          }}
        >
          {coupons.map((coupon) => {
            const state = getCouponState(coupon);

            return (
              <div
                key={coupon.id}
                style={{
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "14px",
                  padding: "20px 22px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "20px",
                        fontWeight: 800,
                        color: "#191a1f",
                        letterSpacing: "1px",
                      }}
                    >
                      {coupon.code}
                    </div>
                    <div
                      style={{
                        fontSize: "14px",
                        color: "#bd1265",
                        fontWeight: 700,
                        marginTop: "2px",
                      }}
                    >
                      {coupon.type === "percent"
                        ? `${coupon.value}% OFF`
                        : `₹${coupon.value} OFF`}
                      {coupon.minOrder > 0 && (
                        <span
                          style={{
                            color: "#6b7280",
                            fontWeight: 500,
                          }}
                        >
                          {" "}
                          on ₹{coupon.minOrder}+
                        </span>
                      )}
                    </div>
                  </div>

                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: "20px",
                      fontSize: "11px",
                      fontWeight: 700,
                      color: state.color,
                      background: state.bg,
                    }}
                  >
                    {state.label}
                  </span>
                </div>

                <div
                  style={{
                    marginTop: "14px",
                    fontSize: "12px",
                    color: "#6b7280",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Clock3 size={13} />
                  {formatDateTime(coupon.validFrom)} →{" "}
                  {formatDateTime(coupon.validTo)}
                </div>

                <div
                  style={{
                    marginTop: "16px",
                    display: "flex",
                    gap: "8px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => openEdit(coupon)}
                    style={{
                      flex: 1,
                      height: "34px",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      background: "#fef0f7",
                      color: "#eb2585",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    <Pencil size={13} /> Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggle(coupon)}
                    style={{
                      flex: 1,
                      height: "34px",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      background: coupon.active
                        ? "#fffbeb"
                        : "#f0fdf4",
                      color: coupon.active
                        ? "#b45309"
                        : "#15803d",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {coupon.active ? "Disable" : "Enable"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(coupon)}
                    disabled={deletingId === coupon.id}
                    style={{
                      flex: 1,
                      height: "34px",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      background: "#fef2f2",
                      color: "#dc2626",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor:
                        deletingId === coupon.id
                          ? "not-allowed"
                          : "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      opacity:
                        deletingId === coupon.id ? 0.5 : 1,
                    }}
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
