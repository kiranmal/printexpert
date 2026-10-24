import { API_URL } from "./apiConfig";

const request = async (path, options = {}) => {
  const response = await fetch(`${API_URL}${path}`, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Request failed.");
  }

  return data;
};

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("authToken")}`,
});

/* public — customer inquiry submit */
export const submitInquiry = (payload) =>
  request("/contact-inquiries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

/* admin */
export const fetchInquiries = async ({ status, q, sort } = {}) => {
  const params = new URLSearchParams();
  if (status && status !== "All") params.set("status", status);
  if (q) params.set("q", q);
  if (sort) params.set("sort", sort);

  const data = await request(
    `/contact-inquiries?${params.toString()}`,
    { headers: authHeaders() }
  );

  return {
    inquiries: Array.isArray(data.inquiries) ? data.inquiries : [],
    counts: data.counts || {},
  };
};

export const fetchNewInquiryCount = async () => {
  const { counts } = await fetchInquiries();
  return Number(counts?.new || 0);
};

export const updateInquiry = (id, payload) =>
  request(`/contact-inquiries/${id}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

export const deleteInquiry = (id) =>
  request(`/contact-inquiries/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });

/* ---------- inquiry context (product/customizer → form) ---------- */

const CONTEXT_KEY = "printExpertInquiryContext";

export const saveInquiryContext = (ctx) => {
  try {
    localStorage.setItem(CONTEXT_KEY, JSON.stringify(ctx));
  } catch {
    /* ignore */
  }
};

export const readInquiryContext = () => {
  try {
    return JSON.parse(localStorage.getItem(CONTEXT_KEY) || "null");
  } catch {
    return null;
  }
};
