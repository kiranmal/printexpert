// Centralized API configuration
// Uses VITE_API_URL env variable for production, falls back to localhost for development

export const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const API_BASE = API_URL.replace(/\/api$/, "");
