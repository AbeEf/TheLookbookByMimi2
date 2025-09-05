// ========================================
// API Client
// Discovers endpoints from Swagger,
// exposes typed methods.
// ========================================

import { API_BASE_URL, MOCK_MODE } from "./env.js";
import { httpRequest } from "./http.js";
import { discoverEndpoints } from "./swagger.js";

let endpoints = null;

async function init() {
  if (!endpoints) {
    endpoints = await discoverEndpoints();
  }
}

// Helper to build URL
function buildUrl(path) {
  return new URL(path, API_BASE_URL).toString();
}

export const apiClient = {
  async getProducts(params = {}) {
    if (MOCK_MODE) {
      const res = await fetch("/mock/products.json");
      return res.json();
    }
    await init();
    return httpRequest(buildUrl("/public/products"));
  },

  async getProduct(id) {
    if (MOCK_MODE) {
      const res = await fetch("/mock/products.json");
      const arr = await res.json();
      return arr.find(p => p.id === id);
    }
    await init();
    return httpRequest(buildUrl(`/public/products/${id}`));
  },

  async getRelatedProducts(id) {
    if (MOCK_MODE) {
      const res = await fetch("/mock/related.json");
      const arr = await res.json();
      const item = arr.find(x => x.productId === id);
      return item ? item.related : [];
    }
    await init();
    return httpRequest(buildUrl(`/public/products/${id}/related`));
  },

  async getMoodboards(params = {}) {
    if (MOCK_MODE) {
      const res = await fetch("/mock/moodboards.json");
      return res.json();
    }
    await init();
    return httpRequest(buildUrl("/public/moodboards"));
  },

  async getMoodboard(id) {
    if (MOCK_MODE) {
      const res = await fetch("/mock/moodboards.json");
      const arr = await res.json();
      return arr.find(mb => mb.id === id);
    }
    await init();
    return httpRequest(buildUrl(`/public/moodboards/${id}`));
  },

  async getProductsForMoodboard(id) {
    if (MOCK_MODE) {
      const res = await fetch("/mock/moodboard-products.json");
      const arr = await res.json();
      const map = arr.find(x => x.moodboardId === id);
      if (!map) return [];
      const all = await (await fetch("/mock/products.json")).json();
      return all.filter(p => map.productIds.includes(p.id));
    }
    await init();
    return httpRequest(buildUrl(`/public/moodboards/${id}/products`));
  },

  // Auth stubs
  async login(credentials) {
    console.log("login stub", credentials);
    return { token: "demo-token" };
  },
  async register(data) {
    console.log("register stub", data);
    return { ok: true };
  },
  async resetPassword(email) {
    console.log("reset stub", email);
    return { ok: true };
  },
};