import React from "react";

const OrderCard = ({
  order = {},
  onTrack,
}) => {
  const items = Array.isArray(order?.items)
    ? order.items
    : Array.isArray(order?.products)
      ? order.products
      : order?.product
        ? [order.product]
        : [];

  const orderId =
    order?.orderNumber ||
    order?.orderId ||
    order?.id ||
    "N/A";

  const orderDate =
    order?.date ||
    order?.placedAt ||
    order?.createdAt ||
    "N/A";

  const total =
    Number(
      order?.totalPrice ??
      order?.total ??
      order?.subtotal ??
      0
    ) || 0;

  const status =
    order?.status ||
    "Confirmed";

  const statusClass =
    String(status)
      .toLowerCase()
      .replace(/\s+/g, "-");

  const formatPrice = (price) => {
    return (
      Number(price) || 0
    ).toLocaleString("en-IN");
  };

  const formatDate = (date) => {
    if (!date) {
      return "N/A";
    }

    try {
      const parsed =
        new Date(date);

      if (
        Number.isNaN(
          parsed.getTime()
        )
      ) {
        return String(date);
      }

      return parsed.toLocaleString(
        "en-IN",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      );
    } catch {
      return String(date);
    }
  };

  return (
    <div className="order-card">

      {/* ==================================================
          TOP
      ================================================== */}

      <div className="order-top">

        <div>
          <span>
            Order ID
          </span>

          <strong>
            {orderId}
          </strong>
        </div>

        <div>
          <span>
            Order Date
          </span>

          <strong>
            {formatDate(orderDate)}
          </strong>
        </div>

        <div>
          <span>
            Total
          </span>

          <strong>
            ₹{formatPrice(total)}
          </strong>
        </div>

      </div>

      {/* ==================================================
          PRODUCTS
      ================================================== */}

      <div className="order-products">

        {items.length === 0 ? (

          <div className="order-product-empty">
            <span>
              📦
            </span>

            <div>
              <strong>
                Order Item
              </strong>

              <p>
                Product information
                available in order details.
              </p>
            </div>
          </div>

        ) : (

          items.map(
            (item, index) => {

              const image =
                item?.image ||
                item?.img ||
                item?.productImage ||
                item?.thumbnail ||
                "";

              const name =
                item?.name ||
                item?.productName ||
                item?.title ||
                "Product";

              const quantity =
                Number(
                  item?.quantity
                ) || 1;

              const itemPrice =
                Number(
                  item?.totalPrice ??
                  item?.price ??
                  0
                ) || 0;

              return (

                <div
                  className="order-product"
                  key={
                    item?.id ||
                    item?.productId ||
                    `${name}-${index}`
                  }
                >

                  {/* IMAGE */}

                  {image ? (

                    <img
                      src={image}
                      alt={name}
                    />

                  ) : (

                    <div className="order-product-image-placeholder">
                      📦
                    </div>

                  )}

                  {/* INFO */}

                  <div className="order-product-info">

                    <h3>
                      {name}
                    </h3>

                    <p>
                      Quantity:{" "}
                      {quantity}
                    </p>

                    {item?.size && (
                      <p>
                        Size:{" "}
                        {item.size}
                      </p>
                    )}

                    {item?.color && (
                      <p>
                        Color:{" "}
                        {item.color}
                      </p>
                    )}

                    <strong>
                      ₹
                      {formatPrice(
                        itemPrice
                      )}
                    </strong>

                  </div>

                </div>

              );
            }
          )

        )}

      </div>

      {/* ==================================================
          BOTTOM
      ================================================== */}

      <div className="order-bottom">

        <div>

          <span className="status-label">
            Current Status
          </span>

          <strong
            className={`order-status ${statusClass}`}
          >
            {status}
          </strong>

        </div>

        <button
          type="button"
          className="track-order-btn"
          onClick={(event) => {

            event.stopPropagation();

            if (
              typeof onTrack ===
              "function"
            ) {
              onTrack(
                event,
                order
              );
            }

          }}
        >
          Track Order
        </button>

      </div>

    </div>
  );
};

export default OrderCard;
