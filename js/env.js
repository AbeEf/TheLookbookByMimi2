// ========================================
// Environment Configuration
// ========================================

// Change this for deployment
export const API_BASE_URL = "https://localhost:3000";

// Query flag to enable mock mode (?mock=1)
export const MOCK_MODE = true ||
  new URLSearchParams(window.location.search).get("mock") === "1";