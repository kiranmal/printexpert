import { API_URL } from "./apiConfig";

const request = async (path, options = {}) => {
  const response = await fetch(`${API_URL}${path}`, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Template request failed.");
  }

  return data;
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

/* PUBLIC — active templates of ONE product (customer side) */
export const fetchProductTemplates = async (productId) => {
  const data = await request(`/products/${productId}/templates`);
  return Array.isArray(data.templates) ? data.templates : [];
};

/* ADMIN — all templates including inactive */
export const fetchAdminProductTemplates = async (productId) => {
  const data = await request(`/products/${productId}/templates`, {
    headers: getAuthHeaders(),
  });
  return Array.isArray(data.templates) ? data.templates : [];
};

export const createProductTemplate = async (productId, template) => {
  const data = await request(`/products/${productId}/templates`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(template),
  });
  return data.template;
};

export const updateProductTemplate = async (
  productId,
  templateId,
  template
) => {
  const data = await request(
    `/products/${productId}/templates/${templateId}`,
    {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(template),
    }
  );
  return data.template;
};

/* ADMIN — grouped list: every product with its templates */
export const fetchAllTemplatesGrouped = async () => {
  const data = await request(`/admin/templates`, {
    headers: getAuthHeaders(),
  });
  return Array.isArray(data.groups) ? data.groups : [];
};

export const deleteProductTemplate = async (productId, templateId) => {
  await request(
    `/products/${productId}/templates/${templateId}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(),
    }
  );
};
