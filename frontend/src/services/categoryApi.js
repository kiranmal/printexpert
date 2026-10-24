import { API_URL } from "./apiConfig";
import defaultCategories from "../data/categories";

// API se categories fetch karta hai; fail hone pe static fallback use karta hai
export const fetchCategories = async () => {
  try {
    const res = await fetch(`${API_URL}/categories`);
    const data = await res.json().catch(() => ({}));

    if (res.ok && Array.isArray(data.categories) && data.categories.length > 0) {
      return data.categories;
    }
  } catch {
    // fall through to defaults
  }

  return defaultCategories;
};

const getAuthHeaders = () => {
  const token = localStorage.getItem("authToken");

  if (!token) {
    throw new Error("Administrator authentication is required.");
  }

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

export const createCategory = async (name, items = []) => {
  const res = await fetch(`${API_URL}/admin/categories`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ name, items }),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || "Unable to add category.");
  }

  return data.category;
};

export const updateCategory = async (id, name, items = []) => {
  const res = await fetch(`${API_URL}/admin/categories/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ name, items }),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || "Unable to update category.");
  }

  return data.category;
};

export const deleteCategory = async (id) => {
  const res = await fetch(`${API_URL}/admin/categories/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || "Unable to delete category.");
  }

  return data;
};


/* =====================================================
   SUBCATEGORIES
===================================================== */

export const fetchSubcategories = async (categoryId = null) => {
  const query = categoryId ? `?category_id=${encodeURIComponent(categoryId)}` : "";
  const res = await fetch(`${API_URL}/subcategories${query}`);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || "Unable to load subcategories.");
  }

  return Array.isArray(data.subcategories) ? data.subcategories : [];
};

export const createSubcategory = async (categoryId, name) => {
  const res = await fetch(`${API_URL}/admin/subcategories`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ category_id: categoryId, name }),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || "Unable to add subcategory.");
  }

  return data.subcategory;
};

export const updateSubcategory = async (id, payload = {}) => {
  const res = await fetch(`${API_URL}/admin/subcategories/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || "Unable to update subcategory.");
  }

  return data.subcategory;
};

export const deleteSubcategory = async (id) => {
  const res = await fetch(`${API_URL}/admin/subcategories/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || "Unable to delete subcategory.");
  }

  return data;
};

/* =====================================================
   TAGS
===================================================== */

export const fetchTags = async () => {
  const res = await fetch(`${API_URL}/tags`);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || "Unable to load tags.");
  }

  return Array.isArray(data.tags) ? data.tags : [];
};

export const createTag = async (name) => {
  const res = await fetch(`${API_URL}/admin/tags`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ name }),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || "Unable to add tag.");
  }

  return data.tag;
};

export const updateTag = async (id, payload = {}) => {
  const res = await fetch(`${API_URL}/admin/tags/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || "Unable to update tag.");
  }

  return data.tag;
};

export const deleteTag = async (id) => {
  const res = await fetch(`${API_URL}/admin/tags/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || "Unable to delete tag.");
  }

  return data;
};


/* =====================================================
   DYNAMIC ATTRIBUTES
===================================================== */

export const fetchAttributes = async (
  categoryId = null,
  subcategoryId = null
) => {
  const params = new URLSearchParams();
  if (categoryId) params.set("category_id", categoryId);
  if (subcategoryId) params.set("subcategory_id", subcategoryId);
  const qs = params.toString();

  const res = await fetch(
    `${API_URL}/attributes${qs ? `?${qs}` : ""}`
  );
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || "Unable to load attributes.");
  }

  return Array.isArray(data.attributes) ? data.attributes : [];
};

export const createAttribute = async (payload) => {
  const res = await fetch(`${API_URL}/admin/attributes`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || "Unable to add attribute.");
  }

  return data.attribute;
};

export const updateAttribute = async (id, payload = {}) => {
  const res = await fetch(`${API_URL}/admin/attributes/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || "Unable to update attribute.");
  }

  return data.attribute;
};

export const deleteAttribute = async (id) => {
  const res = await fetch(`${API_URL}/admin/attributes/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || "Unable to delete attribute.");
  }

  return data;
};

export const createAttributeValue = async (attributeId, value) => {
  const res = await fetch(
    `${API_URL}/admin/attributes/${attributeId}/values`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ value }),
    }
  );
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || "Unable to add value.");
  }

  return data.value;
};

export const updateAttributeValue = async (id, payload = {}) => {
  const res = await fetch(`${API_URL}/admin/attribute-values/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || "Unable to update value.");
  }

  return data.value;
};

export const deleteAttributeValue = async (id) => {
  const res = await fetch(`${API_URL}/admin/attribute-values/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || "Unable to delete value.");
  }

  return data;
};
