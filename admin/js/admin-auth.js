// ========================================
// Admin Auth (login, forgot, reset)
// ========================================

import { apiClient } from "../../js/apiClient.js";
import { showToast } from "./admin-ui.js";

// Tab switching
const tabs = document.querySelectorAll(".admin-auth-tabs [role=tab]");
const panels = document.querySelectorAll(".admin-auth-panel");
tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    tabs.forEach(t => t.setAttribute("aria-selected", "false"));
    panels.forEach(p => (p.hidden = true));
    tab.setAttribute("aria-selected", "true");
    const panel = document.getElementById(tab.getAttribute("aria-controls"));
    if (panel) panel.hidden = false;
  });
});

// Quick links inside forms
document.getElementById("toForgot")?.addEventListener("click", (e) => {
  e.preventDefault();
  document.getElementById("tabForgot").click();
});
document.getElementById("toLogin1")?.addEventListener("click", (e) => {
  e.preventDefault();
  document.getElementById("tabLogin").click();
});
document.getElementById("toLogin2")?.addEventListener("click", (e) => {
  e.preventDefault();
  document.getElementById("tabLogin").click();
});

// Login form
document.getElementById("loginForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;
  try {
    const result = await apiClient.login({ email, password });
    if (result?.token) {
      localStorage.setItem("token", result.token);
      location.href = "./index.html";
    } else {
      showToast("Login failed", "error");
    }
  } catch {
    showToast("Login error", "error");
  }
});

// Forgot form
document.getElementById("forgotForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("forgotEmail").value;
  try {
    await apiClient.resetPassword(email); // scaffold only
    showToast("If account exists, reset email sent", "success");
    document.getElementById("tabLogin").click();
  } catch {
    showToast("Error sending reset", "error");
  }
});

// Reset form
document.getElementById("resetForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("resetEmail").value;
  const pass = document.getElementById("resetPassword").value;
  const confirm = document.getElementById("resetConfirm").value;
  if (pass !== confirm) {
    showToast("Passwords do not match", "error");
    return;
  }
  try {
    await apiClient.resetPassword({ email, password: pass }); // stub
    showToast("Password reset successful", "success");
    document.getElementById("tabLogin").click();
  } catch {
    showToast("Error resetting password", "error");
  }
});