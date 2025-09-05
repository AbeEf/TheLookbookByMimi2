// ========================================
// Local Storage Helpers
// - Favorites
// - Builder (future)
// ========================================

export function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem("favorites") || "[]");
  } catch {
    return [];
  }
}

export function setFavorites(arr) {
  localStorage.setItem("favorites", JSON.stringify(arr));
  window.dispatchEvent(new Event("storage")); // trigger sync manually
}

export function toggleFavorite(id) {
  const favs = getFavorites();
  const idx = favs.indexOf(id);
  if (idx >= 0) {
    favs.splice(idx, 1);
  } else {
    favs.push(id);
  }
  setFavorites(favs);
  return favs;
}

export function updateFavBadge(el) {
  if (!el) return;
  const favs = getFavorites();
  if (favs.length === 0) {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  el.textContent = favs.length > 9 ? "9+" : favs.length;
}

// Builder persistence (stub)
export function saveBuilderLayout(layout) {
  localStorage.setItem("builderLayout", JSON.stringify(layout));
}
export function loadBuilderLayout() {
  try {
    return JSON.parse(localStorage.getItem("builderLayout") || "null");
  } catch {
    return null;
  }
}