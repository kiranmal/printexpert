import { API_URL } from "./apiConfig";

const authHeaders = () => {
  const token = localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : null;
};

/* Upload one design file to the server.
   Returns { success, fileId, name, type, size, url } */
export const uploadDesignFile = async ({ name, type, dataUrl }) => {
  const headers = authHeaders();
  if (!headers) return { success: false, message: "Not logged in." };

  try {
    const res = await fetch(`${API_URL}/files`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ name, type, dataUrl }),
    });
    const data = await res.json().catch(() => ({}));
    return res.ok && data.success
      ? data
      : { success: false, message: data.message || `Upload failed (HTTP ${res.status}).` };
  } catch {
    return { success: false, message: "Upload service unreachable." };
  }
};

/* Fetch a stored file as a Blob (owner or admin). */
export const fetchFileBlob = async (fileId) => {
  const headers = authHeaders();
  if (!headers) return null;
  try {
    const res = await fetch(`${API_URL}/files/${fileId}`, { headers });
    return res.ok ? await res.blob() : null;
  } catch {
    return null;
  }
};

/* Open/download a stored file — fetches with auth, then
   hands the browser a blob URL it can actually open. */
export const openStoredFile = async (fileId, filename = "file") => {
  const blob = await fetchFileBlob(fileId);
  if (!blob) return false;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.target = "_blank";
  a.rel = "noreferrer";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return true;
};
