// ========================================
// Swagger Auto-Discovery
// Attempts to fetch the OpenAPI schema
// and build an endpoint map.
// ========================================

import { API_BASE_URL } from "./env.js";

let endpointMap = null;

export async function discoverEndpoints() {
  if (endpointMap) return endpointMap;

  const candidates = [
    `${API_BASE_URL}/docs`,
    `${API_BASE_URL}/swagger/v1/swagger.json`,
  ];

  for (const url of candidates) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const json = await res.json();
      endpointMap = parseSwagger(json);
      return endpointMap;
    } catch {
      continue;
    }
  }

  // fallback empty map
  endpointMap = {};
  return endpointMap;
}

function parseSwagger(schema) {
  const map = {};
  if (!schema.paths) return map;

  for (const [path, methods] of Object.entries(schema.paths)) {
    for (const [method, def] of Object.entries(methods)) {
      const opId = def.operationId || `${method}_${path}`;
      map[opId] = { method: method.toUpperCase(), path };
    }
  }
  return map;
}