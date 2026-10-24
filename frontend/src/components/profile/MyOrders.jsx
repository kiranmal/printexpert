import React, { useEffect, useMemo, useState } from "react";
import {
  Package,
  CheckCircle,
  Clock3,
  Truck,
  CircleCheck,
  FileText,
  MessageSquare,
  Palette,
  MapPin,
  CreditCard,
  Download,
  Edit3,
  Headphones,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
} from "lucide-react";

import "./MyOrders.css";
import {
  fetchMyOrders,
  mergeOrders,
  cancelOrder,
} from "../../services/orderApi";

const CANCELLABLE_STATUSES = new Set([
  "new",
  "pending",
  "processing",
  "confirmed",
  "order placed",
]);

const MyOrders = ({
  orders: ordersFromProps = [],
  onTrack,
}) => {
  const [orders, setOrders] = useState([]);
  const [expandedOrders, setExpandedOrders] = useState({});

  /* customer order cancellation */
  const [cancelFor, setCancelFor] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  /* ============================================================
     LOAD ORDERS — localStorage + server DB merge
  ============================================================ */

  const loadOrders = async () => {
    let localOrders = [];

    try {
      const savedOrders = localStorage.getItem("printExpertOrders");

      if (savedOrders) {
        const parsedOrders = JSON.parse(savedOrders);

        if (Array.isArray(parsedOrders)) {
          localOrders = parsedOrders;
        }
      }
    } catch (error) {
      console.error("Orders load error:", error);
    }

    if (localOrders.length === 0) {
      localOrders = Array.isArray(ordersFromProps)
        ? ordersFromProps
        : [];
    }

    /* Server se bhi laao — doosre device ke orders */
    const remoteOrders = await fetchMyOrders();
    setOrders(mergeOrders(remoteOrders, localOrders));
  };

  useEffect(() => {
    loadOrders();
  }, []);

  /* ============================================================
     LISTEN FOR NEW ORDERS
  ============================================================ */

  const handleCancelOrder = async (orderNumber) => {
    if (cancelling) return;
    setCancelling(true);

    const result = await cancelOrder(orderNumber, cancelReason);

    setCancelling(false);

    if (result.success) {
      setCancelFor(null);
      setCancelReason("");

      /* mirror new status into localStorage — server is
         already updated; this keeps the list consistent
         even if a refetch is delayed */
      try {
        const saved = JSON.parse(
          localStorage.getItem("printExpertOrders") || "[]"
        );
        if (Array.isArray(saved)) {
          localStorage.setItem(
            "printExpertOrders",
            JSON.stringify(
              saved.map((o) =>
                String(
                  o?.orderNumber || o?.orderId || o?.id
                ) === String(orderNumber)
                  ? {
                      ...o,
                      status: "Cancelled",
                      cancelledAt:
                        result.cancelledAt ||
                        new Date().toISOString(),
                      cancelledBy: "customer",
                      cancelReason:
                        result.cancelReason ||
                        cancelReason ||
                        null,
                      refundStatus:
                        result.refundStatus || null,
                    }
                  : o
              )
            )
          );
        }
      } catch {
        /* non-fatal — server already has it */
      }

      window.dispatchEvent(new Event("printExpertOrdersUpdated"));
      await loadOrders();
    } else {
      alert(result.message || "Unable to cancel order.");
    }
  };

  useEffect(() => {
    const handleOrdersUpdated = () => {
      loadOrders();
    };

    window.addEventListener(
      "printExpertOrdersUpdated",
      handleOrdersUpdated
    );

    window.addEventListener(
      "ordersUpdated",
      handleOrdersUpdated
    );

    window.addEventListener(
      "storage",
      handleOrdersUpdated
    );

    return () => {
      window.removeEventListener(
        "printExpertOrdersUpdated",
        handleOrdersUpdated
      );

      window.removeEventListener(
        "ordersUpdated",
        handleOrdersUpdated
      );

      window.removeEventListener(
        "storage",
        handleOrdersUpdated
      );
    };
  }, []);

  /* ============================================================
     PROPS FALLBACK
  ============================================================ */

  useEffect(() => {
    if (
      !localStorage.getItem("printExpertOrders") &&
      Array.isArray(ordersFromProps)
    ) {
      setOrders(ordersFromProps);
    }
  }, [ordersFromProps]);

  /* ============================================================
     ORDER ITEMS
  ============================================================ */

  const getOrderItems = (order) => {
    if (Array.isArray(order?.items)) {
      return order.items;
    }

    if (Array.isArray(order?.products)) {
      return order.products;
    }

    if (Array.isArray(order?.cart)) {
      return order.cart;
    }

    if (order?.product) {
      return [order.product];
    }

    return [];
  };

  /* ============================================================
     DESCRIPTION
  ============================================================ */

  const getCustomerDescription = (order, item) => {
    return (
      item?.customerDescription ||
      item?.userDescription ||
      item?.customDescription ||
      order?.customerDescription ||
      order?.userDescription ||
      order?.customDescription ||
      ""
    );
  };

  /* ============================================================
     SPECIAL NOTE
  ============================================================ */

  const getCustomerNote = (order, item) => {
    return (
      item?.customerNote ||
      item?.specialNote ||
      item?.instructions ||
      item?.customerInstructions ||
      order?.customerNote ||
      order?.specialNote ||
      order?.instructions ||
      order?.customerInstructions ||
      ""
    );
  };

  /* ============================================================
     CUSTOM TEXT
  ============================================================ */

  const getCustomText = (item) => {
    return (
      item?.text ||
      item?.customText ||
      item?.customTextValue ||
      ""
    );
  };

  /* ============================================================
     CUSTOMIZATION CHECK
  ============================================================ */

  const isCustomized = (order, item) => {
    return Boolean(
      item?.isCustomized ||
      item?.logo ||
      item?.text ||
      item?.customText ||
      item?.fontFamily ||
      item?.fontSize ||
      item?.textColor ||
      item?.textPosition ||
      item?.logoPosition ||
      item?.customerDescription ||
      item?.customerNote ||
      item?.specialNote ||
      item?.instructions ||
      order?.customerDescription ||
      order?.customerNote ||
      order?.specialNote ||
      order?.instructions
    );
  };

  /* ============================================================
     DATE
  ============================================================ */

  const formatDate = (date) => {
    if (!date) {
      return "N/A";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "N/A";
    }

    return parsedDate.toLocaleString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  /* ============================================================
     SHORT DATE
  ============================================================ */

  const formatShortDate = (date) => {
    if (!date) {
      return "-";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "-";
    }

    return parsedDate.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  /* ============================================================
     TIME
  ============================================================ */

  const formatTime = (date) => {
    if (!date) {
      return "-";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "-";
    }

    return parsedDate.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  /* ============================================================
     PRICE
  ============================================================ */

  const formatPrice = (price) => {
    return (Number(price) || 0).toLocaleString("en-IN");
  };

  /* ============================================================
     TOTAL
  ============================================================ */

  const getOrderTotal = (order) => {
    return (
      Number(order?.totalPrice) ||
      Number(order?.total) ||
      Number(order?.grandTotal) ||
      Number(order?.subtotal) ||
      0
    );
  };

  /* ============================================================
     PRODUCT PRICE
  ============================================================ */

  const getProductPrice = (order, item) => {
    if (item?.basePrice !== undefined) {
      return Number(item.basePrice) || 0;
    }

    if (item?.productPrice !== undefined) {
      return Number(item.productPrice) || 0;
    }

    if (order?.basePrice !== undefined) {
      return Number(order.basePrice) || 0;
    }

    return Number(item?.price) || 0;
  };

  /* ============================================================
     CUSTOMIZATION PRICE
  ============================================================ */

  const getCustomizationPrice = (order, item) => {
    if (item?.customizationPrice !== undefined) {
      return Number(item.customizationPrice) || 0;
    }

    if (item?.customizationCharges !== undefined) {
      return Number(item.customizationCharges) || 0;
    }

    if (order?.customizationCharges !== undefined) {
      return Number(order.customizationCharges) || 0;
    }

    return 0;
  };

  /* ============================================================
     QUANTITY
  ============================================================ */

  const getTotalQuantity = (order) => {
    if (order?.totalQuantity !== undefined) {
      return Number(order.totalQuantity) || 1;
    }

    const items = getOrderItems(order);

    return items.reduce((total, item) => {
      return total + (Number(item?.quantity) || 1);
    }, 0);
  };

  /* ============================================================
     ORDER ID
  ============================================================ */

  const getOrderNumber = (order) => {
    return (
      order?.orderNumber ||
      order?.orderId ||
      order?.id ||
      "N/A"
    );
  };

  /* ============================================================
     USER
  ============================================================ */

  const getCurrentUser = (order) => {
    if (order?.user) {
      return order.user;
    }

    try {
      const savedUser =
        localStorage.getItem("currentUser");

      if (savedUser) {
        return JSON.parse(savedUser);
      }
    } catch (error) {
      console.error("Current user error:", error);
    }

    return {};
  };

  /* ============================================================
     SHIPPING ADDRESS
  ============================================================ */

  const getShippingAddress = (order) => {
    const user = getCurrentUser(order);

    return (
      order?.shippingAddress ||
      order?.address ||
      user?.shippingAddress ||
      user?.address ||
      {}
    );
  };

  /* ============================================================
     ADDRESS TEXT
  ============================================================ */

  const getAddressParts = (order) => {
    const user = getCurrentUser(order);
    const address = getShippingAddress(order);

    return {
      name:
        address?.name ||
        user?.name ||
        user?.fullName ||
        "Customer",

      address:
        address?.address ||
        address?.street ||
        address?.line1 ||
        user?.addressLine1 ||
        user?.street ||
        "",

      city:
        address?.city ||
        user?.city ||
        "",

      state:
        address?.state ||
        address?.stateName ||
        user?.state ||
        "",

      pincode:
        address?.pincode ||
        address?.zip ||
        address?.postalCode ||
        user?.pincode ||
        user?.zip ||
        "",

      country:
        address?.country ||
        user?.country ||
        "India",

      phone:
        address?.phone ||
        user?.phone ||
        user?.mobile ||
        "",
    };
  };

  /* ============================================================
     TOGGLE
  ============================================================ */

  const toggleOrder = (orderKey) => {
    setExpandedOrders((prev) => ({
      ...prev,
      [orderKey]: !prev[orderKey],
    }));
  };

  /* ============================================================
     TRACK
  ============================================================ */

  const handleTrack = (order, event) => {
    if (event) {
      event.stopPropagation();
    }

    if (typeof onTrack === "function") {
      onTrack(order);
    }
  };

  /* ============================================================
     STATUS
  ============================================================ */

  const getStatusStep = (status) => {
    const normalized = String(
      status || "Confirmed"
    ).toLowerCase();

    if (
      normalized.includes("delivered")
    ) {
      return 4;
    }

    if (
      normalized.includes("shipped")
    ) {
      return 3;
    }

    if (
      normalized.includes("processing")
    ) {
      return 2;
    }

    if (
      normalized.includes("confirm")
    ) {
      return 1;
    }

    return 0;
  };

  /* ============================================================
     ORDER SUMMARY
  ============================================================ */

  const getSummary = (order) => {
    const items = getOrderItems(order);

    const firstItem = items[0] || {};

    const productPrice =
      Number(order?.basePrice) ||
      getProductPrice(order, firstItem);

    const customization =
      Number(order?.customizationCharges) ||
      getCustomizationPrice(
        order,
        firstItem
      );

    const quantity =
      getTotalQuantity(order);

    const total =
      getOrderTotal(order) ||
      productPrice + customization;

    return {
      productPrice,
      customization,
      quantity,
      total,
    };
  };

  /* ============================================================
     PRINT / INVOICE
  ============================================================ */

  const handleDownloadInvoice = (order) => {
    const invoiceWindow = window.open(
      "",
      "_blank"
    );

    if (!invoiceWindow) {
      alert(
        "Please allow popup to download invoice."
      );

      return;
    }

    const items = getOrderItems(order);
    const address = getAddressParts(order);
    const summary = getSummary(order);

    const itemRows = items
      .map(
        (item) => `
          <tr>
            <td>${item?.name || "Product"}</td>
            <td>${item?.size || "-"}</td>
            <td>${item?.quantity || 1}</td>
            <td>₹${formatPrice(
              item?.totalPrice ??
                item?.price ??
                0
            )}</td>
          </tr>
        `
      )
      .join("");

    invoiceWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${getOrderNumber(
            order
          )}</title>

          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              color: #292a32;
            }

            h1 {
              margin-bottom: 5px;
            }

            .muted {
              color: #667085;
            }

            .box {
              border: 1px solid #ddd;
              border-radius: 10px;
              padding: 20px;
              margin-top: 20px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }

            th,
            td {
              padding: 12px;
              border-bottom: 1px solid #ddd;
              text-align: left;
            }

            .total {
              text-align: right;
              font-size: 20px;
              font-weight: bold;
              margin-top: 20px;
            }
          </style>
        </head>

        <body>

          <h1>PRINT EXPERT</h1>

          <div class="muted">
            Order ${getOrderNumber(order)}
          </div>

          <div class="box">
            <strong>Customer</strong>
            <p>
              ${address.name}<br/>
              ${address.address}<br/>
              ${address.city}
              ${address.state}
              ${address.pincode}<br/>
              ${address.country}<br/>
              ${address.phone}
            </p>
          </div>

          <div class="box">

            <strong>Ordered Items</strong>

            <table>

              <thead>
                <tr>
                  <th>Product</th>
                  <th>Size</th>
                  <th>Qty</th>
                  <th>Price</th>
                </tr>
              </thead>

              <tbody>
                ${itemRows}
              </tbody>

            </table>

          </div>

          <div class="box">

            <p>
              Product Price:
              ₹${formatPrice(
                summary.productPrice
              )}
            </p>

            <p>
              Customization:
              ₹${formatPrice(
                summary.customization
              )}
            </p>

            <p>
              Quantity:
              ${summary.quantity}
            </p>

            <div class="total">
              Total:
              ₹${formatPrice(
                summary.total
              )}
            </div>

          </div>

        </body>
      </html>
    `);

    invoiceWindow.document.close();
    invoiceWindow.focus();
    invoiceWindow.print();
  };

  /* ============================================================
     STATUS DATA
  ============================================================ */

  const statusData = useMemo(
    () => [
      {
        label: "Order Placed",
        icon: Package,
      },
      {
        label: "Confirmed",
        icon: CheckCircle,
      },
      {
        label: "Processing",
        icon: Clock3,
      },
      {
        label: "Shipped",
        icon: Truck,
      },
      {
        label: "Delivered",
        icon: CircleCheck,
      },
    ],
    []
  );

  /* ============================================================
     EMPTY
  ============================================================ */

  if (orders.length === 0) {
    return (
      <section className="my-orders-page">

        <div className="my-orders-empty">

          <div className="my-orders-empty-icon">
            <Package size={45} />
          </div>

          <h2>
            No Orders Yet
          </h2>

          <p>
            Aapke placed orders yahan
            दिखाई देंगे.
          </p>

        </div>

      </section>
    );
  }

  /* ============================================================
     RETURN
  ============================================================ */

  return (
    <section className="my-orders-page">

      {/* ========================================================
          PAGE HEADER
      ======================================================== */}

      <div className="my-orders-header">

        <div>
          <span>
            Shopping History
          </span>

          <h1>
            My Orders
          </h1>

          <p>
            View your order information
            and tracking status.
          </p>
        </div>

        <div className="orders-count">
          {orders.length}{" "}
          {orders.length === 1
            ? "Order"
            : "Orders"}
        </div>

      </div>

      {/* ========================================================
          ORDERS
      ======================================================== */}

      <div className="my-orders-list">

        {orders.map((order, orderIndex) => {

          const orderItems =
            getOrderItems(order);

          const firstItem =
            orderItems[0] || {};

          const orderKey =
            order?.id ||
            order?.orderId ||
            order?.orderNumber ||
            `order-${orderIndex}`;

          const isExpanded =
            Boolean(
              expandedOrders[orderKey]
            );

          const orderNumber =
            getOrderNumber(order);

          const orderDate =
            order?.placedAt ||
            order?.createdAt ||
            order?.date;

          const summary =
            getSummary(order);

          const address =
            getAddressParts(order);

          const currentStep =
            getStatusStep(
              order?.status
            );

          const isOrderCancellable =
            CANCELLABLE_STATUSES.has(
              String(order?.status || "")
                .toLowerCase()
            );

          const isOrderCancelled =
            String(order?.status || "")
              .toLowerCase() === "cancelled";

          const description =
            getCustomerDescription(
              order,
              firstItem
            );

          const note =
            getCustomerNote(
              order,
              firstItem
            );

          const customText =
            getCustomText(
              firstItem
            );

          const customized =
            isCustomized(
              order,
              firstItem
            );

          return (

            <article
              key={orderKey}
              className={
                `my-order-card ${
                  isExpanded
                    ? "my-order-card-expanded"
                    : ""
                }`
              }
            >

              {/* ==================================================
                  ORDER TOP BAR
              ================================================== */}

              <div
                className="my-order-card-header"
                onClick={() =>
                  toggleOrder(orderKey)
                }
              >

                <div>

                  <span className="my-order-small-label">
                    Order Number
                  </span>

                  <h2>
                    {orderNumber}
                  </h2>

                </div>

                <div className="my-order-header-right">

                  <span
                    className={
                      `order-status-badge ${
                        String(
                          order?.status ||
                            "Confirmed"
                        )
                          .toLowerCase()
                          .replace(
                            /\s+/g,
                            "-"
                          )
                      }`
                    }
                  >
                    {order?.status ||
                      "Confirmed"}
                  </span>

                  <div className="order-header-date">
                    Placed on{" "}
                    {formatDate(
                      orderDate
                    )}
                  </div>

                  <button
                    type="button"
                    className="order-expand-button"
                    onClick={(event) => {
                      event.stopPropagation();

                      toggleOrder(
                        orderKey
                      );
                    }}
                  >
                    {isExpanded ? (
                      <ChevronUp size={20} />
                    ) : (
                      <ChevronDown size={20} />
                    )}
                  </button>

                </div>

              </div>

              {/* ==================================================
                  COLLAPSED PREVIEW
              ================================================== */}

              {!isExpanded && (

                <div className="my-order-preview">

                  <div className="preview-product">

                    <div className="preview-image">

                      {firstItem?.image ||
                      firstItem?.img ||
                      firstItem?.productImage ||
                      firstItem?.thumbnail ? (

                        <img
                          src={
                            firstItem.image ||
                            firstItem.img ||
                            firstItem.productImage ||
                            firstItem.thumbnail
                          }
                          alt={
                            firstItem?.name ||
                            "Product"
                          }
                        />

                      ) : (
                        <Package size={35} />
                      )}

                    </div>

                    <div>

                      <h3>
                        {firstItem?.name ||
                          order?.name ||
                          "Product"}
                      </h3>

                      <p>
                        {firstItem?.color
                          ? `Color: ${firstItem.color}`
                          : ""}

                        {firstItem?.size
                          ? `  |  Size: ${firstItem.size}`
                          : ""}

                        {firstItem?.quantity
                          ? `  |  Qty: ${firstItem.quantity}`
                          : ""}
                      </p>

                      {customized && (
                        <span className="customized-label">
                          Customized Product
                        </span>
                      )}

                    </div>

                  </div>

                  <div className="preview-total">

                    <span>
                      Total
                    </span>

                    <strong>
                      ₹
                      {formatPrice(
                        summary.total
                      )}
                    </strong>

                  </div>

                  <button
                    type="button"
                    className="view-order-button"
                    onClick={() =>
                      toggleOrder(
                        orderKey
                      )
                    }
                  >
                    View Order Details
                    <ChevronDown size={17} />
                  </button>

                </div>

              )}

              {/* ==================================================
                  FULL ORDER DETAILS
              ================================================== */}

              {isExpanded && (

                <div className="my-order-details">

                  <div className="order-details-layout">

                    {/* =================================================
                        LEFT
                    ================================================= */}

                    <div className="order-details-main">

                      {/* =================================================
                          ORDERED ITEMS
                      ================================================= */}

                      <div className="order-section-box">

                        <div className="order-section-title">

                          <h3>
                            Ordered Items
                          </h3>

                        </div>

                        {orderItems.length === 0 ? (

                          <div className="no-items">
                            <Package size={35} />

                            <p>
                              Product details
                              available nahi hain.
                            </p>
                          </div>

                        ) : (

                          orderItems.map(
                            (item, index) => {

                              const itemDescription =
                                getCustomerDescription(
                                  order,
                                  item
                                );

                              const itemNote =
                                getCustomerNote(
                                  order,
                                  item
                                );

                              const itemCustomText =
                                getCustomText(
                                  item
                                );

                              const itemCustomized =
                                isCustomized(
                                  order,
                                  item
                                );

                              const itemImage =
                                item?.image ||
                                item?.img ||
                                item?.productImage ||
                                item?.thumbnail ||
                                "";

                              return (

                                <div
                                  key={
                                    `${orderKey}-item-${index}`
                                  }
                                  className="ordered-product"
                                >

                                  {/* PRODUCT IMAGE */}

                                  <div className="ordered-product-image">

                                    {itemImage ? (

                                      <img
                                        src={itemImage}
                                        alt={
                                          item?.name ||
                                          "Product"
                                        }
                                      />

                                    ) : (

                                      <div className="product-image-placeholder">
                                        <ImageIcon
                                          size={40}
                                        />
                                      </div>

                                    )}

                                  </div>

                                  {/* PRODUCT INFO */}

                                  <div className="ordered-product-info">

                                    <div className="ordered-product-top">

                                      <div>

                                        <h3>
                                          {item?.name ||
                                            "Custom Product"}
                                        </h3>

                                        <p className="product-meta">

                                          {item?.color && (
                                            <>
                                              Color:{" "}
                                              {item.color}
                                            </>
                                          )}

                                          {item?.size && (
                                            <>
                                              {" "}
                                              | Size:{" "}
                                              {item.size}
                                            </>
                                          )}

                                          {item?.quantity && (
                                            <>
                                              {" "}
                                              | Qty:{" "}
                                              {item.quantity}
                                            </>
                                          )}

                                        </p>

                                      </div>

                                      <strong className="item-price">
                                        ₹
                                        {formatPrice(
                                          item?.totalPrice ??
                                            item?.price ??
                                            0
                                        )}
                                      </strong>

                                    </div>

                                    {/* CUSTOM TEXT */}

                                    {itemCustomText && (

                                      <div className="custom-text-line">

                                        <span>
                                          Custom Text:
                                        </span>

                                        <strong>
                                          {
                                            itemCustomText
                                          }
                                        </strong>

                                      </div>

                                    )}

                                    {/* ====================================
                                        CUSTOMIZATION DETAILS
                                    ==================================== */}

                                    {itemCustomized && (

                                      <div className="customization-box">

                                        <div className="customization-box-title">

                                          <Palette
                                            size={17}
                                          />

                                          <strong>
                                            Customization
                                            Details
                                          </strong>

                                        </div>

                                        {/* FONT */}

                                        {item?.fontFamily && (

                                          <div className="custom-detail-row">

                                            <span>
                                              Text Font
                                            </span>

                                            <strong>
                                              {
                                                item.fontFamily
                                              }
                                            </strong>

                                          </div>

                                        )}

                                        {/* TEXT COLOR */}

                                        {item?.textColor && (

                                          <div className="custom-detail-row">

                                            <span>
                                              Text Color
                                            </span>

                                            <strong className="detail-color">

                                              <i
                                                style={{
                                                  background:
                                                    item.textColor,
                                                }}
                                              />

                                              {
                                                item.textColor
                                              }

                                            </strong>

                                          </div>

                                        )}

                                        {/* FONT SIZE */}

                                        {item?.fontSize && (

                                          <div className="custom-detail-row">

                                            <span>
                                              Font Size
                                            </span>

                                            <strong>
                                              {
                                                item.fontSize
                                              }px
                                            </strong>

                                          </div>

                                        )}

                                        {/* TEXT POSITION */}

                                        {item?.textPosition && (

                                          <div className="custom-detail-row">

                                            <span>
                                              Text Position
                                            </span>

                                            <strong>
                                              {item.textPosition?.label ||
                                                item.textPosition?.name ||
                                                "Custom Position"}
                                            </strong>

                                          </div>

                                        )}

                                        {/* LOGO */}

                                        {item?.logo && (

                                          <div className="custom-detail-row">

                                            <span>
                                              Logo
                                            </span>

                                            <strong>
                                              Added
                                            </strong>

                                          </div>

                                        )}

                                        {/* LOGO POSITION */}

                                        {item?.logoPosition && (

                                          <div className="custom-detail-row">

                                            <span>
                                              Logo Position
                                            </span>

                                            <strong>
                                              Custom Position
                                            </strong>

                                          </div>

                                        )}

                                        {/* PRODUCT COLOR */}

                                        {item?.color && (

                                          <div className="custom-detail-row">

                                            <span>
                                              Product Color
                                            </span>

                                            <strong className="detail-color">

                                              <i
                                                style={{
                                                  background:
                                                    item.color,
                                                }}
                                              />

                                              {
                                                item.color
                                              }

                                            </strong>

                                          </div>

                                        )}

                                        {/* PRINT SIDE */}

                                        {item?.side && (

                                          <div className="custom-detail-row">

                                            <span>
                                              Print Type
                                            </span>

                                            <strong>
                                              {item.side ===
                                              "back"
                                                ? "Back Side"
                                                : "Front Side"}
                                            </strong>

                                          </div>

                                        )}

                                        {/* DESCRIPTION */}

                                        {itemDescription && (

                                          <div className="custom-description-inside">

                                            <div className="custom-message-heading">

                                              <FileText
                                                size={17}
                                              />

                                              <strong>
                                                Product
                                                Description
                                              </strong>

                                            </div>

                                            <p>
                                              {
                                                itemDescription
                                              }
                                            </p>

                                          </div>

                                        )}

                                        {/* NOTE */}

                                        {itemNote && (

                                          <div className="custom-note-inside">

                                            <div className="custom-message-heading">

                                              <MessageSquare
                                                size={17}
                                              />

                                              <strong>
                                                Customer
                                                Instructions /
                                                Special Note
                                              </strong>

                                            </div>

                                            <p>
                                              {itemNote}
                                            </p>

                                          </div>

                                        )}

                                      </div>

                                    )}

                                  </div>

                                </div>
                              );
                            }
                          )
                        )}

                        {/* ==============================================
                            ORDER LEVEL DESCRIPTION
                        ============================================== */}

                        {description && (

                          <div className="order-level-description">

                            <div className="message-title">

                              <FileText
                                size={19}
                              />

                              <strong>
                                Product Description
                              </strong>

                            </div>

                            <p>
                              {description}
                            </p>

                          </div>

                        )}

                        {/* ==============================================
                            ORDER LEVEL NOTE
                        ============================================== */}

                        {note && (

                          <div className="order-level-note">

                            <div className="message-title">

                              <MessageSquare
                                size={19}
                              />

                              <strong>
                                Customer Instructions /
                                Special Note
                              </strong>

                            </div>

                            <p>
                              {note}
                            </p>

                          </div>

                        )}

                      </div>

                      {/* =================================================
                          ORDER STATUS
                      ================================================= */}

                      <div className="order-section-box status-box">

                        <h3>
                          Order Status
                        </h3>

                        <div className="status-timeline">

                          {statusData.map(
                            (
                              status,
                              index
                            ) => {

                              const Icon =
                                status.icon;

                              const active =
                                index <=
                                currentStep;

                              return (

                                <React.Fragment
                                  key={
                                    status.label
                                  }
                                >

                                  <div
                                    className={
                                      `status-step ${
                                        active
                                          ? "status-active"
                                          : ""
                                      }`
                                    }
                                  >

                                    <div className="status-icon">

                                      <Icon
                                        size={17}
                                      />

                                    </div>

                                    <strong>
                                      {
                                        status.label
                                      }
                                    </strong>

                                    <span>

                                      {index ===
                                        0 &&
                                        formatShortDate(
                                          orderDate
                                        )}

                                      {index ===
                                        0 && (
                                        <>
                                          <br />
                                          {formatTime(
                                            orderDate
                                          )}
                                        </>
                                      )}

                                      {index ===
                                        1 &&
                                        order?.confirmedAt &&
                                        formatShortDate(
                                          order.confirmedAt
                                        )}

                                      {index > 1 &&
                                        index >
                                          currentStep &&
                                        "-"}

                                    </span>

                                  </div>

                                  {index <
                                    statusData.length -
                                      1 && (

                                    <div
                                      className={
                                        `status-line ${
                                          index <
                                          currentStep
                                            ? "status-line-active"
                                            : ""
                                        }`
                                      }
                                    />

                                  )}

                                </React.Fragment>
                              );
                            }
                          )}

                        </div>

                      </div>

                    </div>

                    {/* =================================================
                        RIGHT SIDEBAR
                    ================================================= */}

                    <aside className="order-details-sidebar">

                      {/* =================================================
                          ORDER SUMMARY
                      ================================================= */}

                      <div className="sidebar-box">

                        <h3>
                          Order Summary
                        </h3>

                        <div className="summary-row">

                          <span>
                            Product Price
                          </span>

                          <strong>
                            ₹
                            {formatPrice(
                              summary.productPrice
                            )}
                          </strong>

                        </div>

                        <div className="summary-row">

                          <span>
                            Customization Charges
                          </span>

                          <strong>
                            ₹
                            {formatPrice(
                              summary.customization
                            )}
                          </strong>

                        </div>

                        <div className="summary-row">

                          <span>
                            Quantity
                          </span>

                          <strong>
                            {summary.quantity}
                          </strong>

                        </div>

                        <div className="summary-divider" />

                        <div className="summary-total">

                          <span>
                            Total Price
                          </span>

                          <strong>
                            ₹
                            {formatPrice(
                              summary.total
                            )}
                          </strong>

                        </div>

                      </div>

                      {/* =================================================
                          SHIPPING ADDRESS
                      ================================================= */}

                      <div className="sidebar-box">

                        <div className="sidebar-title-row">

                          <h3>
                            Shipping Address
                          </h3>

                          <button
                            type="button"
                            className="edit-address-btn"
                          >
                            <Edit3
                              size={15}
                            />

                            Edit
                          </button>

                        </div>

                        <div className="address-content">

                          <MapPin
                            size={18}
                          />

                          <div>

                            <strong>
                              {
                                address.name
                              }
                            </strong>

                            {address.address && (
                              <span>
                                {
                                  address.address
                                }
                              </span>
                            )}

                            {(address.city ||
                              address.state ||
                              address.pincode) && (

                              <span>
                                {address.city}

                                {address.city &&
                                  address.state
                                  ? ", "
                                  : ""}

                                {
                                  address.state
                                }

                                {address.pincode
                                  ? ` - ${address.pincode}`
                                  : ""}
                              </span>

                            )}

                            <span>
                              {
                                address.country
                              }
                            </span>

                            {address.phone && (

                              <span>
                                {
                                  address.phone
                                }
                              </span>

                            )}

                          </div>

                        </div>

                      </div>

                      {/* =================================================
                          PAYMENT
                      ================================================= */}

                      <div className="sidebar-box">

                        <h3>
                          Payment Information
                        </h3>

                        <div className="payment-row">

                          <span>
                            Method
                          </span>

                          <strong>
                            {order?.paymentMethod ||
                              "Cash on Delivery"}
                          </strong>

                        </div>

                        {order?.transactionId && (

                          <div className="payment-row">

                            <span>
                              Transaction ID
                            </span>

                            <strong>
                              {
                                order.transactionId
                              }
                            </strong>

                          </div>

                        )}

                        <div className="payment-row">

                          <span>
                            Payment Status
                          </span>

                          <strong
                            className={
                              `payment-status ${
                                String(
                                  order?.paymentStatus ||
                                    "Pending"
                                ).toLowerCase()
                              }`
                            }
                          >
                            {order?.paymentStatus ||
                              "Pending"}
                          </strong>

                        </div>

                        {order?.paidAt && (

                          <div className="payment-row">

                            <span>
                              Paid On
                            </span>

                            <strong>
                              {
                                formatDate(
                                  order.paidAt
                                )
                              }
                            </strong>

                          </div>

                        )}

                      </div>

                      {/* =================================================
                          INVOICE
                      ================================================= */}

                      <button
                        type="button"
                        className="invoice-button"
                        onClick={() =>
                          handleDownloadInvoice(
                            order
                          )
                        }
                      >

                        <Download
                          size={18}
                        />

                        Download Invoice

                      </button>

                      {/* =================================================
                          CANCEL ORDER — eligible statuses only;
                          ownership enforced server-side
                      ================================================= */}

                      {isOrderCancellable && (
                        <div className="cancel-order-box">
                          {cancelFor === orderKey ? (
                            <>
                              <div className="cancel-order-warning">
                                <strong>
                                  Cancel order{" "}
                                  {orderNumber}?
                                </strong>
                                <span>
                                  This action cannot be
                                  undone.
                                </span>
                              </div>

                              <textarea
                                placeholder="Reason for cancellation (optional)"
                                value={cancelReason}
                                onChange={(e) =>
                                  setCancelReason(
                                    e.target.value
                                  )
                                }
                                rows={2}
                                maxLength={500}
                                disabled={cancelling}
                              />

                              <button
                                type="button"
                                className="cancel-order-button confirm"
                                disabled={cancelling}
                                onClick={() =>
                                  handleCancelOrder(
                                    orderNumber
                                  )
                                }
                              >
                                {cancelling
                                  ? "Cancelling..."
                                  : "Confirm Cancellation"}
                              </button>

                              <button
                                type="button"
                                className="cancel-order-back"
                                disabled={cancelling}
                                onClick={() => {
                                  setCancelFor(null);
                                  setCancelReason("");
                                }}
                              >
                                Keep Order
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="cancel-order-button"
                              onClick={() =>
                                setCancelFor(orderKey)
                              }
                            >
                              Cancel Order
                            </button>
                          )}
                        </div>
                      )}

                      {isOrderCancelled && (
                        <div className="order-cancelled-note">
                          <strong>Cancelled</strong>
                          <span>
                            Cancelled On:{" "}
                            {order?.cancelledAt
                              ? formatDate(
                                  order.cancelledAt
                                )
                              : "Not available"}
                          </span>
                          {order?.cancelledBy && (
                            <span>
                              Cancelled By:{" "}
                              {order.cancelledBy ===
                              "admin"
                                ? "Admin"
                                : "Customer"}
                            </span>
                          )}
                          <span>
                            Reason:{" "}
                            {order?.cancelReason ||
                              "No reason provided"}
                          </span>
                          {order?.refundStatus && (
                            <span>
                              Refund:{" "}
                              {order.refundStatus} —
                              under review
                            </span>
                          )}
                        </div>
                      )}

                    </aside>

                  </div>

                  {/* ====================================================
                      HELP
                  ==================================================== */}

                  <div className="order-help-box">

                    <div className="help-icon">
                      <Headphones
                        size={25}
                      />
                    </div>

                    <div>

                      <strong>
                        Need Help?
                      </strong>

                      <p>
                        We're here to help you.
                        Contact our support team
                        for any assistance.
                      </p>

                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        alert(
                          "Support team se contact karne ke liye Contact page open karein."
                        );
                      }}
                    >
                      Contact Support
                    </button>

                  </div>

                  {/* ====================================================
                      TRACK BUTTON
                  ==================================================== */}

                  {typeof onTrack ===
                    "function" && (

                    <button
                      type="button"
                      className="track-order-button"
                      onClick={(event) =>
                        handleTrack(
                          order,
                          event
                        )
                      }
                    >
                      <Truck size={18} />

                      Track Order
                    </button>

                  )}

                </div>

              )}

            </article>
          );
        })}

      </div>

    </section>
  );
};

export default MyOrders;
