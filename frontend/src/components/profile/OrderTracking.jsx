import React, { useState } from "react";

const getOrderItems = (order) => {
  if (Array.isArray(order?.items) && order.items.length) {
    return order.items;
  }
  if (Array.isArray(order?.products) && order.products.length) {
    return order.products;
  }
  if (Array.isArray(order?.cart) && order.cart.length) {
    return order.cart;
  }
  return [];
};

const getOrderId = (order, index) =>
  order?.orderNumber ||
  order?.orderId ||
  order?.id ||
  `order-${index}`;

const getCompletedStep = (order) => {
  const status = String(
    order?.status || "Order Placed"
  ).toLowerCase();

  if (
    status.includes("delivered") ||
    status.includes("deliver")
  ) {
    return 4;
  }
  if (
    status.includes("out for delivery")
  ) {
    return 3;
  }
  if (status.includes("ship")) {
    return 2;
  }
  if (
    status.includes("process") ||
    status.includes("confirm")
  ) {
    return 1;
  }
  return 0;
};

const isStepCompleted = (order, step, index) => {
  if (
    order?.tracking &&
    step.key in order.tracking
  ) {
    return Boolean(order.tracking[step.key]);
  }

  return index <= getCompletedStep(order);
};

const OrderTracking = ({ order, orders = [] }) => {
  const [pickedId, setPickedId] = useState(null);

  const list = Array.isArray(orders)
    ? orders
    : [];

  const active =
    (pickedId
      ? list.find(
          (o, i) => getOrderId(o, i) === pickedId
        )
      : null) ||
    order ||
    list[0] ||
    null;

  if (!active) {
    return (
      <div className="profile-card">
        <h2>No orders to track</h2>
        <p
          style={{
            color: "#6b7280",
            marginTop: "8px",
          }}
        >
          Jab aap order place karoge, uska
          status yahan dikhega.
        </p>
      </div>
    );
  }

  const steps = [
    {
      key: "ordered",
      title: "Order Placed",
      icon: "✓",
    },
    {
      key: "processing",
      title: "Processing",
      icon: "⚙",
    },
    {
      key: "shipped",
      title: "Shipped",
      icon: "📦",
    },
    {
      key: "outForDelivery",
      title: "Out for Delivery",
      icon: "🚚",
    },
    {
      key: "delivered",
      title: "Delivered",
      icon: "✓",
    },
  ];

  const items = getOrderItems(active);
  const firstItem = items[0] || {};
  const activeId = getOrderId(active, 0);

  const total =
    Number(active?.totalPrice) ||
    Number(active?.total) ||
    Number(active?.grandTotal) ||
    0;

  return (
    <div>
      {/* Order selector — multiple orders hone pe */}
      {list.length > 1 && (
        <div
          className="profile-card"
          style={{ marginBottom: "16px" }}
        >
          <h2
            style={{
              fontSize: "16px",
              marginBottom: "12px",
            }}
          >
            Your Orders
          </h2>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            {list.map((o, i) => {
              const id = getOrderId(o, i);
              const isActive =
                getOrderId(active, 0) === id;

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() =>
                    setPickedId(id)
                  }
                  style={{
                    padding: "8px 14px",
                    borderRadius: "10px",
                    border: isActive
                      ? "1px solid #bd1265"
                      : "1px solid #e5e7eb",
                    background: isActive
                      ? "#fef0f7"
                      : "#fff",
                    color: isActive
                      ? "#bd1265"
                      : "#374151",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {id}
                  <span
                    style={{
                      marginLeft: "8px",
                      fontWeight: 500,
                      color: isActive
                        ? "#bd1265"
                        : "#9ca3af",
                    }}
                  >
                    {o?.status ||
                      "Order Placed"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="profile-card tracking-card">

        <div className="tracking-header">

          <div>
            <p>Order Tracking</p>

            <h2>
              {activeId}
            </h2>
          </div>

          <div className="tracking-status">
            {active.status || "Order Placed"}
          </div>

        </div>

        {firstItem?.name && (
          <div className="tracking-product">

            {firstItem?.image && (
              <img
                src={firstItem.image}
                alt={firstItem.name}
              />
            )}

            <div>

              <h3>
                {firstItem.name}
                {items.length > 1 &&
                  ` +${items.length - 1} more`}
              </h3>

              <p>
                {active.deliveryDate
                  ? `Expected delivery: ${active.deliveryDate}`
                  : "Delivery date will be updated soon"}
              </p>

            </div>

          </div>
        )}

        {total > 0 && (
          <p
            style={{
              marginTop: "4px",
              color: "#6b7280",
              fontSize: "14px",
            }}
          >
            Order Total:{" "}
            <strong
              style={{ color: "#191a1f" }}
            >
              ₹{total.toLocaleString("en-IN")}
            </strong>
          </p>
        )}

        <div className="tracking-timeline">

          {steps.map((step, index) => {

            const completed =
              isStepCompleted(
                active,
                step,
                index
              );

            return (
              <div
                className={`tracking-step ${
                  completed ? "completed" : ""
                }`}
                key={step.key}
              >

                <div className="tracking-dot">
                  {completed
                    ? step.icon
                    : index + 1}
                </div>

                <div className="tracking-step-content">

                  <strong>
                    {step.title}
                  </strong>

                  <span>
                    {completed
                      ? "Completed"
                      : "Pending"}
                  </span>

                </div>

              </div>
            );
          })}

        </div>

      </div>
    </div>
  );
};

export default OrderTracking;
