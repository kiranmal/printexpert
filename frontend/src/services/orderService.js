/* Real local orders only — checkout ka printExpertOrders mirror.
   Demo/seed orders nahi — DB (/api/orders) hi source of truth hai. */

const STORAGE_KEY = "printExpertOrders";

export const getOrders = () => {
  try {
    const savedOrders = localStorage.getItem(STORAGE_KEY);
    const parsedOrders = savedOrders ? JSON.parse(savedOrders) : [];
    return Array.isArray(parsedOrders) ? parsedOrders : [];
  } catch {
    return [];
  }
};

export const getOrderById = (orderId) => {
  const normalizedId = String(orderId || "").trim().toLowerCase();

  if (!normalizedId) {
    return undefined;
  }

  return getOrders().find((order) => {
    const id = order?.orderNumber || order?.orderId || order?.id;
    return String(id || "").trim().toLowerCase() === normalizedId;
  });
};

export const saveOrder = (order) => {
  const updatedOrders = [order, ...getOrders()];

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedOrders));

  return updatedOrders;
};
