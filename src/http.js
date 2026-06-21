import { CORS_HEADERS } from "./constants.js";

export function jsonResponse(body, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", "application/json");
  return addCorsHeaders(
    new Response(JSON.stringify(body), {
      ...init,
      headers,
    }),
  );
}

export function addCorsHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function corsPreflight() {
  return new Response(null, { headers: CORS_HEADERS });
}

export function errorResponse(error, status = 500) {
  const message = error instanceof Error ? error.message : String(error);
  return jsonResponse(
    {
      error: {
        message: message || (status === 400 ? "Bad Request" : "Internal Server Error"),
        type: status === 400 ? "invalid_request_error" : "server_error",
        code: status,
      },
    },
    { status },
  );
}

export async function parseJsonBody(request) {
  try {
    return await request.clone().json();
  } catch {
    throw new Error("Invalid JSON body");
  }
}

export function stripTrailingSlash(url) {
  return String(url || "").replace(/\/+$/, "");
}

export function joinUrl(baseUrl, path) {
  return `${stripTrailingSlash(baseUrl)}${path.startsWith("/") ? path : `/${path}`}`;
}

export function copyForwardHeaders(originalHeaders, blocked = []) {
  const headers = new Headers();
  const blockedSet = new Set([
    "host",
    "connection",
    "authorization",
    "content-length",
    "accept-encoding",
    ...blocked.map((key) => key.toLowerCase()),
  ]);
  for (const [key, value] of originalHeaders.entries()) {
    const lower = key.toLowerCase();
    if (lower.startsWith("cf-") || blockedSet.has(lower)) continue;
    headers.set(key, value);
  }
  return headers;
}

export function isModelsPath(pathname) {
  return pathname === "/models" || pathname.endsWith("/models");
}
