// Product detail page: fetch product, render gallery, favorite toggle, and related products
import { apiClient } from "./apiClient.js";
import { formatCurrency } from "./utils.js";
import { getFavorites, toggleFavorite, updateFavBadge } from "./storage.js";

const params = new URLSearchParams(location.search);
const id = params.get("id");
const root = document.getElementById("productDetail");
const relatedRoot = document.getElementById("relatedProducts");

function galleryTemplate(images = [], name = "") {
  const first = images[0];
  return `
  <div class="product-gallery" data-gallery>
    <div class="product-gallery__viewport" style="aspect-ratio:1/1">
      <img src="${first?.url || ""}" alt="${first?.alt || name}" loading="lazy" />
    </div>
    ${images.length > 1 ? `
    <div class="product-gallery__thumbs" role="listbox" aria-label="Product images">
      ${images.map((img, i)=>`
        <button class="product-gallery__thumb" role="option" aria-selected="${i===0}" data-index="${i}">
          <img src="${img.url}" alt="${img.alt || (name + ' thumbnail '+(i+1))}" loading="lazy" />
        </button>
      `).join("")}
    </div>` : ``}
  </div>`;
}

function productTemplate(p) {
  const favs = getFavorites();
  const pressed = favs.includes(p.id);
  return `
    ${galleryTemplate(p.images || [], p.name)}
    <div class="product-meta">
      <h1>${p.name}</h1>
      ${p.brand ? `<div class="card__meta"><span class="meta__brand">${p.brand}</span></div>` : ``}
      ${p.tags?.length ? `<div class="card__tags">${p.tags.map(t=>`<span class="tag">${t}</span>`).join("")}</div>` : ``}
      <div class="price">
        ${p.price != null ? `<span class="price__now">${formatCurrency(Number(p.price))}</span>` : ``}
        ${p.originalPrice != null ? `<span class="price__was">${formatCurrency(Number(p.originalPrice))}</span>` : ``}
      </div>
      ${p.description ? `<p>${p.description}</p>` : ``}
      ${p.note ? `<p class="card__meta">${p.note}</p>` : ``}
      ${(p.customerBought != null || p.customersViewed != null) ? `
        <p class="card__meta">
          ${p.customerBought != null ? `${p.customerBought} bought · ` : ``}
          ${p.customersViewed != null ? `${p.customersViewed} viewed` : ``}
        </p>` : ``}
      <div class="product-actions">
        <button id="favToggle" class="button--ghost" aria-pressed="${pressed}">${pressed ? "♥ Favorited" : "♡ Favorite"}</button>
        ${p.merchantUrl ? `<a class="button" href="${p.merchantUrl}" target="_blank" rel="noopener noreferrer">View at Merchant</a>` : `<button class="button" disabled title="Link unavailable">View at Merchant</button>`}
      </div>
    </div>
  `;
}

function renderRelatedCard(p) {
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

function bindGallery(p) {
  const gallery = root.querySelector("[data-gallery]");
  if (!gallery) return;
  const viewportImg = gallery.querySelector(".product-gallery__viewport img");
  const thumbs = gallery.querySelectorAll(".product-gallery__thumb");
  thumbs.forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.index);
      thumbs.forEach(t => t.setAttribute("aria-selected", "false"));
      btn.setAttribute("aria-selected", "true");
      const img = p.images[idx];
      viewportImg.src = img.url;
      viewportImg.alt = img.alt || p.name;
    });
  });
  // Keyboard arrows
  gallery.addEventListener("keydown", (e) => {
    if (!["ArrowLeft","ArrowRight"].includes(e.key)) return;
    const active = Array.from(thumbs).findIndex(t => t.getAttribute("aria-selected") === "true");
    let next = active + (e.key === "ArrowRight" ? 1 : -1);
    if (next < 0) next = thumbs.length - 1;
    if (next >= thumbs.length) next = 0;
    thumbs[next].click();
    thumbs[next].focus();
  });
}

async function init() {
  if (!id) {
    root.innerHTML = `<p>Product not found.</p>`;
    return;
  }
  try {
    const p = await apiClient.getProduct(id);
    if (!p) {
      root.innerHTML = `<p>Product not found.</p>`;
      return;
    }
    root.innerHTML = productTemplate(p);
    bindGallery(p);

    // favorite button
    const favBtn = document.getElementById("favToggle");
    favBtn?.addEventListener("click", () => {
      const favs = toggleFavorite(p.id);
      const pressed = favs.includes(p.id);
      favBtn.setAttribute("aria-pressed", String(pressed));
      favBtn.textContent = pressed ? "♥ Favorited" : "♡ Favorite";
      updateFavBadge(document.getElementById("favBadge"));
    });

    // Related
    try {
      const related = await apiClient.getRelatedProducts(p.id);
      // If API returns IDs, fetch details via getProducts + filter
      let relatedItems = [];
      if (Array.isArray(related) && related.length && typeof related[0] === "string") {
        const all = await apiClient.getProducts();
        relatedItems = all.filter(x => related.includes(x.id));
      } else if (Array.isArray(related)) {
        relatedItems = related;
      }
      relatedRoot.removeAttribute("data-skeletons");
      relatedRoot.innerHTML = relatedItems.slice(0, 8).map(renderRelatedCard).join("");
    } catch {
      relatedRoot.innerHTML = `<p>Couldn’t load related products.</p>`;
    }
  } catch (err) {
    console.error(err);
    root.innerHTML = `<p>Couldn’t load product.</p>`;
  }
}

init();
