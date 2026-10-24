import { API_URL } from "./apiConfig";

const authHeaders = () => {
  const token = localStorage.getItem("authToken");
  return token
    ? {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      }
    : null;
};

/* GET /api/cart — authenticated user's cart with live product data */
export const fetchServerCart = async () => {
  const headers = authHeaders();
  if (!headers) return null;

  try {
    const res = await fetch(`${API_URL}/cart`, { headers });
    const data = await res.json().catch(() => ({}));
    return res.ok && data.success ? data.cart : null;
  } catch {
    return null;
  }
};

/* POST /api/cart — add or merge item */
export const addServerCartItem = async (item) => {
  const headers = authHeaders();
  if (!headers) return null;

  try {
    const res = await fetch(`${API_URL}/cart`, {
      method: "POST",
      headers,
      body: JSON.stringify(item),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data.message || "Failed to add item.", status: res.status };
    return data;
  } catch {
    return { error: "Network error. Please try again." };
  }
};

/* PUT /api/cart/:id — update quantity */
export const updateServerCartItem = async (cartItemId, quantity) => {
  const headers = authHeaders();
  if (!headers) return null;

  try {
    const res = await fetch(`${API_URL}/cart/${cartItemId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ quantity }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data.message || "Failed to update item.", status: res.status };
    return data;
  } catch {
    return { error: "Network error. Please try again." };
  }
};

/* DELETE /api/cart/:id — remove single item */
export const removeServerCartItem = async (cartItemId) => {
  const headers = authHeaders();
  if (!headers) return null;

  try {
    const res = await fetch(`${API_URL}/cart/${cartItemId}`, {
      method: "DELETE",
      headers,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data.message || "Failed to remove item.", status: res.status };
    return data;
  } catch {
    return { error: "Network error. Please try again." };
  }
};

/* POST /api/cart/merge — idempotent guest→server merge */
export const mergeServerCart = async (guestItems) => {
  const headers = authHeaders();
  if (!headers) return null;

  try {
    const items = guestItems.map((gi) => ({
      product_id: gi.productId || gi.originalProductId || gi.id,
      quantity: gi.quantity,
      paper_type: gi.paperType || gi.paper_type || null,
      size: gi.size || null,
      attributes: gi.attributes || null,
      item_type: gi.itemType || gi.item_type || "standard",
      customization: gi.customization || null,
      uploadedDesigns: Array.isArray(gi.uploadedDesigns)
        ? gi.uploadedDesigns.map((d) => ({
            name: d?.name,
            type: d?.type,
            size: d?.size,
            fileId: d?.fileId || null,
          }))
        : null,
      frontDesign: gi.frontDesign || null,
      backDesign: gi.backDesign || null,
      designs: gi.designs || null,
      text: gi.text || null,
      color: gi.color || null,
      personName: gi.personName || null,
      designation: gi.designation || null,
      companyName: gi.companyName || null,
    }));
    const res = await fetch(`${API_URL}/cart/merge`, {
      method: "POST",
      headers,
      body: JSON.stringify({ items }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data.message || "Failed to merge cart.", status: res.status };
    return data;
  } catch {
    return { error: "Network error during cart merge." };
  }
};

/* DELETE /api/cart — clear all items */
export const clearServerCart = async () => {
  const headers = authHeaders();
  if (!headers) return null;

  try {
    const res = await fetch(`${API_URL}/cart`, {
      method: "DELETE",
      headers,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data.message || "Failed to clear cart.", status: res.status };
    return data;
  } catch {
    return { error: "Network error. Please try again." };
  }
};
