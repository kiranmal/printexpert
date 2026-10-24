import { API_URL } from "./apiConfig";
const inFlight = new Map();

const request = async (path, options = {}) => {
  const response = await fetch(`${API_URL}${path}`, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Product request failed.");
  }

  return data;
};

/* notify listening pages (Home/Category/Navbar) to
   refetch from the API — no catalog copy is stored */
const notifyProductsUpdated = () => {
  window.dispatchEvent(new Event("printExpertProductsUpdated"));
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

export const fetchProducts = (search = "", filters = {}) => {
  const searchTerm = String(search || "").trim();
  const category = String(filters.category || "").trim();
  const subcategory = String(filters.subcategory || "").trim();
  /* admin pages pass includeAll to also see inactive /
     out-of-stock products (requires admin token) */
  const includeAll = filters.includeAll === true;

  /* same query already in flight — avoid duplicate requests */
  const key = `${searchTerm}|${category}|${subcategory}|${includeAll}`;
  if (inFlight.has(key)) {
    return inFlight.get(key);
  }

  const promise = (async () => {
    const params = new URLSearchParams();
    if (searchTerm) params.set("search", searchTerm);
    if (category) params.set("category", category);
    if (subcategory) params.set("subcategory", subcategory);
    if (includeAll) params.set("includeAll", "1");
    const qs = params.toString();
    const path = `/products${qs ? `?${qs}` : ""}`;

    const token = includeAll
      ? localStorage.getItem("authToken")
      : null;
    const options = token
      ? { headers: { Authorization: `Bearer ${token}` } }
      : {};

    const data = await request(path, options);
    return Array.isArray(data.products) ? data.products : [];
  })();

  inFlight.set(key, promise);
  promise.finally(() => inFlight.delete(key));

  return promise;
};

export const fetchProductById = async (id) => {
  /* attach the token when present — admins can view
     inactive / out-of-stock products, customers cannot */
  const token = localStorage.getItem("authToken");
  const data = await request(
    `/products/${id}`,
    token ? { headers: { Authorization: `Bearer ${token}` } } : {}
  );
  return data.product;
};

/* purchasable on the customer-facing site only when
   active AND in stock */
export const isActiveProduct = (product) =>
  product?.status === "Active" &&
  Number(product?.stock) > 0;

/* lean selection payload for /customize — the full product
   (and never the catalog) must not hit localStorage; the
   editor re-hydrates the product via the API */
export const saveCustomizeSelection = (product, extras = {}) => {
  const smallImage = (src) =>
    typeof src === "string" && src.length < 200000 ? src : "";

  const lean = {
    id: product?.id ?? product?.productId ?? null,
    name: product?.name || "Custom Product",
    category: product?.category || "",
    subcategory: product?.subcategory || "",
    price: Number(product?.price || 0),
    image: smallImage(
      product?.image || product?.images?.[0]
    ),
    images: Array.isArray(product?.images)
      ? product.images
          .filter((i) => String(i).length < 5000)
          .slice(0, 6)
      : [],
    paperTypes: Array.isArray(product?.paperTypes)
      ? product.paperTypes
      : [],
    sizes: Array.isArray(product?.sizes) ? product.sizes : [],
    customizable: true,
    customizationType:
      product?.customizationType || product?.type || "",
    ...extras,
  };

  try {
    localStorage.setItem(
      "selectedCustomizeProduct",
      JSON.stringify(lean)
    );
  } catch {
    /* storage full — retry with bare minimum */
    try {
      const { images, ...rest } = lean;
      localStorage.setItem(
        "selectedCustomizeProduct",
        JSON.stringify(rest)
      );
    } catch {
      /* give up — editor will show its not-found state */
    }
  }

  return lean;
};

export const createProduct = async (product) => {
  const data = await request("/products", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(product),
  });
  notifyProductsUpdated();
  return data.product;
};

export const updateProduct = async (id, product) => {
  const data = await request(`/products/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(product),
  });
  notifyProductsUpdated();
  return data.product;
};

export const deleteProduct = async (id) => {
  await request(`/products/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  notifyProductsUpdated();
  return true;
};
