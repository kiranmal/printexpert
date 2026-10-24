import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Palette,
  Package,
  User,
  CreditCard,
  FileText,
  Truck,
  X,
} from "lucide-react";
import { API_URL } from "../../services/apiConfig";
import { fetchFileBlob } from "../../services/fileApi";
import { cancelOrder } from "../../services/orderApi";
import "./AdminOrders.css";

const formatAddress = (addr) => {
  if (!addr) return "";
  if (typeof addr === "string") return addr;
  const parts = [
    addr.address,
    [addr.city, addr.state].filter(Boolean).join(", "),
    addr.pincode ? `PIN: ${addr.pincode}` : "",
  ];
  return parts.filter(Boolean).join("\n");
};

const formatPrice = (v) => Number(v || 0).toLocaleString("en-IN");

const formatDate = (d) =>
  d
    ? new Date(d).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : "Not provided";

const fmtSize = (bytes) => {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1048576).toFixed(2)} MB`;
};

const isImageMime = (m) => /^image\//i.test(m || "");
const isImageRef = (src) =>
  typeof src === "string" &&
  (src.startsWith("data:image") ||
    /\.(png|jpe?g|gif|webp|svg|avif)(\?|#|$)/i.test(src));
const isFileRef = (src) =>
  typeof src === "string" &&
  src.length > 0 &&
  src !== "[uploaded]" &&
  (src.startsWith("data:") ||
    src.startsWith("http") ||
    src.startsWith("/"));

/* render an arbitrary metadata value without dumping raw
   objects / base64 into the page */
const MetaValue = ({ value }) => {
  if (value === null || value === undefined) return <>—</>;

  if (typeof value === "boolean") return <>{value ? "Yes" : "No"}</>;

  if (typeof value === "number") return <>{formatPrice(value)}</>;

  if (typeof value === "string") {
    if (value.startsWith("data:")) return <>[embedded file data]</>;
    if (/^\d{4}-\d{2}-\d{2}T/.test(value))
      return <>{formatDate(value)}</>;
    return <>{value.length > 200 ? value.slice(0, 200) + "…" : value}</>;
  }

  if (Array.isArray(value)) {
    const scalars = value.filter(
      (v) => v === null || ["string", "number", "boolean"].includes(typeof v)
    );
    if (!scalars.length) return <>{`[${value.length} entries]`}</>;
    return <>{scalars.map(String).join(", ")}</>;
  }

  if (typeof value === "object") {
    /* one level deep: show scalar entries only */
    const entries = Object.entries(value).filter(
      ([, v]) =>
        v !== null &&
        v !== undefined &&
        v !== "" &&
        ["string", "number", "boolean"].includes(typeof v) &&
        !(typeof v === "string" && v.startsWith("data:"))
    );
    if (!entries.length) return <>—</>;
    return (
      <span className="od-meta-obj">
        {entries.map(([k, v]) => `${k}: ${v}`).join("  ·  ")}
      </span>
    );
  }

  return <>{String(value)}</>;
};

export default function AdminOrderDetails() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lightbox, setLightbox] = useState(null);
  const [copied, setCopied] = useState("");
  const [blobUrls, setBlobUrls] = useState({});

  /* cancellation UI state */
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelMsg, setCancelMsg] = useState(null);

  const fetchOrder = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      setError("Please login as admin.");
      return;
    }
    try {
      const res = await fetch(
        `${API_URL}/orders/track/${encodeURIComponent(orderId)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json().catch(() => ({}));

      if (res.status === 404) {
        setError("Order not found.");
      } else if (res.status === 401 || res.status === 403) {
        setError("You are not authorized to view this order.");
      } else if (!res.ok || !data.order) {
        setError(data.message || "Unable to load order.");
      } else {
        setOrder(data.order);
      }
    } catch {
      setError("Server unreachable. Is the backend running?");
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchOrder().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const CANCELLABLE = new Set([
    "new",
    "pending",
    "processing",
    "confirmed",
    "order placed",
  ]);
  const isCancellable =
    order &&
    CANCELLABLE.has(
      String(order.status || "").toLowerCase()
    );
  const isCancelled =
    String(order?.status || "").toLowerCase() ===
    "cancelled";

  const handleCancel = async () => {
    if (cancelling) return;
    setCancelling(true);
    setCancelMsg(null);

    const result = await cancelOrder(
      order.orderNumber || order.orderId || orderId,
      cancelReason
    );

    setCancelling(false);

    if (result.success) {
      setCancelOpen(false);
      setCancelReason("");
      setCancelMsg({
        ok: true,
        text: result.alreadyCancelled
          ? "Order was already cancelled."
          : "Order cancelled successfully.",
      });
      await fetchOrder();
      /* orders list refresh when navigating back */
      window.dispatchEvent(
        new Event("printExpertOrdersUpdated")
      );
    } else {
      setCancelMsg({
        ok: false,
        text: result.message || "Unable to cancel order.",
      });
    }
  };

  const loadFile = async (fileId) => {
    if (!fileId || blobUrls[fileId] !== undefined) return;
    setBlobUrls((p) => ({ ...p, [fileId]: "loading" }));
    const blob = await fetchFileBlob(fileId);
    setBlobUrls((p) => ({
      ...p,
      [fileId]: blob ? URL.createObjectURL(blob) : null,
    }));
  };

  /* Open → in-page lightbox overlay for images (PDFs and
     other types open in a new tab — lightbox renders <img>
     only); Download → forces a save dialog with filename */
  const previewFile = async (fileId) => {
    const blob = await fetchFileBlob(fileId);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    if ((blob.type || "").startsWith("image/")) {
      setLightbox(url);
      /* object URL revoked when the lightbox closes */
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  const downloadFile = async (fileId, name) => {
    const blob = await fetchFileBlob(fileId);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name || "file";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  const copyField = async (label, value) => {
    try {
      await navigator.clipboard.writeText(String(value));
      setCopied(label);
      setTimeout(() => setCopied(""), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const CopyBtn = ({ label, value }) => (
    <button
      type="button"
      className="od-copy"
      onClick={() => copyField(label, value)}
    >
      {copied === label ? "Copied" : "Copy"}
    </button>
  );

  const ZoomableImg = ({ src, className }) =>
    src ? (
      <img
        src={src}
        alt=""
        className={`${className} od-zoomable`}
        title="Click to enlarge"
        onClick={() => setLightbox(src)}
      />
    ) : null;

  const renderElement = (el, side) => {
    if (!el || el.hidden || el.visible === false) return null;

    if (el.type === "image") {
      return (
        <div key={el.id || `${side}-${el.src?.length}`} className="od-el">
          <span className="od-el-side">{side}</span>
          <span className="od-el-label">{el.label || "Logo / Image"}</span>
          {el.src && isFileRef(el.src) && (
            <ZoomableImg src={el.src} className="od-el-img" />
          )}
        </div>
      );
    }

    if (el.type === "icon") {
      return (
        <div key={el.id} className="od-el">
          <span className="od-el-side">{side}</span>
          <span className="od-el-label">{el.label || "Icon"}</span>
          <span className="od-el-text">{el.icon} icon</span>
        </div>
      );
    }

    if (el.type === "shape") {
      return (
        <div key={el.id} className="od-el">
          <span className="od-el-side">{side}</span>
          <span className="od-el-label">{el.label || "Shape"}</span>
          <span className="od-el-text">
            {el.shape} ·{" "}
            <i
              style={{
                display: "inline-block",
                width: "10px",
                height: "10px",
                borderRadius: "2px",
                background: el.color,
              }}
            />{" "}
            {el.color}
          </span>
        </div>
      );
    }

    if (el.type !== "text") return null;

    return (
      <div key={el.id} className="od-el">
        <span className="od-el-side">{side}</span>
        <span className="od-el-label">{el.label || "Text"}</span>
        <span
          className="od-el-text"
          style={{
            fontFamily: el.fontFamily,
            fontWeight:
              el.bold || Number(el.fontWeight) >= 600 ? 700 : 400,
            fontStyle: el.italic ? "italic" : "normal",
            textDecoration: el.underline ? "underline" : "none",
            color: el.color,
          }}
        >
          {el.text}
        </span>
        <small className="od-el-meta">
          {el.fontFamily} · {el.fontSize}px · {el.color}
        </small>
      </div>
    );
  };

  const statusClass = (s) =>
    s === "Delivered"
      ? "delivered"
      : s === "Cancelled"
      ? "cancelled"
      : s === "Shipped" || s === "Out for Delivery"
      ? "shipped"
      : s === "Processing"
      ? "processing"
      : "pending";

  /* ---------- render ---------- */

  if (loading) {
    return (
      <div className="admin-orders-page od-page">
        <p className="od-state">Loading order details...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="admin-orders-page od-page">
        <button
          className="od-back"
          onClick={() => navigate("/admin/orders")}
        >
          <ArrowLeft size={15} /> Back to Orders
        </button>
        <p className="od-state od-state-error">
          {error || "Order not found."}
        </p>
      </div>
    );
  }

  const items = Array.isArray(order.items)
    ? order.items
    : Array.isArray(order.products)
    ? order.products
    : Array.isArray(order.cart)
    ? order.cart
    : [];

  const dv =
    order.deliveryVerification &&
    typeof order.deliveryVerification === "object"
      ? order.deliveryVerification
      : null;

  const tracking =
    order.tracking && typeof order.tracking === "object"
      ? order.tracking
      : null;

  const trackingStages = tracking
    ? [
        ["Ordered", tracking.ordered],
        ["Processing", tracking.processing],
        ["Shipped", tracking.shipped],
        ["Out for Delivery", tracking.outForDelivery],
        ["Delivered", tracking.delivered],
      ]
    : [];

  /* metadata not covered by the sections above */
  const shownKeys = new Set([
    "id", "orderId", "orderNumber", "items", "products", "cart",
    "customer", "user", "customerName", "email", "phone",
    "shippingAddress", "address", "billingAddress",
    "paymentMethod", "payment", "paymentStatus",
    "razorpayOrderId", "razorpayPaymentId", "subtotal",
    "totalPrice", "shipping", "shippingCharge", "discount",
    "couponCode", "total", "grandTotal", "totalAmount",
    "status", "createdAt", "updatedAt", "dbId",
    "customizationCharges", "totalQuantity", "totalItems",
    "deliveryVerification", "deliveryVerified", "tracking",
    "cancelledAt", "cancelledBy", "cancelReason",
    "refundStatus",
  ]);
  const extras = Object.entries(order).filter(
    ([k, v]) =>
      !shownKeys.has(k) && v !== null && v !== undefined && v !== ""
  );

  return (
    <div className="admin-orders-page od-page">
      {/* ================= HEADER ================= */}
      <header className="od-page-head">
        <button
          className="od-back"
          onClick={() => navigate("/admin/orders")}
        >
          <ArrowLeft size={15} /> Back to Orders
        </button>
        <div className="od-page-title">
          <h2>{order.orderNumber || order.orderId || order.id}</h2>
          <span className="od-date">
            Placed {formatDate(order.createdAt)}
          </span>
        </div>
        <span className={`status ${statusClass(order.status)}`}>
          {order.status || "New"}
        </span>
        {isCancellable && !isCancelled && (
          <button
            className="od-cancel-btn"
            onClick={() => setCancelOpen(true)}
            disabled={cancelling}
          >
            Cancel Order
          </button>
        )}
      </header>

      {/* CANCEL CONFIRMATION PANEL */}
      {cancelOpen && (
        <div className="od-cancel-panel">
          <strong>Cancel this order?</strong>
          <p>
            Stock will be restored for every item. This
            cannot be undone.
          </p>
          <textarea
            placeholder="Cancellation reason (optional)"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={2}
            maxLength={500}
          />
          <div className="od-cancel-actions">
            <button
              className="od-cancel-confirm"
              onClick={handleCancel}
              disabled={cancelling}
            >
              {cancelling ? "Cancelling..." : "Yes, Cancel Order"}
            </button>
            <button
              className="od-back"
              onClick={() => {
                setCancelOpen(false);
                setCancelReason("");
              }}
              disabled={cancelling}
            >
              Keep Order
            </button>
          </div>
        </div>
      )}

      {cancelMsg && (
        <div
          className={`od-cancel-msg ${
            cancelMsg.ok ? "ok" : "err"
          }`}
        >
          {cancelMsg.text}
        </div>
      )}

      {/* ================= TWO-COLUMN BODY ================= */}
      <div className="od-cols">
        {/* -------- MAIN COLUMN: products -------- */}
        <div className="od-col-main">
          {items.map((item, idx) => {
            const cardEls = (d) =>
              Array.isArray(d?.elements) ? d.elements : [];

            const front = item.designs?.front?.length
              ? item.designs.front
              : cardEls(
                  item.frontDesign || item.customization?.frontDesign
                );
            const back = item.designs?.back?.length
              ? item.designs.back
              : cardEls(
                  item.backDesign || item.customization?.backDesign
                );
            const otherSides = item.designs
              ? Object.entries(item.designs)
                  .filter(
                    ([k, v]) =>
                      k !== "front" &&
                      k !== "back" &&
                      Array.isArray(v) &&
                      v.length > 0
                  )
                  .flatMap(([k, v]) =>
                    v.map((el) => ({ ...el, _side: k }))
                  )
              : [];

            const hasDesign =
              front.length > 0 ||
              back.length > 0 ||
              otherSides.length > 0;

            const personal = [
              ["Name", item.personName],
              ["Designation", item.designation],
              ["Company", item.companyName],
              ["Text", item.text],
              ["Template", item.template],
              ["Font", item.fontFamily],
              ["Font Size", item.fontSize && `${item.fontSize}px`],
              ["Text Color", item.textColor],
              ["Text Position", item.textPosition],
              ["Logo Position", item.logoPosition],
              ["Logo Size", item.logoSize && `${item.logoSize}px`],
            ].filter(
              ([, v]) => v !== undefined && v !== null && v !== ""
            );

            const styleFlags = [
              item.bold && "Bold",
              item.italic && "Italic",
              item.underline && "Underline",
            ].filter(Boolean);

            /* ---- customer uploaded files & design assets ---- */
            const assets = [];
            const pushAsset = (a) => {
              if (a && (a.src || a.fileId || a.name)) assets.push(a);
            };

            (Array.isArray(item.uploadedDesigns)
              ? item.uploadedDesigns
              : []
            ).forEach((d) =>
              pushAsset({
                name: d?.name || "Uploaded file",
                type: d?.type || "",
                size: d?.size,
                src: d?.dataUrl || d?.src || d?.url || null,
                fileId: d?.fileId || null,
                origin: "Customer upload",
              })
            );

            if (item.uploadedDesign) {
              const d = item.uploadedDesign;
              pushAsset({
                name:
                  typeof d === "string"
                    ? "Uploaded design"
                    : d.name || "Uploaded design",
                type: d?.type || "",
                size: d?.size,
                src:
                  typeof d === "string"
                    ? d
                    : d?.dataUrl || d?.src || d?.url || null,
                fileId: d?.fileId || null,
                origin: "Customer upload",
              });
            }

            if (typeof item.logo === "string" && item.logo) {
              pushAsset({
                name: "Logo",
                type: "image",
                src: item.logo === "[uploaded]" ? null : item.logo,
                fileId: item.logoFileId || null,
                origin: "Logo",
              });
            }

            [...front, ...back, ...otherSides].forEach((el) => {
              if (
                (el.type === "image" || el.type === "qr") &&
                isFileRef(el.src)
              ) {
                pushAsset({
                  name: el.label || `${el.type} element`,
                  type: "image",
                  src: el.src,
                  origin: el._side
                    ? `Design (${el._side})`
                    : "Design element",
                });
              }
            });

            const attrs =
              item.attributes &&
              typeof item.attributes === "object" &&
              !Array.isArray(item.attributes)
                ? Object.entries(item.attributes)
                : [];

            const isCustom =
              hasDesign ||
              item.customized ||
              item.isCustomized ||
              personal.length > 0;

            const unitPrice = Number(item.price) || 0;
            const qty = Number(item.quantity) || 1;
            const lineTotal =
              Number(item.total) ||
              Number(item.totalPrice) ||
              unitPrice * qty;

            return (
              <section className="od-card" key={item.id || idx}>
                <h4>
                  <Palette size={14} /> {item.name || "Product"}
                </h4>

                <div className="od-item-head">
                  {(item.image || item.images?.[0]) && (
                    <ZoomableImg
                      src={item.image || item.images?.[0]}
                      className="od-item-img"
                    />
                  )}
                  <div className="od-item-meta">
                    {(item.productId || item.product_id) && (
                      <span>
                        Product ID: {item.productId || item.product_id}
                      </span>
                    )}
                    {item.itemType && (
                      <span>Type: {item.itemType}</span>
                    )}
                    {item.size && <span>Size: {item.size}</span>}
                    {item.paperType && (
                      <span>Paper: {item.paperType}</span>
                    )}
                    {item.color && <span>Color: {item.color}</span>}
                    {item.unit && <span>Unit: {item.unit}</span>}
                    {attrs.map(([k, v]) => (
                      <span key={k}>
                        {k}: {String(v)}
                      </span>
                    ))}
                    <span>Qty: {qty}</span>
                    <span>Unit price: ₹{formatPrice(unitPrice)}</span>
                    <span className="od-line-total">
                      Line total: ₹{formatPrice(lineTotal)}
                    </span>
                  </div>
                </div>

                {/* CUSTOMIZATION */}
                {isCustom && hasDesign && (
                  <div className="od-design">
                    <div className="od-design-tag">
                      CUSTOMIZED DESIGN
                    </div>
                    {front.map((el) => renderElement(el, "Front"))}
                    {back.map((el) => renderElement(el, "Back"))}
                    {otherSides.map((el) =>
                      renderElement(el, el._side)
                    )}
                  </div>
                )}

                {isCustom && personal.length > 0 && (
                  <div className="od-design">
                    <div className="od-design-tag">
                      PERSONALIZATION
                    </div>
                    {personal.map(([k, v]) => (
                      <div className="od-el" key={k}>
                        <span className="od-el-label">{k}</span>
                        <span className="od-el-text">
                          {String(v)}
                        </span>
                      </div>
                    ))}
                    {styleFlags.length > 0 && (
                      <div className="od-el">
                        <span className="od-el-label">Style</span>
                        <span className="od-el-text">
                          {styleFlags.join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {!isCustom && (
                  <p className="od-no-design">
                    Standard product — no customization.
                  </p>
                )}
                {isCustom &&
                  !hasDesign &&
                  personal.length === 0 && (
                    <p className="od-no-design">
                      Marked as customized — no design data saved.
                    </p>
                  )}

                {/* CUSTOMER UPLOADED FILES & DESIGN ASSETS */}
                {assets.length > 0 && (
                  <div className="od-files">
                    <div className="od-design-tag">
                      <FileText size={12} /> CUSTOMER UPLOADED FILES
                      &amp; DESIGN ASSETS
                    </div>
                    {assets.map((a, i) => {
                      const previewable =
                        (a.fileId &&
                          (isImageMime(a.type) ||
                            a.type === "image")) ||
                        (!a.fileId && a.src && isImageRef(a.src));
                      const blobUrl = a.fileId
                        ? blobUrls[a.fileId]
                        : null;

                      return (
                        <div className="od-file" key={i}>
                          {a.fileId ? (
                            blobUrl && blobUrl !== "loading" &&
                            previewable ? (
                              <ZoomableImg
                                src={blobUrl}
                                className="od-file-thumb"
                              />
                            ) : (
                              <button
                                type="button"
                                className="od-file-icon od-file-load"
                                title="Load preview"
                                onClick={() => loadFile(a.fileId)}
                              >
                                {blobUrl === "loading" ? "…" : "📄"}
                              </button>
                            )
                          ) : a.src && isImageRef(a.src) ? (
                            <ZoomableImg
                              src={a.src}
                              className="od-file-thumb"
                            />
                          ) : (
                            <span className="od-file-icon">📄</span>
                          )}

                          <div className="od-file-info">
                            <span className="od-file-name">
                              {a.name}
                            </span>
                            <small>
                              {[a.origin, a.type, fmtSize(a.size)]
                                .filter(Boolean)
                                .join(" · ")}
                            </small>
                          </div>

                          {a.fileId ? (
                            <div className="od-file-actions">
                              <button
                                type="button"
                                className="od-file-open"
                                onClick={() => previewFile(a.fileId)}
                              >
                                Open
                              </button>
                              <button
                                type="button"
                                className="od-file-open od-file-download"
                                onClick={() =>
                                  downloadFile(a.fileId, a.name)
                                }
                              >
                                Download
                              </button>
                            </div>
                          ) : a.src && isFileRef(a.src) ? (
                            <div className="od-file-actions">
                              {isImageRef(a.src) ? (
                                <button
                                  type="button"
                                  className="od-file-open"
                                  onClick={() => setLightbox(a.src)}
                                >
                                  Open
                                </button>
                              ) : (
                                <a
                                  className="od-file-open"
                                  href={a.src}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Open
                                </a>
                              )}
                              <a
                                className="od-file-open od-file-download"
                                href={a.src}
                                download={a.name || undefined}
                              >
                                Download
                              </a>
                            </div>
                          ) : (
                            <span className="od-file-missing">
                              File data not stored
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {item.customerDescription && (
                  <div className="od-note">
                    <small>Customer Description</small>
                    <p>{item.customerDescription}</p>
                  </div>
                )}

                {(item.customerNote || item.specialNote) && (
                  <div className="od-note">
                    <small>Special Instructions</small>
                    <p>{item.customerNote || item.specialNote}</p>
                  </div>
                )}
              </section>
            );
          })}

          {/* TRACKING */}
          {trackingStages.length > 0 && (
            <section className="od-card">
              <h4>
                <Truck size={14} /> Tracking
              </h4>
              <div className="od-track">
                {trackingStages.map(([label, done]) => (
                  <span
                    key={label}
                    className={`od-track-step ${done ? "done" : ""}`}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* ADDITIONAL INFORMATION */}
          {extras.length > 0 && (
            <details className="od-card od-extras">
              <summary>
                Additional Information ({extras.length} fields)
              </summary>
              <div className="od-grid">
                {extras.map(([k, v]) => (
                  <div className="od-row" key={k}>
                    <span>{k}</span>
                    <strong>
                      <MetaValue value={v} />
                    </strong>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>

        {/* -------- SIDE COLUMN: order/customer/totals -------- */}
        <div className="od-col-side">
          {/* ORDER INFORMATION */}
          <section className="od-card">
            <h4>
              <Package size={14} /> Order Information
            </h4>
            <div className="od-row">
              <span>Order Number</span>
              <strong>
                {order.orderNumber || order.orderId || "—"}
              </strong>
            </div>
            <div className="od-row">
              <span>Order Date</span>
              <strong>{formatDate(order.createdAt)}</strong>
            </div>
            <div className="od-row">
              <span>Status</span>
              <strong>{order.status || "New"}</strong>
            </div>
            <div className="od-row">
              <span>Payment Method</span>
              <strong>
                {order.paymentMethod || order.payment || "—"}
              </strong>
            </div>
            <div className="od-row">
              <span>Payment Status</span>
              <strong>{order.paymentStatus || "Pending"}</strong>
            </div>
            {order.razorpayOrderId && (
              <div className="od-row">
                <span>Razorpay Order</span>
                <strong className="od-mono">
                  {order.razorpayOrderId}
                </strong>
              </div>
            )}
            {order.razorpayPaymentId && (
              <div className="od-row">
                <span>Razorpay Payment</span>
                <strong className="od-mono">
                  {order.razorpayPaymentId}
                </strong>
              </div>
            )}
            {order.deliveryVerified !== undefined && (
              <div className="od-row">
                <span>Delivery Verified</span>
                <strong>
                  {order.deliveryVerified ? "Yes" : "No"}
                </strong>
              </div>
            )}
          </section>

          {/* CANCELLATION INFO */}
          {isCancelled && (
            <section className="od-card od-cancelled-card">
              <h4 className="od-cancelled-title">
                Cancellation
                <span className="status cancelled">
                  Cancelled
                </span>
              </h4>
              <div className="od-row">
                <span>Status</span>
                <strong>Cancelled</strong>
              </div>
              <div className="od-row">
                <span>Cancelled On</span>
                <strong>
                  {order.cancelledAt
                    ? formatDate(order.cancelledAt)
                    : "Not available"}
                </strong>
              </div>
              <div className="od-row">
                <span>Cancelled By</span>
                <strong>
                  {order.cancelledBy === "admin"
                    ? "Admin"
                    : order.cancelledBy === "customer"
                    ? "Customer"
                    : order.cancelledBy || "Not available"}
                </strong>
              </div>
              <div className="od-row od-row-block">
                <span>Reason</span>
                <strong className="od-cancel-reason">
                  {order.cancelReason ||
                    "No reason provided"}
                </strong>
              </div>
              {order.refundStatus && (
                <div className="od-row">
                  <span>Refund Status</span>
                  <strong>
                    {order.refundStatus} — manual review
                    required
                  </strong>
                </div>
              )}
            </section>
          )}

          {/* DELIVERY VERIFICATION DETAILS */}
          {dv && (
            <section className="od-card">
              <h4>
                <Truck size={14} /> Delivery Verification
              </h4>
              {dv.serviceable !== undefined && (
                <div className="od-row">
                  <span>Serviceable</span>
                  <strong>{dv.serviceable ? "Yes" : "No"}</strong>
                </div>
              )}
              {dv.pincode && (
                <div className="od-row">
                  <span>Pincode</span>
                  <strong>{dv.pincode}</strong>
                </div>
              )}
              {dv.city && (
                <div className="od-row">
                  <span>City</span>
                  <strong>{dv.city}</strong>
                </div>
              )}
              {dv.state && (
                <div className="od-row">
                  <span>State</span>
                  <strong>{dv.state}</strong>
                </div>
              )}
              {dv.verifiedAt && (
                <div className="od-row">
                  <span>Verified At</span>
                  <strong>{formatDate(dv.verifiedAt)}</strong>
                </div>
              )}
            </section>
          )}

          {/* CUSTOMER */}
          <section className="od-card">
            <h4>
              <User size={14} /> Customer
            </h4>
            <div className="od-row">
              <span>Name</span>
              <strong>
                {order.customerName ||
                  order.customer?.name ||
                  "Not provided"}
              </strong>
            </div>
            <div className="od-row">
              <span>Email</span>
              <strong className="od-break">
                {order.email ||
                  order.customer?.email ||
                  "Not provided"}
                {(order.email || order.customer?.email) && (
                  <CopyBtn
                    label="email"
                    value={order.email || order.customer?.email}
                  />
                )}
              </strong>
            </div>
            <div className="od-row">
              <span>Phone</span>
              <strong>
                {order.phone ||
                  order.customer?.phone ||
                  "Not provided"}
                {(order.phone || order.customer?.phone) && (
                  <CopyBtn
                    label="phone"
                    value={order.phone || order.customer?.phone}
                  />
                )}
              </strong>
            </div>
            <div className="od-row">
              <span>Address</span>
              <strong
                className="od-break"
                style={{ whiteSpace: "pre-line" }}
              >
                {formatAddress(
                  order.shippingAddress || order.address
                ) || "Not provided"}
                {(order.shippingAddress || order.address) && (
                  <CopyBtn
                    label="address"
                    value={formatAddress(
                      order.shippingAddress || order.address
                    )}
                  />
                )}
              </strong>
            </div>
            {order.billingAddress && (
              <div className="od-row">
                <span>Billing</span>
                <strong
                  className="od-break"
                  style={{ whiteSpace: "pre-line" }}
                >
                  {formatAddress(order.billingAddress)}
                </strong>
              </div>
            )}
          </section>

          {/* PAYMENT SUMMARY */}
          <section className="od-card od-total">
            <h4>
              <CreditCard size={14} /> Payment Summary
            </h4>
            <div className="od-row">
              <span>Items</span>
              <strong>{items.length}</strong>
            </div>
            <div className="od-row">
              <span>Subtotal</span>
              <strong>
                ₹
                {formatPrice(
                  order.subtotal ??
                    order.totalPrice ??
                    order.total
                )}
              </strong>
            </div>
            {(Number(order.discount) > 0 || order.couponCode) && (
              <div className="od-row">
                <span>
                  Discount
                  {order.couponCode
                    ? ` (${order.couponCode})`
                    : ""}
                </span>
                <strong>- ₹{formatPrice(order.discount)}</strong>
              </div>
            )}
            <div className="od-row">
              <span>Delivery</span>
              <strong>
                {Number(order.shippingCharge ?? order.shipping) > 0
                  ? `₹${formatPrice(
                      order.shippingCharge ?? order.shipping
                    )}`
                  : "Free"}
              </strong>
            </div>
            {order.customizationCharges > 0 && (
              <div className="od-row">
                <span>Customization Charges</span>
                <strong>
                  ₹{formatPrice(order.customizationCharges)}
                </strong>
              </div>
            )}
            <div className="od-row od-grand">
              <span>Total</span>
              <strong>
                ₹
                {formatPrice(
                  order.total ??
                    order.grandTotal ??
                    order.totalAmount ??
                    order.totalPrice ??
                    order.amount
                )}
              </strong>
            </div>
          </section>
        </div>
      </div>

      {/* LIGHTBOX */}
      {lightbox && (
        <div
          className="od-lightbox"
          onClick={() => {
            /* blob URLs created for file previews are
               revoked on close — dataURLs/thumbnails
               are left alone */
            if (String(lightbox).startsWith("blob:"))
              URL.revokeObjectURL(lightbox);
            setLightbox(null);
          }}
        >
          <button
            type="button"
            className="od-lightbox-close"
            title="Close"
            aria-label="Close preview"
          >
            <X size={20} />
          </button>
          <img src={lightbox} alt="" />
          <span className="od-lightbox-hint">
            Click anywhere to close
          </span>
        </div>
      )}
    </div>
  );
}
