// Moodboards list: single fetch → local-only infinite scroll; client-side search
import { apiClient } from "./apiClient.js";
import { debounce } from "./utils.js";

const root = document.getElementById("moodboardsList");
const ariaLive = document.getElementById("ariaLive");
const sentinel = document.getElementById("scrollSentinel");
const searchEl = document.getElementById("searchMoodboards");

let all = [];
let filtered = [];
let windowSize = 12;
let cursor = 0;
let observer;
let loading = false;

function renderMoodboardCard(mb) {
  return `
  <article class="card card--list" data-type="moodboard" data-id="${mb.id}">
    <div class="card__media" style="aspect-ratio:16/10">
      <img loading="lazy" src="${(mb.coverImage && mb.coverImage.url) || ""}" alt="${(mb.coverImage && mb.coverImage.alt) || mb.title}" />
      <div class="card__badges">
        ${mb.featured ? `<span class="chip chip--featured">Featured</span>` : ``}
      </div>
    </div>
    <div class="card__body">
      <h3 class="card__title">${mb.title}</h3>
      ${mb.tags?.length ? `<div class="card__tags">${mb.tags.map(t=>`<span class="tag">${t}</span>`).join("")}</div>` : ``}
      <a class="button button--ghost" href="moodboard.html?id=${encodeURIComponent(mb.id)}">View</a>
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

  slice.forEach(mb => {
    const div = document.createElement("div");
    div.innerHTML = renderMoodboardCard(mb);
    frag.appendChild(div.firstElementChild);
  });
  root.appendChild(frag);
  loading = false;

  if (ariaLive) ariaLive.textContent = `Showing ${cursor} of ${filtered.length} moodboards.`;
}

function resetList() {
  cursor = 0;
  root.innerHTML = "";
  paintNext();
}

function applyFilters() {
  const q = (searchEl?.value || "").trim().toLowerCase();
  filtered = all.filter(mb => {
    if (q && !(mb.title?.toLowerCase().includes(q) || mb.description?.toLowerCase().includes(q))) return false;
    return true;
  });
  resetList();
}
const debouncedApply = debounce(applyFilters, 300);
searchEl?.addEventListener("input", debouncedApply);

function setupObserver() {
  observer = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) paintNext();
    });
  });
  observer.observe(sentinel);
}

async function init() {
  try {
    const data = await apiClient.getMoodboards();
    all = Array.isArray(data) ? data : [];
    root.removeAttribute("data-skeletons");

    applyFilters();
    setupObserver();
  } catch (err) {
    console.error(err);
    root.innerHTML = `<p>Couldn’t load moodboards. Please try again.</p>`;
  }
}

init();
