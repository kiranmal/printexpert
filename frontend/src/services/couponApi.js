import { API_URL } from "./apiConfig";

const authHeaders = () => {
  const token = localStorage.getItem("authToken");

  if (!token) {
    throw new Error("Administrator authentication is required.");
  }

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

export const fetchCoupons = async () => {
  const res = await fetch(`${API_URL}/admin/coupons`, {
    headers: authHeaders(),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || "Unable to load coupons.");
  }

  return data.coupons || [];
};

export const createCoupon = async (coupon) => {
  const res = await fetch(`${API_URL}/admin/coupons`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(coupon),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || "Unable to create coupon.");
  }

  return data.coupon;
};

export const updateCoupon = async (id, updates) => {
  const res = await fetch(`${API_URL}/admin/coupons/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(updates),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || "Unable to update coupon.");
  }

  return data;
};

export const deleteCoupon = async (id) => {
  const res = await fetch(`${API_URL}/admin/coupons/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || "Unable to delete coupon.");
  }

  return data;
};

/* Public — abhi live coupons (navbar offer bar) */
export const fetchActiveCoupons = async () => {
  try {
    const res = await fetch(`${API_URL}/coupons/active`);
    const data = await res.json().catch(() => ({}));
    return res.ok && Array.isArray(data.coupons)
      ? data.coupons
      : [];
  } catch {
    return [];
  }
};

/* Checkout — code validate + discount amount */
export const validateCoupon = async (code, total) => {
  try {
    const res = await fetch(`${API_URL}/coupons/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, total }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        success: false,
        message: data.message || "Invalid coupon.",
      };
    }

    return data;
  } catch {
    return {
      success: false,
      message: "Unable to verify coupon right now.",
    };
  }
};
