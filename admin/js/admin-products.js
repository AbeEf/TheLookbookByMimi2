// ========================================
// Admin: Products
// - Single fetch -> local table (windowed append)
// - Search/filter on existing fields (name, brand, tags, price, badges)
// - Optional analytics columns if present in data (no schema change)
// - Bulk operations (badges/price/brand/delete) using existing fields only
// - Create/Update dialog (reuses dialog in admin/index.html)
// ========================================

import { API_BASE_URL, MOCK_MODE } from "../../js/env.js";
import { httpRequest } from "../../js/http.js";
import { apiClient } from "../../js/apiClient.js";
import { debounce, formatCurrency, showToast, openDialog, closeDialog, showBulkBar, hideBulkBar } from "./admin-ui.js";


const tbody = document.getElementById("productsTbody");
const searchEl = document.getElementById("searchProductsAdmin");
const createBtn = document.getElementById("createProductBtn");
const dlg = document.getElementById("productDialog");
const form = document.getElementById("productForm");
const addImageBtn = document.getElementById("addImageInput");
const imageInputsWrap = document.getElementById("imageInputs");

// Selection
let selected = new Set();

// Data
let all = [];
let filtered = [];
let renderCursor = 0;
const CHUNK = 50;

// ---- Helpers ----
function detectAnalytics(list) {
  const keys = new Set();
  list.forEach(p => {
    ["views","favoritesCount","clickThroughs","updatedAt"].forEach(k => {
      if (p && p[k] != null) keys.add(k);
    });
  });
  return keys;
}

function renderHead(analyticsKeys) {
  return `
    <tr>
      <th scope="col"><input type="checkbox" id="selectAll"/></th>
      <th scope="col">Image</th>
      <th scope="col">Name</th>
      <th scope="col">Brand</th>
      <th scope="col">Price</th>
      <th scope="col">Tags</th>
      <th scope="col">Badges</th>
      ${analyticsKeys.has("views") ? `<th scope="col">Views</th>` : ``}
      ${analyticsKeys.has("favoritesCount") ? `<th scope="col">Favs</th>` : ``}
      ${analyticsKeys.has("clickThroughs") ? `<th scope="col">Clicks</th>` : ``}
      ${analyticsKeys.has("updatedAt") ? `<th scope="col">Updated</th>` : ``}
      <th scope="col" class="col-actions">Actions</th>
    </tr>
  `;
}

function row(p, analyticsKeys) {
  const img = p.images?.[0]?.url ?? "";
  const tags = (p.tags || []).join(", ");
  const badges = (p.badges || []).join(", ");
  const price = p.price != null ? formatCurrency(Number(p.price)) : "—";
  const updated = p.updatedAt ? new Date(p.updatedAt).toLocaleString() : "—";
  const checked = selected.has(String(p.id)) ? "checked" : "";

  return `
    <tr data-id="${p.id}">
      <td><input type="checkbox" class="rowSel" ${checked}/></td>
      <td>${img ? `<img class="thumb" src="${img}" alt="${p.name}" loading="lazy" />` : "—"}</td>
      <td>${p.name ?? "—"}</td>
      <td>${p.brand ?? "—"}</td>
      <td>${price}</td>
      <td>${tags || "—"}</td>
      <td>${badges || "—"}</td>
      ${analyticsKeys.has("views") ? `<td>${p.views ?? "—"}</td>` : ``}
      ${analyticsKeys.has("favoritesCount") ? `<td>${p.favoritesCount ?? "—"}</td>` : ``}
      ${analyticsKeys.has("clickThroughs") ? `<td>${p.clickThroughs ?? "—"}</td>` : ``}
      ${analyticsKeys.has("updatedAt") ? `<td>${updated}</td>` : ``}
      <td class="col-actions">
        <button class="button--ghost btn-edit">Edit</button>
        ${!MOCK_MODE ? `<button class="button--ghost btn-delete">Del</button>` : ``}
      </td>
    </tr>
  `;
}

