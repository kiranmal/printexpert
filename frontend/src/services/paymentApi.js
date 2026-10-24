import { API_URL } from "./apiConfig";

const authHeaders = () => {
  const token = localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : null;
};

/* server-side razorpay order — amount server-stored total se aata hai */
export const createRazorpayOrder = async (orderNumber) => {
  const headers = authHeaders();
  if (!headers) {
    return { success: false, message: "Please login to pay." };
  }

  try {
    const res = await fetch(
      `${API_URL}/payments/razorpay/order`,
      {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderNumber }),
      }
    );
    return await res.json().catch(() => ({
      success: false,
      message: "Payment service unavailable.",
    }));
  } catch {
    return {
      success: false,
      message: "Payment service unreachable.",
    };
  }
};

/* razorpay response -> server signature verify */
export const verifyRazorpayPayment = async (
  orderNumber,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature
) => {
  const headers = authHeaders();
  if (!headers) {
    return { success: false, message: "Please login." };
  }

  try {
    const res = await fetch(
      `${API_URL}/payments/razorpay/verify`,
      {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderNumber,
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: razorpayPaymentId,
          razorpay_signature: razorpaySignature,
        }),
      }
    );
    return await res.json().catch(() => ({
      success: false,
      message: "Verification failed.",
    }));
  } catch {
    return {
      success: false,
      message: "Verification service unreachable.",
    };
  }
};

/* razorpay checkout.js script load (idempotent) */
export const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src =
      "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
