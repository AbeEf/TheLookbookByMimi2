// ========================================
// Admin Guard
// Redirects to /admin/auth.html if no token
// Clears token on 401 (handled in http.js)
// ========================================

import { API_BASE_URL } from "../../js/env.js";

const token = localStorage.getItem("token");
if (!token) {
  if (!location.pathname.endsWith("/auth.html")) {
    location.href = "./auth.html";
  }
}

// Also listen for 401 events dispatched globally
window.addEventListener("unauthorized", () => {
  localStorage.removeItem("token");
  if (!location.pathname.endsWith("/auth.html")) {
    location.href = "./auth.html";
  }
});