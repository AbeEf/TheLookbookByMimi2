// Home page: render featured moodboards and products using shared card pattern
import { apiClient } from "./apiClient.js";
import { toggleFavorite, getFavorites, updateFavBadge } from "./storage.js";
import { formatCurrency } from "./utils.js";

const mbRoot = document.getElementById("featuredMoodboards");
const prodRoot = document.getElementById("featuredProducts");
const ariaLive = document.getElementById("ariaLive");

// Simple shared card renderers
function renderMoodboardCard(mb) {
  return `
  <a class="card card--list" data-type="moodboard" data-id="${mb.id}" href="moodboard.html?id=${encodeURIComponent(mb.id)}">
    <div class="card__media" style="aspect-ratio:16/10">
      <img loading="lazy" src="${(mb.coverImage && mb.coverImage.url) || ""}" alt="${(mb.coverImage && mb.coverImage.alt) || mb.title}" />
      <div class="card__badges">
        ${mb.featured ? `<span class="chip chip--featured">Featured</span>` : ``}
      </div>
    </div>
    <div class="card__body">
      <h3 class="card__title">${mb.title}</h3>
      ${mb.tags?.length ? `<div class="card__tags">${mb.tags.map(t=>`<span class="tag">${t}</span>`).join("")}</div>` : ``}
    </div>
  </a>
  `;
}

function renderProductCard(p) {
  const favs = getFavorites();
  const pressed = favs.includes(p.id);
  return `
  <article class="card card--list" data-type="product" data-id="${p.id}">
    <button 
      class="card__fav${pressed ? " active" : ""}" 
      aria-pressed="${pressed}" 
      aria-label="${pressed ? "Remove from favorites" : "Add to favorites"}">
      <svg xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 122.88 107.41"
          style="width:22px; height:22px;">
        <path fill="currentColor" d="M60.83,17.19C68.84,8.84,74.45,1.62,86.79,0.21c23.17-2.66,44.48,21.06,32.78,44.41 c-3.33,6.65-10.11,14.56-17.61,22.32c-8.23,8.52-17.34,16.87-23.72,23.2l-17.4,17.26L46.46,93.56C29.16,76.9,0.95,55.93,0.02,29.95 C-0.63,11.75,13.73,0.09,30.25,0.3C45.01,0.5,51.22,7.84,60.83,17.19z"/>
      </svg>
    </button>
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

// Favorite toggle (event delegation)
function handleFavClick(e) {
  const btn = e.target.closest('button.card__fav');
  if (!btn || btn.disabled) return;

  const card = btn.closest('[data-id]');
  const id = card?.dataset.id;
  if (!id) return;

  // Update favorites store (your toggleFavorite returns the full list)
  const favs = toggleFavorite(id);
  const isFav = favs.includes(id);

  // Update the clicked button's state
  btn.setAttribute('aria-pressed', String(isFav));
  btn.classList.toggle('active', isFav);
  btn.setAttribute('aria-label', isFav ? 'Remove from favorites' : 'Add to favorites');

  // Optional: sync other instances of the same product on the page
  document.querySelectorAll(`.card[data-id="${CSS.escape(id)}"] .card__fav`).forEach(b => {
    if (b === btn) return;
    b.setAttribute('aria-pressed', String(isFav));
    b.classList.toggle('active', isFav);
    b.setAttribute('aria-label', isFav ? 'Remove from favorites' : 'Add to favorites');
  });

  updateFavBadge(document.getElementById('favBadge'));
}

mbRoot?.addEventListener("click", handleFavClick);
prodRoot?.addEventListener("click", handleFavClick);

async function init() {
  try {
    const [moodboards, products] = await Promise.all([
      apiClient.getMoodboards(),
      apiClient.getProducts(),
    ]);

    if (mbRoot) {
      mbRoot.removeAttribute("data-skeletons");
      mbRoot.innerHTML = (moodboards || [])
        .slice(0, 8)
        .map(renderMoodboardCard)
        .join("");
    }

    if (prodRoot) {
      prodRoot.removeAttribute("data-skeletons");
      prodRoot.innerHTML = (products || [])
        .slice(0, 8)
        .map(renderProductCard)
        .join("");
    }

    if (ariaLive) ariaLive.textContent = "Featured items loaded.";
  } catch (err) {
    console.error(err);
    if (mbRoot) mbRoot.innerHTML = `<p>Couldn’t load moodboards.</p>`;
    if (prodRoot) prodRoot.innerHTML = `<p>Couldn’t load products.</p>`;
  }
}

init();