function applyFilters() {
  const q = (searchEl?.value || "").trim().toLowerCase();
  filtered = all.filter(p => {
    if (q && !(p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q))) return false;
    return true;
  });
  renderCursor = 0;
  paintChunk(true);
}

function paintChunk(reset = false) {
  if (reset) {
    // rebuild thead with optional analytics cols
    const thead = tbody.parentElement.querySelector("thead");
    const keys = detectAnalytics(filtered);
    thead.innerHTML = renderHead(keys);
    tbody.innerHTML = "";
    // hook select-all
    thead.querySelector("#selectAll")?.addEventListener("change", (e) => {
      const check = e.target.checked;
      const ids = filtered.map(p => String(p.id));
      if (check) ids.forEach(id => selected.add(id));
      else selected.clear();
      updateBulkBar();
      paintChunk(true);
    });
  }

  const keys = detectAnalytics(filtered);
  const slice = filtered.slice(renderCursor, renderCursor + CHUNK);
  renderCursor += slice.length;

  const frag = document.createDocumentFragment();
  slice.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = row(p, keys);
    // Replace wrapper with its first child row:
    const tmp = document.createElement("tbody");
    tmp.innerHTML = row(p, keys);
    frag.appendChild(tmp.firstElementChild);
  });
  tbody.appendChild(frag);
}

// ---- Selection & Bulk bar ----
function updateBulkBar() {
  const count = selected.size;
  if (count > 0) {
    showBulkBar(count, () => {
      selected.clear();
      updateBulkBar();
      paintChunk(true);
    });
    renderBulkActions();
  } else {
    hideBulkBar();
  }
}

function renderBulkActions() {
  const bar = document.querySelector(".bulk-bar .bulk-actions");
  if (!bar) return;
  bar.innerHTML = `
    <button class="button--ghost" id="bulkBadges">Badges</button>
    <button class="button--ghost" id="bulkBrand">Brand</button>
    <button class="button--ghost" id="bulkPrice">Price</button>
    ${!MOCK_MODE ? `<button class="button--ghost" id="bulkDelete">Delete</button>` : ``}
    <button class="button" id="bulkExport">Export CSV</button>
  `;

  bar.querySelector("#bulkBadges")?.addEventListener("click", bulkBadges);
  bar.querySelector("#bulkBrand")?.addEventListener("click", bulkBrand);
  bar.querySelector("#bulkPrice")?.addEventListener("click", bulkPrice);
  bar.querySelector("#bulkExport")?.addEventListener("click", bulkExport);
  bar.querySelector("#bulkDelete")?.addEventListener("click", bulkDelete);
}

// ---- Bulk Actions ----
async function bulkPatchEach(patchFn, successMsg) {
  const ids = Array.from(selected);
  let ok = 0, fail = 0;

  for (const id of ids) {
    try {
      const patch = patchFn(id);
      const updated = await updateProduct(id, patch);
      const idx = all.findIndex(p => String(p.id) === String(id));
      if (idx >= 0) all[idx] = { ...all[idx], ...updated };
      ok++;
    } catch {
      fail++;
    }
  }
  showToast(`${successMsg}: ${ok} ok, ${fail} failed`, fail ? "error" : "success");
  paintChunk(true);
}

function bulkBadges() {
  const val = prompt("Set badges (comma separated from: New, Featured, Sale, Trending). Leave blank to clear.");
  if (val === null) return;
  const arr = val.trim() ? val.split(",").map(s => s.trim()) : [];
  bulkPatchEach(() => ({ badges: arr }), "Badges updated");
}

function bulkBrand() {
  const brand = prompt("Set brand (leave blank to clear):");
  if (brand === null) return;
  const patch = brand.trim() ? { brand: brand.trim() } : { brand: "" };
  bulkPatchEach(() => patch, "Brand updated");
}

