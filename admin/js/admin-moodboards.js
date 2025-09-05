// ========================================
// Admin: Moodboards
// - Single fetch -> local table
// - Search on title/description
// - Create/Update via dialog (existing fields only)
// ========================================

import { API_BASE_URL, MOCK_MODE } from "../../js/env.js";
import { httpRequest } from "../../js/http.js";
import { apiClient } from "../../js/apiClient.js";
import { debounce, formatCurrency, showToast, openDialog, closeDialog, showBulkBar, hideBulkBar } from "./admin-ui.js";

const tbody = document.getElementById("moodboardsTbody");
const searchEl = document.getElementById("searchMoodboardsAdmin");
const createBtn = document.getElementById("createMoodboardBtn");
const dlg = document.getElementById("moodboardDialog");
const form = document.getElementById("moodboardForm");

let all = [];
let filtered = [];
let cursor = 0;
const CHUNK = 50;

// ---- API ----
async function createMoodboard(payload) {
  if (MOCK_MODE) {
    payload.id = "mb" + (Math.random() * 1e6 | 0);
    all.unshift(payload);
    return payload;
  }
  const url = new URL("/admin/moodboards", API_BASE_URL).toString();
  return httpRequest(url, { method: "POST", body: JSON.stringify(payload) });
}
async function updateMoodboard(id, patch) {
  if (MOCK_MODE) {
    const idx = all.findIndex(m => String(m.id) === String(id));
    if (idx >= 0) all[idx] = { ...all[idx], ...patch };
    return all[idx];
  }
  const url = new URL(`/admin/moodboards/${encodeURIComponent(id)}`, API_BASE_URL).toString();
  return httpRequest(url, { method: "PATCH", body: JSON.stringify(patch) });
}

// ---- Rendering ----
function head() {
  return `
    <tr>
      <th scope="col">Cover</th>
      <th scope="col">Title</th>
      <th scope="col">Tags</th>
      <th scope="col">Featured</th>
      <th scope="col" class="col-actions">Actions</th>
    </tr>
  `;
}
function row(mb) {
  const cover = mb.coverImage?.url ?? "";
  const tags = (mb.tags || []).join(", ");
  return `
    <tr data-id="${mb.id}">
      <td>${cover ? `<img class="thumb" src="${cover}" alt="${mb.title}" loading="lazy" />` : "—"}</td>
      <td>${mb.title ?? "—"}</td>
      <td>${tags || "—"}</td>
      <td>${mb.featured ? "Yes" : "No"}</td>
      <td class="col-actions">
        <button class="button--ghost btn-edit">Edit</button>
      </td>
    </tr>
  `;
}

function paint(reset = false) {
  if (reset) {
    const thead = tbody.parentElement.querySelector("thead");
    thead.innerHTML = head();
    tbody.innerHTML = "";
    cursor = 0;
  }
  const slice = filtered.slice(cursor, cursor + CHUNK);
  cursor += slice.length;

  const frag = document.createDocumentFragment();
  slice.forEach(mb => {
    const tmp = document.createElement("tbody");
    tmp.innerHTML = row(mb);
    frag.appendChild(tmp.firstElementChild);
  });
  tbody.appendChild(frag);
}

function applyFilters() {
  const q = (searchEl?.value || "").trim().toLowerCase();
  filtered = all.filter(mb => {
    if (q && !(mb.title?.toLowerCase().includes(q) || mb.description?.toLowerCase().includes(q))) return false;
    return true;
  });
  paint(true);
}

// ---- Dialog wiring ----
function formToMoodboard(formEl) {
  const data = Object.fromEntries(new FormData(formEl).entries());
  const tags = (data.tags || "").split(",").map(s=>s.trim()).filter(Boolean);
  const out = {
    title: data.title || "",
    description: data.description || "",
    tags,
    coverImage: { url: data.coverUrl || "", alt: data.coverAlt || "" },
    featured: formEl.featured.checked,
  };
  return out;
}

function fillForm(mb) {
  form.reset();
  form.title.value = mb.title ?? "";
  form.description.value = mb.description ?? "";
  form.tags.value = (mb.tags || []).join(", ");
  form.coverUrl.value = mb.coverImage?.url ?? "";
  form.coverAlt.value = mb.coverImage?.alt ?? "";
  form.featured.checked = !!mb.featured;
}

// Create
createBtn?.addEventListener("click", () => {
  form.dataset.mode = "create";
  form.dataset.id = "";
  dlg.querySelector("#moodboardDialogTitle").textContent = "Create Moodboard";
  form.reset();
  openDialog(dlg);
});

tbody?.addEventListener("click", (e) => {
  const tr = e.target.closest("tr");
  if (!tr) return;
  const id = tr.dataset.id;

  if (e.target.classList.contains("btn-edit")) {
    const mb = all.find(x => String(x.id) === String(id));
    if (!mb) return;
    form.dataset.mode = "edit";
    form.dataset.id = id;
    dlg.querySelector("#moodboardDialogTitle").textContent = "Edit Moodboard";
    fillForm(mb);
    openDialog(dlg);
  }
});

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const mode = form.dataset.mode;
  const id = form.dataset.id;
  const payload = formToMoodboard(form);

  try {
    if (mode === "create") {
      const created = await createMoodboard(payload);
      all.unshift(created);
      showToast("Moodboard created", "success");
    } else {
      const updated = await updateMoodboard(id, payload);
      const idx = all.findIndex(m => String(m.id) === String(id));
      if (idx >= 0) all[idx] = { ...all[idx], ...updated };
      showToast("Moodboard updated", "success");
    }
    applyFilters();
    closeDialog(dlg);
  } catch {
    showToast("Save failed", "error");
  }
});

// ---- Init ----
async function initMoodboards() {
  if (!tbody) return;
  try {
    const data = await apiClient.getMoodboards();
    all = Array.isArray(data) ? data : [];
    filtered = all.slice();
    applyFilters();

    const wrap = tbody.closest(".admin-table-wrap");
    if (wrap) {
      wrap.addEventListener("scroll", debounce(() => {
        const atBottom = wrap.scrollTop + wrap.clientHeight >= wrap.scrollHeight - 200;
        if (atBottom && cursor < filtered.length) paint();
      }, 100));
    }
  } catch {
    tbody.innerHTML = `<tr><td colspan="5">Couldn’t load moodboards.</td></tr>`;
  }
}

initMoodboards();