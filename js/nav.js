// ========================================
// Navigation & Header behavior (Updated)
// - Mobile drawer toggle (left sheet)
// - Focus trap + return focus
// - Sticky header shadow
// - Favorites badge sync
// - Background scroll lock
// ========================================

import { updateFavBadge } from "./storage.js";

const header = document.querySelector(".app-header");
const hamburger = document.getElementById("hamburger");
const drawer = document.getElementById("drawer");
const backdrop = document.getElementById("drawerBackdrop");
const favBadge = document.getElementById("favBadge");
const main = document.querySelector("main");

let lastFocused = null;
let trapCleanup = null;

// Sticky header shadow on scroll
window.addEventListener("scroll", () => {
  if (window.scrollY > 2) header?.classList.add("scrolled");
  else header?.classList.remove("scrolled");
});

// Helpers
function getFocusable(container) {
  return Array.from(
    container.querySelectorAll(
      'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
  ).filter(el => el.offsetParent !== null || el === document.activeElement);
}

function setAriaHidden(el, hidden) {
  if (!el) return;
  el.setAttribute("aria-hidden", hidden ? "true" : "false");
}

function openDrawer() {
  if (!drawer || !backdrop) return;
  lastFocused = document.activeElement;

  drawer.hidden = false;
  backdrop.hidden = false;
  requestAnimationFrame(() => {
    drawer.classList.add("open");
    backdrop.classList.add("open");
  });

  document.body.classList.add("drawer-open");
  hamburger?.setAttribute("aria-expanded", "true");

  // Inert background (lightweight: aria-hidden)
  setAriaHidden(main, true);

  // Focus trap
  const focusables = getFocusable(drawer);
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  first?.focus();

  function handleKeydown(e) {
    if (e.key === "Escape") { e.preventDefault(); closeDrawer(); return; }
    if (e.key !== "Tab") return;
    if (focusables.length === 0) return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  }

  drawer.addEventListener("keydown", handleKeydown);
  trapCleanup = () => drawer.removeEventListener("keydown", handleKeydown);
}

function closeDrawer() {
  if (!drawer || !backdrop) return;
  drawer.classList.remove("open");
  backdrop.classList.remove("open");
  hamburger?.setAttribute("aria-expanded", "false");
  document.body.classList.remove("drawer-open");

  setAriaHidden(main, false);
  trapCleanup?.();

  setTimeout(() => {
    drawer.hidden = true;
    backdrop.hidden = true;
    // return focus to trigger for a11y
    if (lastFocused && typeof lastFocused.focus === "function") {
      lastFocused.focus();
    } else {
      hamburger?.focus();
    }
  }, 250);
}

// Toggle handlers
hamburger?.addEventListener("click", () => {
  if (drawer?.classList.contains("open")) closeDrawer();
  else openDrawer();
});

hamburger?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); hamburger.click(); }
});

backdrop?.addEventListener("click", closeDrawer);

// Close when a drawer link is activated (better UX)
drawer?.addEventListener("click", (e) => {
  const link = e.target.closest("a[href]");
  if (link) closeDrawer();
});

// Escape close (global fallback)
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && drawer?.classList.contains("open")) closeDrawer();
});

// Favorites badge init + cross-tab sync
updateFavBadge(favBadge);
window.addEventListener("storage", () => updateFavBadge(favBadge));