function bulkPrice() {
  const input = prompt("Set price or delta (examples: 49.99 or +10% or -5%)");
  if (input === null) return;

  function computePatch(p) {
    if (!input.includes("%")) {
      const val = Number(input);
      if (Number.isNaN(val) || val < 0) throw new Error("Invalid price");
      return { price: val };
    }
    const m = input.match(/^([+-]\d+(\.\d+)?)%$/);
    if (!m) throw new Error("Invalid delta");
    const pct = Number(m[1]) / 100;
    const current = Number(p.price || 0);
    const next = Math.max(0, +(current * (1 + pct)).toFixed(2));
    return { price: next };
  }

  bulkPatchEach((id) => {
    const p = all.find(x => String(x.id) === String(id)) || {};
    return computePatch(p);
  }, "Prices updated");
}

function bulkExport() {
  const rows = [["id","name","brand","price","tags","badges"]];
  filtered.forEach(p => {
    rows.push([
      String(p.id ?? ""),
      String(p.name ?? ""),
      String(p.brand ?? ""),
      String(p.price ?? ""),
      (p.tags || []).join("|"),
      (p.badges || []).join("|"),
    ]);
  });
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "products.csv";
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  showToast("Exported CSV", "success");
}

async function bulkDelete() {
  if (!confirm(`Delete ${selected.size} products? This cannot be undone.`)) return;
  const ids = Array.from(selected);
  let ok = 0, fail = 0;
  for (const id of ids) {
    try {
      await deleteProduct(id);
      const idx = all.findIndex(p => String(p.id) === String(id));
      if (idx >= 0) all.splice(idx, 1);
      ok++;
    } catch {
      fail++;
    }
  }
  selected.clear();
  showToast(`Deleted: ${ok} ok, ${fail} failed`, fail ? "error" : "success");
  applyFilters();
}

// ---- CRUD helpers ----
async function createProduct(payload) {
  if (MOCK_MODE) {
    payload.id = "p" + (Math.random() * 1e6 | 0);
    all.unshift(payload);
    return payload;
  }
  const url = new URL("/admin/products", API_BASE_URL).toString();
  return httpRequest(url, { method: "POST", body: JSON.stringify(payload) });
}
async function updateProduct(id, patch) {
  if (MOCK_MODE) {
    const idx = all.findIndex(p => String(p.id) === String(id));
    if (idx >= 0) all[idx] = { ...all[idx], ...patch };
    return all[idx];
  }
  const url = new URL(`/admin/products/${encodeURIComponent(id)}`, API_BASE_URL).toString();
  return httpRequest(url, { method: "PATCH", body: JSON.stringify(patch) });
}
async function deleteProduct(id) {
  if (MOCK_MODE) return true;
  const url = new URL(`/admin/products/${encodeURIComponent(id)}`, API_BASE_URL).toString();
  return httpRequest(url, { method: "DELETE" });
}

// ---- Dialog wiring ----
function resetImageInputs() {
  imageInputsWrap.innerHTML = `
    <input type="url" name="image0" placeholder="Image URL" />
    <input type="text" name="image0alt" placeholder="Alt text" />
  `;
}
addImageBtn?.addEventListener("click", () => {
  const count = imageInputsWrap.querySelectorAll("input[name^='image']").length / 2;
  const url = document.createElement("input");
  url.type = "url"; url.name = `image${count}`; url.placeholder = "Image URL";
  const alt = document.createElement("input");
  alt.type = "text"; alt.name = `image${count}alt`; alt.placeholder = "Alt text";
  imageInputsWrap.append(url, alt);
});

function formToProduct(formEl) {
  const data = Object.fromEntries(new FormData(formEl).entries());
  const tags = (data.tags || "").split(",").map(s=>s.trim()).filter(Boolean);
  const images = [];
  Object.keys(data).forEach(k => {
    const m = k.match(/^image(\d+)$/);
    if (m && data[k]) {
      const idx = m[1];
      images.push({ url: data[k], alt: data[`image${idx}alt`] || "" });
      delete data[k]; delete data[`image${idx}alt`];
    }
  });

  const price = data.price ? Number(data.price) : null;
  const originalPrice = data.originalPrice ? Number(data.originalPrice) : null;

  const out = {
    name: data.name || "",
    brand: data.brand || "",
    price: price != null ? price : undefined,
    originalPrice: originalPrice != null ? originalPrice : undefined,
    tags,
    merchantUrl: data.merchantUrl || "",
    description: data.description || "",
    images,
  };

  return out;
}

