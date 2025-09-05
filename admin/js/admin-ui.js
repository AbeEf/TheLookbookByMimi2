// ========================================
// Shared Admin UI Helpers
// - Tab switcher
// - Toast
// - Modal open/close
// - Bulk bar
// ========================================
export { debounce, formatCurrency } from "../../js/utils.js";

/* Toasts */
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

// Inject toast styles (lightweight, overrides utils.js toast if needed)
const style = document.createElement("style");
style.textContent = `
.toast {
  position: fixed;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  background: var(--color-surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: .5rem .75rem;
  box-shadow: var(--shadow);
  opacity: 0;
  transition: opacity .3s;
  z-index: 200;
}
.toast.visible { opacity: 1; }
.toast--error { border-color: #fecaca; background: #fee2e2; color: #991b1b; }
.toast--success { border-color: #bbf7d0; background: #dcfce7; color: #166534; }
`;
document.head.appendChild(style);

/* Tab switcher */
export function setupTabs() {
  const tabs = document.querySelectorAll("[role=tab]");
  const panels = document.querySelectorAll("[role=tabpanel]");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.setAttribute("aria-selected", "false"));
      panels.forEach(p => (p.hidden = true));
      tab.setAttribute("aria-selected", "true");
      const panel = document.getElementById(tab.getAttribute("aria-controls"));
      if (panel) panel.hidden = false;
    });
  });
}

/* Modal helpers */
export function openDialog(dialog) {
  if (!dialog) return;
  dialog.showModal();
}
export function closeDialog(dialog) {
  if (!dialog) return;
  dialog.close();
}

/* Bulk bar */
export function showBulkBar(count, onClear) {
  let bar = document.querySelector(".bulk-bar");
  if (!bar) {
    bar = document.createElement("div");
    bar.className = "bulk-bar";
    bar.innerHTML = `
      <span id="bulkCount"></span>
      <div class="bulk-actions"></div>
    `;
    document.body.appendChild(bar);
  }
  const countEl = bar.querySelector("#bulkCount");
  countEl.textContent = `${count} selected`;
  bar.classList.remove("hidden");
  if (onClear) {
    bar.querySelector("#bulkCount").onclick = onClear;
  }
}
export function hideBulkBar() {
  const bar = document.querySelector(".bulk-bar");
  if (bar) bar.classList.add("hidden");
}
