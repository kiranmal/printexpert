import { API_URL } from "./apiConfig";

const headers = () => ({
  Authorization: `Bearer ${localStorage.getItem(
    "authToken"
  )}`,
  "Content-Type": "application/json",
});

const request = async (path, options = {}) => {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: headers(),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Request failed.");
  }
  return data;
};

export const fetchAdminNotifications = () =>
  request("/admin/notifications");

export const markNotificationRead = (key) =>
  request("/admin/notifications/read", {
    method: "POST",
    body: JSON.stringify({ key }),
  });

export const markAllNotificationsRead = (keys) =>
  request("/admin/notifications/read-all", {
    method: "POST",
    body: JSON.stringify({ keys }),
  });

export const dismissNotification = (key) =>
  request("/admin/notifications/dismiss", {
    method: "POST",
    body: JSON.stringify({ key }),
  });

export const clearAllNotifications = (keys) =>
  request("/admin/notifications/clear", {
    method: "POST",
    body: JSON.stringify({ keys }),
  });