function fillFormFromProduct(p) {
  form.reset();
  form.name.value = p.name ?? "";
  form.brand.value = p.brand ?? "";
  form.price.value = p.price ?? "";
  form.originalPrice.value = p.originalPrice ?? "";
  form.tags.value = (p.tags || []).join(", ");
  form.merchantUrl.value = p.merchantUrl ?? "";
  form.description.value = p.description ?? "";
  resetImageInputs();
  const imgs = p.images || [];
  if (imgs.length) {
    imageInputsWrap.innerHTML = "";
    imgs.forEach((img, i) => {
      const url = document.createElement("input");
      url.type = "url"; url.name = `image${i}`; url.placeholder = "Image URL"; url.value = img.url || "";
      const alt = document.createElement("input");
      alt.type = "text"; alt.name = `image${i}alt`; alt.placeholder = "Alt text"; alt.value = img.alt || "";
      imageInputsWrap.append(url, alt);
    });
  }
}

// Create
createBtn?.addEventListener("click", () => {
  form.dataset.mode = "create";
  form.dataset.id = "";
  dlg.querySelector("#productDialogTitle").textContent = "Create Product";
  form.reset();
  resetImageInputs();
  openDialog(dlg);
});

tbody?.addEventListener("click", (e) => {
  const tr = e.target.closest("tr");
  if (!tr) return;
  const id = tr.dataset.id;

  if (e.target.classList.contains("btn-edit")) {
    const p = all.find(x => String(x.id) === String(id));
    if (!p) return;
    form.dataset.mode = "edit";
    form.dataset.id = id;
    dlg.querySelector("#productDialogTitle").textContent = "Edit Product";
    fillFormFromProduct(p);
    openDialog(dlg);
  } else if (e.target.classList.contains("btn-delete")) {
    if (!confirm("Delete this product?")) return;
    deleteProduct(id).then(() => {
      const idx = all.findIndex(x => String(x.id) === String(id));
      if (idx >= 0) all.splice(idx, 1);
      showToast("Product deleted", "success");
      applyFilters();
    }).catch(() => showToast("Delete failed", "error"));
  }
});

// Checkboxes
tbody?.addEventListener("change", (e) => {
  if (!e.target.classList.contains("rowSel")) return;
  const tr = e.target.closest("tr");
  const id = tr?.dataset.id;
  if (!id) return;
  if (e.target.checked) selected.add(String(id));
  else selected.delete(String(id));
  updateBulkBar();
});

// Save handler
form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const mode = form.dataset.mode;
  const id = form.dataset.id;
  const payload = formToProduct(form);

  try {
    if (mode === "create") {
      const created = await createProduct(payload);
      all.unshift(created);
      showToast("Product created", "success");
    } else {
      const updated = await updateProduct(id, payload);
      const idx = all.findIndex(p => String(p.id) === String(id));
      if (idx >= 0) all[idx] = { ...all[idx], ...updated };
      showToast("Product updated", "success");
    }
    applyFilters();
    closeDialog(dlg);
  } catch {
    showToast("Save failed", "error");
  }
});

// ---- Init ----
async function initProducts() {
  if (!tbody) return; // not on this page
  try {
    const data = await apiClient.getProducts();
    all = Array.isArray(data) ? data : [];
    filtered = all.slice();
    applyFilters();

    // Infinite-like windowed append as you scroll the table container
    const wrap = tbody.closest(".admin-table-wrap");
    if (wrap) {
      wrap.addEventListener("scroll", debounce(() => {
        const atBottom = wrap.scrollTop + wrap.clientHeight >= wrap.scrollHeight - 200;
        if (atBottom && renderCursor < filtered.length) paintChunk();
      }, 100));
    }
  } catch {
    tbody.innerHTML = `<tr><td colspan="10">Couldn’t load products.</td></tr>`;
  }
}

initProducts();