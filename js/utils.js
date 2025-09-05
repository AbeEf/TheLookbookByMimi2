// ========================================
// Utilities
// - debounce
// - currency format
// - toast messages
// ========================================

/**
 * Debounce a function call.
 * @param {Function} fn - The function to debounce
 * @param {number} delay - Delay in ms (default 300)
 * @returns {Function}
 */
export function debounce(fn, delay = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Format number as USD currency.
 * @param {number} value
 * @returns {string}
 */
export function formatCurrency(value) {
  if (value == null || isNaN(value)) return "";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Show a lightweight toast message.
 * @param {string} msg
 * @param {"info"|"error"|"success"} type
 */
export function showToast(msg, type = "info") {
  let el = document.createElement("div");
  el.className = `toast toast--${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add("visible"));
  setTimeout(() => {
    el.classList.remove("visible");
    setTimeout(() => el.remove(), 300);
  }, 3000);
}

// ---- Toast styles injected once ----
if (!document.getElementById("utils-toast-style")) {
  const style = document.createElement("style");
  style.id = "utils-toast-style";
  style.textContent = `
    .toast {
      position: fixed;
      bottom: 1rem; left: 50%;
      transform: translateX(-50%);
      background: var(--color-surface, #fff);
      color: var(--color-text, #111);
      border: 1px solid var(--border, #ddd);
      border-radius: 10px;
      padding: .5rem .75rem;
      box-shadow: var(--shadow, 0 6px 18px rgba(0,0,0,.08));
      opacity: 0;
      transition: opacity .3s;
      z-index: 200;
      font-size: .9rem;
    }
    .toast.visible { opacity: 1; }
    .toast--error { border-color: #fecaca; background: #fee2e2; color: #991b1b; }
    .toast--success { border-color: #bbf7d0; background: #dcfce7; color: #166534; }
  `;
  document.head.appendChild(style);
}