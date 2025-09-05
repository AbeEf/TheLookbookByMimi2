// ========================================
// HTTP Wrapper
// Adds Authorization if token present,
// handles JSON parsing & 401 errors
// ========================================

export async function httpRequest(path, options = {}) {
  const headers = options.headers || {};
  const token = localStorage.getItem("token");

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  headers["Content-Type"] = "application/json";

  try {
    const res = await fetch(path, { ...options, headers });

    if (res.status === 401) {
      localStorage.removeItem("token");
      throw new Error("Unauthorized – token cleared");
    }

    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }

    if (res.status === 204) return null; // No content
    return await res.json();
  } catch (err) {
    console.error("HTTP error", err);
    throw err;
  }
}