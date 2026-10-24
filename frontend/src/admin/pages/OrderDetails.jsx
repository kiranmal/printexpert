import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import {
  ArrowLeft,
  Package,
  User,
  MapPin,
  CreditCard,
  Phone,
  Mail,
  CheckCircle2,
  Clock3,
  Truck,
  XCircle,
  Image as ImageIcon,
  Palette,
  Type,
} from "lucide-react";

import "./OrderDetails.css";

export default function OrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  /* =====================================================
     LOAD ORDER
  ===================================================== */

  const loadOrder = () => {
    try {
      const savedOrders =
        localStorage.getItem("printExpertOrders");

      const orders = savedOrders
        ? JSON.parse(savedOrders)
        : [];

      if (!Array.isArray(orders)) {
        setOrder(null);
        setLoading(false);
        return;
      }

      const foundOrder = orders.find(
        (item) =>
          String(item.id) === String(id) ||
          String(item.orderId) === String(id) ||
          String(item.orderNumber) === String(id)
      );

      setOrder(foundOrder || null);
    } catch (error) {
      console.error("Order loading error:", error);
      setOrder(null);
    }

    setLoading(false);
  };

  /* =====================================================
     INITIAL LOAD
  ===================================================== */

  useEffect(() => {
    loadOrder();

    const handleOrderUpdate = () => {
      loadOrder();
    };

    window.addEventListener(
      "printExpertOrdersUpdated",
      handleOrderUpdate
    );

    window.addEventListener(
      "printExpertOrderCreated",
      handleOrderUpdate
    );

    window.addEventListener(
      "orderUpdated",
      handleOrderUpdate
    );

    window.addEventListener(
      "storage",
      handleOrderUpdate
    );

    return () => {
      window.removeEventListener(
        "printExpertOrdersUpdated",
        handleOrderUpdate
      );

      window.removeEventListener(
        "printExpertOrderCreated",
        handleOrderUpdate
      );

      window.removeEventListener(
        "orderUpdated",
        handleOrderUpdate
      );

      window.removeEventListener(
        "storage",
        handleOrderUpdate
      );
    };
  }, [id]);

  /* =====================================================
     UPDATE ORDER STATUS
  ===================================================== */

  const updateOrderStatus = (newStatus) => {
    if (!order) return;

    try {
      const savedOrders =
        localStorage.getItem("printExpertOrders");

      const orders = savedOrders
        ? JSON.parse(savedOrders)
        : [];

      if (!Array.isArray(orders)) {
        return;
      }

      const updatedOrders = orders.map((item) => {
        const isSameOrder =
          String(item.id) === String(id) ||
          String(item.orderId) === String(id) ||
          String(item.orderNumber) === String(id);

        if (!isSameOrder) {
          return item;
        }

        return {
          ...item,

          status: newStatus,

          updatedAt:
            new Date().toISOString(),
        };
      });

      localStorage.setItem(
        "printExpertOrders",
        JSON.stringify(updatedOrders)
      );

      window.dispatchEvent(
        new Event("printExpertOrdersUpdated")
      );

      window.dispatchEvent(
        new Event("orderUpdated")
      );

      setOrder((previous) => ({
        ...previous,
        status: newStatus,
        updatedAt:
          new Date().toISOString(),
      }));
    } catch (error) {
      console.error(
        "Order status update error:",
        error
      );
    }
  };

  /* =====================================================
     HELPERS
  ===================================================== */

  const getStatusClass = (status) => {
    const value = String(
      status || "Processing"
    ).toLowerCase();

    if (value.includes("deliver")) {
      return "delivered";
    }

    if (value.includes("cancel")) {
      return "cancelled";
    }

    if (value.includes("ship")) {
      return "shipped";
    }

    return "processing";
  };

  const formatDate = (date) => {
    if (!date) {
      return "N/A";
    }

    try {
      return new Date(date).toLocaleString(
        "en-IN",
        {
          dateStyle: "medium",
          timeStyle: "short",
        }
      );
    } catch {
      return String(date);
    }
  };

  const formatPrice = (price) => {
    return Number(price || 0).toLocaleString(
      "en-IN"
    );
  };

  /* =====================================================
     GET PRODUCT IMAGE
  ===================================================== */

  const getItemImage = (item) => {
    if (!item) {
      return "";
    }

    return (
      item.image ||
      item.imageUrl ||
      item.productImage ||
      item.images?.[0] ||
      ""
    );
  };

  /* =====================================================
     GET ORDER ITEMS
     
     IMPORTANT:
     Current Cart order stores product directly:
     
     productName
     image
     price
     quantity
     total
     
     So we convert that into an items array.
  ===================================================== */

  const getOrderItems = (currentOrder) => {
    if (!currentOrder) {
      return [];
    }

    /* -----------------------------------------------
       FORMAT 1
       order.items[]
    ------------------------------------------------ */

    if (
      Array.isArray(
        currentOrder.items
      ) &&
      currentOrder.items.length > 0
    ) {
      return currentOrder.items;
    }

    /* -----------------------------------------------
       FORMAT 2
       order.cart[]
    ------------------------------------------------ */

    if (
      Array.isArray(
        currentOrder.cart
      ) &&
      currentOrder.cart.length > 0
    ) {
      return currentOrder.cart;
    }

    /* -----------------------------------------------
       FORMAT 3
       CURRENT CART handleOrderNow()
    ------------------------------------------------ */

    if (
      currentOrder.productName ||
      currentOrder.productId ||
      currentOrder.productImage ||
      currentOrder.image
    ) {
      return [
        {
          id:
            currentOrder.productId ||
            currentOrder.id,

          productId:
            currentOrder.productId,

          name:
            currentOrder.productName ||
            currentOrder.name ||
            "Product",

          image:
            currentOrder.image ||
            currentOrder.productImage ||
            currentOrder.images?.[0] ||
            "",

          images:
            currentOrder.images || [],

          price:
            Number(
              currentOrder.price
            ) || 0,

          quantity:
            Number(
              currentOrder.quantity
            ) || 1,

          total:
            Number(
              currentOrder.total
            ) ||
            (
              Number(
                currentOrder.price
              ) || 0
            ) *
              (
                Number(
                  currentOrder.quantity
                ) || 1
              ),

          size:
            currentOrder.size ||
            "Standard",

          category:
            currentOrder.category ||
            "Premium",

          paperType:
            currentOrder.paperType ||
            "",

          color:
            currentOrder.color ||
            "",

          isCustomized:
            currentOrder.customized ||
            false,

          customized:
            currentOrder.customized ||
            false,

          logo:
            currentOrder.logo ||
            null,

          text:
            currentOrder.text ||
            "",

          textColor:
            currentOrder.textColor ||
            "",

          fontFamily:
            currentOrder.fontFamily ||
            "",
        },
      ];
    }

    return [];
  };

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <div className="order-details-page">
        <div className="order-loading">

          <Package size={35} />

          <h3>
            Loading order...
          </h3>

          <p>
            Please wait while we load
            the order details.
          </p>

        </div>
      </div>
    );
  }

  /* =====================================================
     ORDER NOT FOUND
  ===================================================== */

  if (!order) {
    return (
      <div className="order-details-page">

        <div className="order-not-found">

          <div className="not-found-icon">
            <Package size={40} />
          </div>

          <h2>
            Order Not Found
          </h2>

          <p>
            Order #{id} could not be
            found in your order records.
          </p>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="back-order-btn"
          >
            <ArrowLeft size={18} />
            Back to Orders
          </button>

        </div>

      </div>
    );
  }

  /* =====================================================
     ORDER DATA
  ===================================================== */

  const items =
    getOrderItems(order);

  const customer =
    order.customer ||
    order.user ||
    {};

  const shipping =
    order.shippingAddress ||
    order.address ||
    {};

  const status =
    order.status ||
    "Processing";

  /* =====================================================
     SUBTOTAL
  ===================================================== */

  const calculatedSubtotal =
    items.reduce(
      (sum, item) => {
        const price =
          Number(item.price) || 0;

        const quantity =
          Number(item.quantity) || 1;

        const itemTotal =
          Number(item.total) ||
          price * quantity;

        return sum + itemTotal;
      },
      0
    );

  const subtotal =
    Number(
      order.subtotal ??
        order.totalPrice ??
        calculatedSubtotal
    ) || 0;

  /* =====================================================
     SHIPPING
  ===================================================== */

  const shippingCharge =
    Number(
      order.shipping ??
        order.shippingCharge ??
        0
    ) || 0;

  /* =====================================================
     DISCOUNT
  ===================================================== */

  const discount =
    Number(
      order.discount || 0
    ) || 0;

  /* =====================================================
     TOTAL
  ===================================================== */

  const total =
    Number(
      order.total ??
        order.grandTotal ??
        subtotal +
          shippingCharge -
          discount
    ) || 0;

  /* =====================================================
     CUSTOMER
  ===================================================== */

  const customerName =
    customer.name ||
    customer.fullName ||
    order.customerName ||
    "Guest Customer";

  const customerEmail =
    customer.email ||
    order.email ||
    "Not provided";

  const customerPhone =
    customer.phone ||
    customer.mobile ||
    order.phone ||
    "Not provided";

  /* =====================================================
     QUANTITY
  ===================================================== */

  const totalQuantity =
    items.reduce(
      (sum, item) =>
        sum +
        (
          Number(
            item.quantity
          ) || 1
        ),
      0
    );

  /* =====================================================
     ORDER DISPLAY ID
  ===================================================== */

  const displayOrderId =
    order.orderNumber ||
    order.orderId ||
    order.id;

  /* =====================================================
     RETURN
  ===================================================== */

  return (
    <div className="order-details-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="page-heading">

        <div className="heading-left">

          <button
            type="button"
            className="order-back-btn"
            onClick={() =>
              navigate(-1)
            }
          >
            <ArrowLeft size={18} />
          </button>

          <div>

            <div className="order-label">
              ORDER MANAGEMENT
            </div>

            <h2>
              Order #{displayOrderId}
            </h2>

            <p>
              Order details and
              fulfillment information
            </p>

          </div>

        </div>


        <div className="order-status-wrapper">

          <span
            className={`status ${getStatusClass(
              status
            )}`}
          >
            {status}
          </span>

        </div>

      </div>


      {/* =================================================
          STATUS ACTIONS
      ================================================= */}

      <div className="order-status-actions">

        <button
          type="button"
          className="status-btn processing-btn"
          onClick={() =>
            updateOrderStatus(
              "Processing"
            )
          }
        >
          <Clock3 size={17} />
          Processing
        </button>


        <button
          type="button"
          className="status-btn shipped-btn"
          onClick={() =>
            updateOrderStatus(
              "Shipped"
            )
          }
        >
          <Truck size={17} />
          Shipped
        </button>


        <button
          type="button"
          className="status-btn delivered-btn"
          onClick={() =>
            updateOrderStatus(
              "Delivered"
            )
          }
        >
          <CheckCircle2 size={17} />
          Delivered
        </button>


        <button
          type="button"
          className="status-btn cancelled-btn"
          onClick={() =>
            updateOrderStatus(
              "Cancelled"
            )
          }
        >
          <XCircle size={17} />
          Cancelled
        </button>

      </div>


      {/* =================================================
          ORDER INFO
      ================================================= */}

      <div className="order-meta-grid">

        <div className="order-meta-card">

          <span>
            Order Date
          </span>

          <strong>
            {formatDate(
              order.createdAt ||
                order.date
            )}
          </strong>

        </div>


        <div className="order-meta-card">

          <span>
            Payment
          </span>

          <strong>
            {order.paymentMethod ||
              order.payment ||
              "Cash / Online"}
          </strong>

        </div>


        <div className="order-meta-card">

          <span>
            Products
          </span>

          <strong>
            {items.length}
          </strong>

        </div>


        <div className="order-meta-card">

          <span>
            Total Quantity
          </span>

          <strong>
            {totalQuantity}
          </strong>

        </div>

      </div>


      {/* =================================================
          MAIN GRID
      ================================================= */}

      <div className="dashboard-grid order-grid">


        {/* =================================================
            ORDER ITEMS
        ================================================= */}

        <section className="panel order-items-panel">

          <div className="panel-title">

            <div>

              <span className="panel-icon">
                <Package size={18} />
              </span>

              <div>

                <h3>
                  Order Items
                </h3>

                <p>
                  Products included in
                  this order
                </p>

              </div>

            </div>

          </div>


          {items.length > 0 ? (

            <div className="order-items-list">

              {items.map(
                (item, index) => {

                  const quantity =
                    Number(
                      item.quantity
                    ) || 1;

                  const price =
                    Number(
                      item.price
                    ) || 0;

                  const itemTotal =
                    Number(
                      item.total
                    ) ||
                    price *
                      quantity;

                  const image =
                    getItemImage(
                      item
                    );

                  const customized =
                    Boolean(
                      item.isCustomized ||
                      item.customized ||
                      item.logo ||
                      item.text
                    );

                  return (

                    <div
                      className="order-item"
                      key={
                        item.id ||
                        item.productId ||
                        index
                      }
                    >

                      {/* =================================
                          PRODUCT IMAGE
                      ================================= */}

                      <div className="product-thumb">

                        {image ? (

                          <img
                            src={image}
                            alt={
                              item.name ||
                              item.productName ||
                              "Product"
                            }
                            onError={(event) => {
                              event.currentTarget.style.display =
                                "none";

                              const fallback =
                                event.currentTarget
                                  .parentElement
                                  ?.querySelector(
                                    ".product-image-fallback"
                                  );

                              if (
                                fallback
                              ) {
                                fallback.style.display =
                                  "flex";
                              }
                            }}
                          />

                        ) : null}


                        <div
                          className="product-image-fallback"
                          style={{
                            display:
                              image
                                ? "none"
                                : "flex",
                          }}
                        >
                          <Package
                            size={28}
                          />
                        </div>

                      </div>


                      {/* =================================
                          PRODUCT INFO
                      ================================= */}

                      <div className="order-item-info">

                        <strong>
                          {item.name ||
                            item.productName ||
                            "Product"}
                        </strong>


                        <p>

                          Category:{" "}

                          {item.category ||
                            item.paperType ||
                            "Premium"}

                        </p>


                        <p>

                          Size:{" "}

                          {item.size ||
                            "Standard"}

                          {" · "}

                          Qty:{" "}

                          {quantity}

                        </p>


                        {item.color && (

                          <p>

                            Color:{" "}

                            {item.color}

                          </p>

                        )}


                        {customized && (

                          <div className="customized-order-details">

                            <span className="customized-order-badge">

                              <Palette
                                size={13}
                              />

                              Customized

                            </span>


                            {item.logo && (

                              <span className="customized-detail">

                                <ImageIcon
                                  size={13}
                                />

                                Logo

                              </span>

                            )}


                            {item.text && (

                              <span className="customized-detail">

                                <Type
                                  size={13}
                                />

                                Text

                              </span>

                            )}

                          </div>

                        )}

                      </div>


                      {/* =================================
                          AMOUNT
                      ================================= */}

                      <div className="order-item-price">

                        <span>
                          ₹
                          {formatPrice(
                            price
                          )}{" "}
                          ×{" "}
                          {quantity}
                        </span>

                        <b>
                          ₹
                          {formatPrice(
                            itemTotal
                          )}
                        </b>

                      </div>

                    </div>

                  );
                }
              )}

            </div>

          ) : (

            <div className="no-order-items">

              <Package size={30} />

              <p>
                No products found
                in this order.
              </p>

            </div>

          )}


          {/* =================================================
              TOTALS
          ================================================= */}

          <div className="order-total-box">

            <div className="total-line">

              <span>
                Products
              </span>

              <b>
                {items.length}
              </b>

            </div>


            <div className="total-line">

              <span>
                Total Quantity
              </span>

              <b>
                {totalQuantity}
              </b>

            </div>


            <div className="total-line">

              <span>
                Subtotal
              </span>

              <b>
                ₹
                {formatPrice(
                  subtotal
                )}
              </b>

            </div>


            {discount > 0 && (

              <div className="total-line">

                <span>
                  Discount
                </span>

                <b className="discount-text">
                  -₹
                  {formatPrice(
                    discount
                  )}
                </b>

              </div>

            )}


            <div className="total-line">

              <span>
                Shipping
              </span>

              <b>
                {shippingCharge ===
                0
                  ? "FREE"
                  : `₹${formatPrice(
                      shippingCharge
                    )}`}
              </b>

            </div>


            <div className="total-line grand">

              <span>
                Total Amount
              </span>

              <b>
                ₹
                {formatPrice(
                  total
                )}
              </b>

            </div>

          </div>

        </section>


        {/* =================================================
            CUSTOMER
        ================================================= */}

        <section className="panel">

          <div className="panel-title">

            <div>

              <span className="panel-icon">
                <User size={18} />
              </span>

              <div>

                <h3>
                  Customer Information
                </h3>

                <p>
                  Customer and delivery
                  details
                </p>

              </div>

            </div>

          </div>


          <div className="info-list">


            {/* NAME */}

            <div className="info-row">

              <span>
                <User size={16} />
                Name
              </span>

              <strong>
                {customerName}
              </strong>

            </div>


            {/* EMAIL */}

            <div className="info-row">

              <span>
                <Mail size={16} />
                Email
              </span>

              <strong>
                {customerEmail}
              </strong>

            </div>


            {/* PHONE */}

            <div className="info-row">

              <span>
                <Phone size={16} />
                Phone
              </span>

              <strong>
                {customerPhone}
              </strong>

            </div>


            {/* ADDRESS */}

            <div className="info-row">

              <span>
                <MapPin size={16} />
                Address
              </span>

              <strong>

                {typeof shipping ===
                "string"
                  ? shipping
                  : shipping.address ||
                    (typeof order.address ===
                    "string"
                      ? order.address
                      : order.address?.address) ||
                    "Address not provided"}


                {typeof shipping !==
                  "string" &&
                  (shipping.city ||
                    shipping.state) && (
                    <>
                      <br />

                      {shipping.city ||
                        ""}

                      {shipping.city &&
                        shipping.state
                        ? ", "
                        : ""}

                      {shipping.state ||
                        ""}
                    </>
                  )}


                {typeof shipping !==
                  "string" &&
                  shipping.pincode && (
                    <>
                      <br />

                      PIN:{" "}
                      {
                        shipping.pincode
                      }
                    </>
                  )}

              </strong>

            </div>


            {/* PAYMENT */}

            <div className="info-row">

              <span>
                <CreditCard size={16} />
                Payment
              </span>

              <strong>

                {order.paymentMethod ||
                  order.payment ||
                  "Not provided"}

                {order.paymentStatus && (
                  <>
                    {" · "}
                    {
                      order.paymentStatus
                    }
                  </>
                )}

              </strong>

            </div>

          </div>

        </section>

      </div>


      {/* =================================================
          ORDER INFORMATION
      ================================================= */}

      <section className="panel order-information-panel">

        <div className="panel-title">

          <div>

            <span className="panel-icon">
              <Package size={18} />
            </span>

            <div>

              <h3>
                Order Information
              </h3>

              <p>
                Complete order
                information
              </p>

            </div>

          </div>

        </div>


        <div className="order-information-grid">

          <div>

            <span>
              Order ID
            </span>

            <strong>
              {displayOrderId}
            </strong>

          </div>


          <div>

            <span>
              Created
            </span>

            <strong>
              {formatDate(
                order.createdAt ||
                  order.date
              )}
            </strong>

          </div>


          <div>

            <span>
              Current Status
            </span>

            <strong
              className={`status-text ${getStatusClass(
                status
              )}`}
            >
              {status}
            </strong>

          </div>


          <div>

            <span>
              Products
            </span>

            <strong>
              {items.length}
            </strong>

          </div>


          <div>

            <span>
              Amount
            </span>

            <strong>
              ₹
              {formatPrice(
                total
              )}
            </strong>

          </div>


          {order.updatedAt && (

            <div>

              <span>
                Last Updated
              </span>

              <strong>
                {formatDate(
                  order.updatedAt
                )}
              </strong>

            </div>

          )}

        </div>

      </section>

    </div>
  );
}
