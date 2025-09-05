// Products list page: single fetch → local-only infinite scroll; client-side search/filters
import { apiClient } from "./apiClient.js";
import { debounce, formatCurrency } from "./utils.js";
import { getFavorites, toggleFavorite, updateFavBadge } from "./storage.js";

const root = document.getElementById("productsList");
const ariaLive = document.getElementById("ariaLive");
const sentinel = document.getElementById("scrollSentinel");

const searchEl = document.getElementById("searchProducts");
const brandEl = document.getElementById("filterBrand");
const tagEl = document.getElementById("filterTag");
const minEl = document.getElementById("filterPriceMin");
const maxEl = document.getElementById("filterPriceMax");
const gridBtn = document.getElementById("gridView");
const listBtn = document.getElementById("listView");

let all = [];
let filtered = [];
let windowSize = 20;
let cursor = 0;
let observer;
let loading = false;

// Render helpers
function renderProductCard(p) {
  const favs = getFavorites();
  const pressed = favs.includes(p.id);
  return `
  <article class="card card--list" data-type="product" data-id="${p.id}">
    <button class="card__fav" aria-pressed="${pressed}" aria-label="${pressed ? "Remove from favorites" : "Add to favorites"}">❤</button>
    <div class="card__media" style="aspect-ratio:1/1">
      <img loading="lazy" src="${(p.images && p.images[0]?.url) || ""}" alt="${(p.images && p.images[0]?.alt) || p.name}" />
      <div class="card__badges">
        ${Array.isArray(p.badges) ? p.badges.map(b => {
          const cls = b.toLowerCase() === "sale" ? "chip--sale" :
                      b.toLowerCase() === "new" ? "chip--new" :
                      b.toLowerCase() === "featured" ? "chip--featured" :
                      b.toLowerCase() === "trending" ? "chip--trending" : "";
          const label = b.toLowerCase() === "trending" ? "🔥 Trending" : b;
          return `<span class="chip ${cls}">${label}</span>`;
        }).join("") : ""}
      </div>
    </div>
    <div class="card__body">
      <h3 class="card__title">${p.name}</h3>
      ${p.brand ? `<div class="card__meta"><span class="meta__brand">${p.brand}</span></div>` : ``}
      ${p.tags?.length ? `<div class="card__tags">${p.tags.map(t=>`<span class="tag">${t}</span>`).join("")}</div>` : ``}
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
  if (cursor >= filtered.length) return;
  loading = true;

  const frag = document.createDocumentFragment();
  const slice = filtered.slice(cursor, cursor + windowSize);
  cursor += slice.length;

  slice.forEach(p => {
    const div = document.createElement("div");
    div.innerHTML = renderProductCard(p);
    frag.appendChild(div.firstElementChild);
  });
  root.appendChild(frag);
  loading = false;

  if (ariaLive) ariaLive.textContent = `Showing ${cursor} of ${filtered.length} products.`;
}

function resetList() {
  cursor = 0;
  root.innerHTML = "";
  paintNext();
}

// Favorite toggle
root.addEventListener("click", (e) => {
  const btn = e.target.closest(".card__fav");
  if (!btn) return;
  const card = btn.closest(".card");
  const id = card?.dataset.id;
  if (!id) return;
  const favs = toggleFavorite(id);
  btn.setAttribute("aria-pressed", String(favs.includes(id)));
  updateFavBadge(document.getElementById("favBadge"));
});

// Grid/List toggle
function setView(isGrid) {
  if (isGrid) {
    root.classList.remove("is-list");
    gridBtn.setAttribute("aria-pressed", "true");
    listBtn.setAttribute("aria-pressed", "false");
  } else {
    root.classList.add("is-list");
    gridBtn.setAttribute("aria-pressed", "false");
    listBtn.setAttribute("aria-pressed", "true");
  }
}
gridBtn?.addEventListener("click", () => setView(true));
listBtn?.addEventListener("click", () => setView(false));

// Filters/search
function applyFilters() {
  const q = (searchEl?.value || "").trim().toLowerCase();
  const brand = brandEl?.value || "";
  const tag = tagEl?.value || "";
  const min = Number(minEl?.value || "");
  const max = Number(maxEl?.value || "");
  filtered = all.filter(p => {
    if (q && !(p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q))) return false;
    if (brand && p.brand !== brand) return false;
    if (tag && !(p.tags||[]).includes(tag)) return false;
    if (!Number.isNaN(min) && minEl?.value && Number(p.price||0) < min) return false;
    if (!Number.isNaN(max) && maxEl?.value && Number(p.price||0) > max) return false;
    return true;
  });
  resetList();
}
const debouncedApply = debounce(applyFilters, 300);
[searchEl, brandEl, tagEl, minEl, maxEl].forEach(el => el?.addEventListener("input", debouncedApply));

// Infinite scroll (local-only)
function setupObserver() {
  observer = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) paintNext();
    });
  });
  observer.observe(sentinel);
}

function populateFilterOptions() {
  // Brands
  const brands = Array.from(new Set(all.map(p => p.brand).filter(Boolean))).sort();
  if (brandEl) {
    brandEl.innerHTML = `<option value="">All Brands</option>` + brands.map(b=>`<option value="${b}">${b}</option>`).join("");
  }
  // Tags
  const tags = Array.from(new Set(all.flatMap(p => p.tags || []))).sort();
  if (tagEl) {
    tagEl.innerHTML = `<option value="">All Tags</option>` + tags.map(t=>`<option value="${t}">${t}</option>`).join("");
  }
}

async function init() {
  try {
    const data = await apiClient.getProducts();
    all = Array.isArray(data) ? data : [];
    root.removeAttribute("data-skeletons");

    populateFilterOptions();
    applyFilters();
    setupObserver();
  } catch (err) {
    console.error(err);
    root.innerHTML = `<p>Couldn’t load products. Please try again.</p>`;
  }
}

init();
