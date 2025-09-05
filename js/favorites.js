// Favorites page: read localStorage IDs -> fetch details -> render; local-only list
import { apiClient } from "./apiClient.js";
import { getFavorites, toggleFavorite, updateFavBadge } from "./storage.js";
import { formatCurrency } from "./utils.js";

const root = document.getElementById("favoritesList");
const emptyEl = document.getElementById("emptyFavorites");

function renderProductCard(p) {
  const favs = getFavorites();
  const pressed = favs.includes(p.id);
  return `
  <article class="card card--list" data-type="product" data-id="${p.id}">
    <button class="card__fav" aria-pressed="${pressed}" aria-label="${pressed ? "Remove from favorites" : "Add to favorites"}">❤</button>
    <div class="card__media" style="aspect-ratio:1/1">
      <img loading="lazy" src="${(p.images && p.images[0]?.url) || ""}" alt="${(p.images && p.images[0]?.alt) || p.name}" />
    </div>
    <div class="card__body">
      <h3 class="card__title">${p.name}</h3>
      ${p.brand ? `<div class="card__meta"><span class="meta__brand">${p.brand}</span></div>` : ``}
      <div class="price">
        ${p.price != null ? `<span class="price__now">${formatCurrency(Number(p.price))}</span>` : ``}
        ${p.originalPrice != null ? `<span class="price__was">${formatCurrency(Number(p.originalPrice))}</span>` : ``}
      </div>
      <a class="button button--ghost" href="product.html?id=${encodeURIComponent(p.id)}">View</a>
    </div>
  </article>`;
}

root.addEventListener("click", (e) => {
  const btn = e.target.closest(".card__fav");
  if (!btn) return;
  const card = btn.closest(".card");
  const id = card?.dataset.id;
  if (!id) return;
  const favs = toggleFavorite(id);
  btn.setAttribute("aria-pressed", String(favs.includes(id)));
  updateFavBadge(document.getElementById("favBadge"));
  // Remove card if unfavorited
  if (!favs.includes(id)) {
    card.remove();
    if (root.children.length === 0) {
      emptyEl?.classList.remove("hidden");
    }
  }
});

async function init() {
  const favIds = getFavorites();
  if (!favIds.length) {
    emptyEl?.classList.remove("hidden");
    return;
  }
  try {
    // Simple approach: fetch all products and filter locally (works for mock + typical public APIs)
    const all = await apiClient.getProducts();
    const items = all.filter(p => favIds.includes(p.id));
    root.innerHTML = items.map(renderProductCard).join("");
    if (items.length === 0) {
      emptyEl?.classList.remove("hidden");
    }
  } catch (err) {
    console.error(err);
    root.innerHTML = `<p>Couldn’t load favorites. Please try again.</p>`;
  }
}

init();
