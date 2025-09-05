// Moodboard detail: fetch moodboard + its products; local scroll for product grid
import { apiClient } from "./apiClient.js";
import { formatCurrency } from "./utils.js";
import { getFavorites, toggleFavorite, updateFavBadge } from "./storage.js";

const params = new URLSearchParams(location.search);
const id = params.get("id");

const detailRoot = document.getElementById("moodboardDetail");
const productsRoot = document.getElementById("moodboardProducts");
const sentinel = document.getElementById("scrollSentinel");
const ariaLive = document.getElementById("ariaLive");

let allProducts = [];
let cursor = 0;
let windowSize = 20;
let loading = false;
let observer;

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

function paintNext() {
  if (loading) return;
  if (cursor >= allProducts.length) return;
  loading = true;

  const frag = document.createDocumentFragment();
  const slice = allProducts.slice(cursor, cursor + windowSize);
  cursor += slice.length;
  slice.forEach(p => {
    const div = document.createElement("div");
    div.innerHTML = renderProductCard(p);
    frag.appendChild(div.firstElementChild);
  });
  productsRoot.appendChild(frag);
  loading = false;

  if (ariaLive) ariaLive.textContent = `Showing ${cursor} of ${allProducts.length} products in moodboard.`;
}

function setupObserver() {
  observer = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) paintNext();
    });
  });
  observer.observe(sentinel);
}

productsRoot?.addEventListener("click", (e) => {
  const btn = e.target.closest(".card__fav");
  if (!btn) return;
  const card = btn.closest(".card");
  const id = card?.dataset.id;
  if (!id) return;
  const favs = toggleFavorite(id);
  btn.setAttribute("aria-pressed", String(favs.includes(id)));
  updateFavBadge(document.getElementById("favBadge"));
});

async function init() {
  if (!id) {
    detailRoot.innerHTML = `<p>Moodboard not found.</p>`;
    return;
  }
  try {
    const [mb, products] = await Promise.all([
      apiClient.getMoodboard(id),
      apiClient.getProductsForMoodboard(id),
    ]);
    if (!mb) {
      detailRoot.innerHTML = `<p>Moodboard not found.</p>`;
      return;
    }

    // Hero
    detailRoot.innerHTML = `
      <div class="moodboard-hero__media">
        <img loading="lazy" src="${mb.coverImage?.url || ""}" alt="${mb.coverImage?.alt || mb.title}" />
      </div>
      <div class="moodboard-hero__body">
        <h1>${mb.title}</h1>
        ${mb.tags?.length ? `<div class="card__tags">${mb.tags.map(t=>`<span class="tag">${t}</span>`).join("")}</div>` : ``}
        ${mb.description ? `<p>${mb.description}</p>` : ``}
      </div>
    `;

    // Products local scroll
    allProducts = Array.isArray(products) ? products : [];
    productsRoot.removeAttribute("data-skeletons");
    paintNext();
    setupObserver();
  } catch (err) {
    console.error(err);
    detailRoot.innerHTML = `<p>Couldn’t load moodboard.</p>`;
  }
}

init();
