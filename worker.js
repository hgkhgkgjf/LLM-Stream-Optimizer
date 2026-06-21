var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/constants.js
var KV_CONFIG_KEYS = {
  UPSTREAM_URL: "upstream_url",
  OUTGOING_API_KEY: "outgoing_api_key",
  OPENAI_ENDPOINTS: "openai_endpoints",
  GEMINI_URL: "gemini_url",
  GEMINI_API_KEY: "gemini_api_key",
  GEMINI_USE_NATIVE_FETCH: "gemini_use_native_fetch",
  ANTHROPIC_URL: "anthropic_url",
  ANTHROPIC_API_KEY: "anthropic_api_key",
  ANTHROPIC_USE_NATIVE_FETCH: "anthropic_use_native_fetch",
  PROXY_API_KEY: "proxy_api_key",
  MIN_DELAY: "min_delay",
  MAX_DELAY: "max_delay",
  ADAPTIVE_DELAY_FACTOR: "adaptive_delay_factor",
  CHUNK_BUFFER_SIZE: "chunk_buffer_size",
  DISABLE_OPTIMIZATION_MODELS: "disable_optimization_models",
  MIN_CONTENT_LENGTH_FOR_FAST_OUTPUT: "min_content_length_for_fast_output",
  FAST_OUTPUT_DELAY: "fast_output_delay",
  FINAL_LOW_DELAY: "final_low_delay"
};
var DEFAULT_CONFIG = {
  minDelay: 5,
  maxDelay: 40,
  adaptiveDelayFactor: 0.5,
  chunkBufferSize: 10,
  minContentLengthForFastOutput: 1e4,
  fastOutputDelay: 3,
  finalLowDelay: 1,
  openaiEndpoints: [],
  debugLogging: false
};
var DEFAULT_OPENAI_URL = "https://api.openai.com/v1";
var DEFAULT_GEMINI_URL = "https://generativelanguage.googleapis.com";
var DEFAULT_ANTHROPIC_URL = "https://api.anthropic.com";
var CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Upstream-URL, X-Outgoing-API-Key, X-Anthropic-API-Key, X-Gemini-API-Key",
  "Access-Control-Max-Age": "86400"
};

// src/config.js
function uuid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.random() * 16 | 0;
    const value = char === "x" ? random : random & 3 | 8;
    return value.toString(16);
  });
}
__name(uuid, "uuid");
function parseJsonArray(value, fallback = []) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}
__name(parseJsonArray, "parseJsonArray");
function parseBoolean(value, fallback = false) {
  if (value === void 0 || value === null || value === "") return fallback;
  return value === true || String(value).toLowerCase() === "true";
}
__name(parseBoolean, "parseBoolean");
function parsePositiveInt(value, fallback, min = 1) {
  if (value === void 0 || value === null || value === "") return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, parsed);
}
__name(parsePositiveInt, "parsePositiveInt");
function parseNumber(value, fallback) {
  if (value === void 0 || value === null || value === "") return fallback;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
__name(parseNumber, "parseNumber");
function getDefaultConfig(env = {}) {
  const config = {
    ...DEFAULT_CONFIG,
    defaultUpstreamUrl: env.UPSTREAM_URL || DEFAULT_OPENAI_URL,
    defaultOutgoingApiKey: env.OPENAI_API_KEY || "",
    defaultEnabled: !!env.OPENAI_API_KEY,
    geminiEnabled: !!env.GEMINI_API_KEY,
    geminiUpstreamUrl: env.GEMINI_URL || DEFAULT_GEMINI_URL,
    geminiApiKey: env.GEMINI_API_KEY || "",
    geminiUseNativeFetch: env.GEMINI_USE_NATIVE_FETCH !== "false",
    anthropicEnabled: !!env.ANTHROPIC_API_KEY,
    anthropicUpstreamUrl: env.ANTHROPIC_URL || DEFAULT_ANTHROPIC_URL,
    anthropicApiKey: env.ANTHROPIC_API_KEY || "",
    anthropicUseNativeFetch: env.ANTHROPIC_USE_NATIVE_FETCH !== "false",
    proxyApiKey: env.PROXY_API_KEY || "",
    debugLogging: env.DEBUG_LOGGING === "true"
  };
  if (env.OPENAI_ENDPOINTS) {
    config.openaiEndpoints = parseJsonArray(env.OPENAI_ENDPOINTS);
  }
  if ((!config.openaiEndpoints || config.openaiEndpoints.length === 0) && config.defaultOutgoingApiKey) {
    config.openaiEndpoints = [
      {
        id: "default",
        name: "Default",
        url: config.defaultUpstreamUrl,
        apiKey: config.defaultOutgoingApiKey,
        models: [],
        useNativeFetch: true
      }
    ];
  }
  return config;
}
__name(getDefaultConfig, "getDefaultConfig");
async function loadConfig(env = {}) {
  if (!env.CONFIG_KV) return getDefaultConfig(env);
  const config = getDefaultConfig(env);
  const entries = await Promise.all(
    Object.entries(KV_CONFIG_KEYS).map(async ([name, key]) => [name, await env.CONFIG_KV.get(key)])
  );
  for (const [name, value] of entries) {
    if (value === null || value === void 0) continue;
    switch (name) {
      case "UPSTREAM_URL":
        config.defaultUpstreamUrl = value || config.defaultUpstreamUrl;
        break;
      case "OUTGOING_API_KEY":
        config.defaultOutgoingApiKey = value;
        config.defaultEnabled = !!value;
        break;
      case "OPENAI_ENDPOINTS":
        config.openaiEndpoints = parseJsonArray(value, config.openaiEndpoints);
        break;
      case "GEMINI_URL":
        config.geminiUpstreamUrl = value || config.geminiUpstreamUrl;
        break;
      case "GEMINI_API_KEY":
        config.geminiApiKey = value;
        config.geminiEnabled = !!value;
        break;
      case "GEMINI_USE_NATIVE_FETCH":
        config.geminiUseNativeFetch = parseBoolean(value, config.geminiUseNativeFetch);
        break;
      case "ANTHROPIC_URL":
        config.anthropicUpstreamUrl = value || config.anthropicUpstreamUrl;
        break;
      case "ANTHROPIC_API_KEY":
        config.anthropicApiKey = value;
        config.anthropicEnabled = !!value;
        break;
      case "ANTHROPIC_USE_NATIVE_FETCH":
        config.anthropicUseNativeFetch = parseBoolean(value, config.anthropicUseNativeFetch);
        break;
      case "PROXY_API_KEY":
        config.proxyApiKey = value;
        break;
      case "MIN_DELAY":
        config.minDelay = parsePositiveInt(value, config.minDelay);
        break;
      case "MAX_DELAY":
        config.maxDelay = parsePositiveInt(value, config.maxDelay);
        break;
      case "ADAPTIVE_DELAY_FACTOR":
        config.adaptiveDelayFactor = parseNumber(value, config.adaptiveDelayFactor);
        break;
      case "CHUNK_BUFFER_SIZE":
        config.chunkBufferSize = parsePositiveInt(value, config.chunkBufferSize);
        break;
      case "DISABLE_OPTIMIZATION_MODELS":
        config.disableOptimizationModels = parseJsonArray(value);
        break;
      case "MIN_CONTENT_LENGTH_FOR_FAST_OUTPUT":
        config.minContentLengthForFastOutput = parsePositiveInt(value, config.minContentLengthForFastOutput);
        break;
      case "FAST_OUTPUT_DELAY":
        config.fastOutputDelay = parsePositiveInt(value, config.fastOutputDelay, 0);
        break;
      case "FINAL_LOW_DELAY":
        config.finalLowDelay = parsePositiveInt(value, config.finalLowDelay, 0);
        break;
    }
  }
  return config;
}
__name(loadConfig, "loadConfig");
function normalizeConfigInput(input = {}) {
  const output = {};
  const intFields = [
    "minDelay",
    "maxDelay",
    "chunkBufferSize",
    "minContentLengthForFastOutput",
    "fastOutputDelay",
    "finalLowDelay"
  ];
  for (const field of intFields) {
    const parsed = parsePositiveInt(input[field], void 0, field === "minDelay" ? 1 : 0);
    if (parsed !== void 0) output[field] = parsed;
  }
  const adaptiveDelayFactor = parseNumber(input.adaptiveDelayFactor, void 0);
  if (adaptiveDelayFactor !== void 0) output.adaptiveDelayFactor = adaptiveDelayFactor;
  if (Array.isArray(input.disableOptimizationModels)) {
    output.disableOptimizationModels = input.disableOptimizationModels.filter((model2) => typeof model2 === "string").map((model2) => model2.trim()).filter(Boolean);
  }
  for (const field of [
    "defaultUpstreamUrl",
    "defaultOutgoingApiKey",
    "geminiUpstreamUrl",
    "geminiApiKey",
    "anthropicUpstreamUrl",
    "anthropicApiKey",
    "proxyApiKey"
  ]) {
    if (Object.hasOwn(input, field)) output[field] = String(input[field] || "").trim();
  }
  for (const field of ["geminiUseNativeFetch", "anthropicUseNativeFetch"]) {
    if (Object.hasOwn(input, field)) output[field] = !!input[field];
  }
  if (Array.isArray(input.openaiEndpoints)) {
    output.openaiEndpoints = input.openaiEndpoints.map((endpoint) => ({
      id: endpoint.id || uuid(),
      name: String(endpoint.name || "").trim(),
      url: String(endpoint.url || "").trim(),
      apiKey: String(endpoint.apiKey || "").trim(),
      models: Array.isArray(endpoint.models) ? endpoint.models.map((model2) => String(model2).trim()).filter(Boolean) : [],
      useNativeFetch: endpoint.useNativeFetch !== void 0 ? !!endpoint.useNativeFetch : true
    })).filter((endpoint) => endpoint.url || endpoint.apiKey || endpoint.name || endpoint.models.length);
  }
  return output;
}
__name(normalizeConfigInput, "normalizeConfigInput");
function isMaskedSecret(value) {
  return typeof value === "string" && value.includes("*");
}
__name(isMaskedSecret, "isMaskedSecret");
function resolveSecret(field, next, current) {
  if (!Object.hasOwn(next, field)) return current[field] || "";
  const value = next[field];
  if (isMaskedSecret(value)) return current[field] || "";
  return value || "";
}
__name(resolveSecret, "resolveSecret");
function applyMaskedSecrets(input = {}, current = {}) {
  const next = { ...current, ...input };
  for (const field of ["defaultOutgoingApiKey", "geminiApiKey", "anthropicApiKey", "proxyApiKey"]) {
    next[field] = resolveSecret(field, input, current);
  }
  next.defaultEnabled = !!next.defaultOutgoingApiKey;
  next.geminiEnabled = !!next.geminiApiKey;
  next.anthropicEnabled = !!next.anthropicApiKey;
  if (Array.isArray(input.openaiEndpoints)) {
    next.openaiEndpoints = input.openaiEndpoints.map((endpoint) => {
      const existing = current.openaiEndpoints?.find((item) => endpoint.id && item.id === endpoint.id) || current.openaiEndpoints?.find((item) => item.name === endpoint.name && item.url === endpoint.url);
      return {
        ...endpoint,
        apiKey: isMaskedSecret(endpoint.apiKey) ? existing?.apiKey || "" : endpoint.apiKey || ""
      };
    }).filter((endpoint) => endpoint.url && endpoint.apiKey);
  }
  return next;
}
__name(applyMaskedSecrets, "applyMaskedSecrets");
function maskAPIKey(apiKey) {
  if (!apiKey) return "";
  if (apiKey.includes(",")) {
    return apiKey.split(",").map((key) => maskAPIKey(key.trim())).join(", ");
  }
  if (apiKey.length <= 8) return apiKey;
  const visibleChars = Math.min(4, Math.floor(apiKey.length / 4));
  return `${apiKey.slice(0, visibleChars)}${"*".repeat(apiKey.length - visibleChars * 2)}${apiKey.slice(
    -visibleChars
  )}`;
}
__name(maskAPIKey, "maskAPIKey");
function safeConfig(config) {
  return {
    defaultUpstreamUrl: config.defaultUpstreamUrl,
    defaultOutgoingApiKey: maskAPIKey(config.defaultOutgoingApiKey),
    defaultEnabled: config.defaultEnabled,
    openaiEndpoints: (config.openaiEndpoints || []).map((endpoint) => ({
      id: endpoint.id,
      name: endpoint.name,
      url: endpoint.url,
      apiKey: maskAPIKey(endpoint.apiKey),
      models: endpoint.models || [],
      useNativeFetch: endpoint.useNativeFetch !== void 0 ? endpoint.useNativeFetch : true
    })),
    geminiEnabled: config.geminiEnabled,
    geminiUpstreamUrl: config.geminiUpstreamUrl,
    geminiApiKey: maskAPIKey(config.geminiApiKey),
    geminiUseNativeFetch: config.geminiUseNativeFetch === true,
    anthropicEnabled: config.anthropicEnabled,
    anthropicUpstreamUrl: config.anthropicUpstreamUrl,
    anthropicApiKey: maskAPIKey(config.anthropicApiKey),
    anthropicUseNativeFetch: config.anthropicUseNativeFetch === true,
    proxyApiKey: maskAPIKey(config.proxyApiKey),
    minDelay: config.minDelay,
    maxDelay: config.maxDelay,
    adaptiveDelayFactor: config.adaptiveDelayFactor,
    chunkBufferSize: config.chunkBufferSize,
    disableOptimizationModels: config.disableOptimizationModels || [],
    minContentLengthForFastOutput: config.minContentLengthForFastOutput,
    fastOutputDelay: config.fastOutputDelay,
    finalLowDelay: config.finalLowDelay
  };
}
__name(safeConfig, "safeConfig");
async function saveConfig(env, config) {
  if (!env.CONFIG_KV) {
    return { success: false, message: "CONFIG_KV binding is not configured; changes cannot be persisted." };
  }
  const entries = [
    [KV_CONFIG_KEYS.UPSTREAM_URL, config.defaultUpstreamUrl || ""],
    [KV_CONFIG_KEYS.OUTGOING_API_KEY, config.defaultOutgoingApiKey || ""],
    [KV_CONFIG_KEYS.OPENAI_ENDPOINTS, JSON.stringify(config.openaiEndpoints || [])],
    [KV_CONFIG_KEYS.GEMINI_URL, config.geminiUpstreamUrl || ""],
    [KV_CONFIG_KEYS.GEMINI_API_KEY, config.geminiApiKey || ""],
    [KV_CONFIG_KEYS.GEMINI_USE_NATIVE_FETCH, String(!!config.geminiUseNativeFetch)],
    [KV_CONFIG_KEYS.ANTHROPIC_URL, config.anthropicUpstreamUrl || ""],
    [KV_CONFIG_KEYS.ANTHROPIC_API_KEY, config.anthropicApiKey || ""],
    [KV_CONFIG_KEYS.ANTHROPIC_USE_NATIVE_FETCH, String(!!config.anthropicUseNativeFetch)],
    [KV_CONFIG_KEYS.PROXY_API_KEY, config.proxyApiKey || ""],
    [KV_CONFIG_KEYS.MIN_DELAY, String(config.minDelay)],
    [KV_CONFIG_KEYS.MAX_DELAY, String(config.maxDelay)],
    [KV_CONFIG_KEYS.ADAPTIVE_DELAY_FACTOR, String(config.adaptiveDelayFactor)],
    [KV_CONFIG_KEYS.CHUNK_BUFFER_SIZE, String(config.chunkBufferSize)],
    [KV_CONFIG_KEYS.DISABLE_OPTIMIZATION_MODELS, JSON.stringify(config.disableOptimizationModels || [])],
    [KV_CONFIG_KEYS.MIN_CONTENT_LENGTH_FOR_FAST_OUTPUT, String(config.minContentLengthForFastOutput)],
    [KV_CONFIG_KEYS.FAST_OUTPUT_DELAY, String(config.fastOutputDelay)],
    [KV_CONFIG_KEYS.FINAL_LOW_DELAY, String(config.finalLowDelay)]
  ];
  await Promise.all(entries.map(([key, value]) => env.CONFIG_KV.put(key, value)));
  return { success: true, message: "Configuration saved." };
}
__name(saveConfig, "saveConfig");

// src/http.js
function jsonResponse(body, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", "application/json");
  return addCorsHeaders(
    new Response(JSON.stringify(body), {
      ...init,
      headers
    })
  );
}
__name(jsonResponse, "jsonResponse");
function addCorsHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
__name(addCorsHeaders, "addCorsHeaders");
function corsPreflight() {
  return new Response(null, { headers: CORS_HEADERS });
}
__name(corsPreflight, "corsPreflight");
function errorResponse(error, status = 500) {
  const message = error instanceof Error ? error.message : String(error);
  return jsonResponse(
    {
      error: {
        message: message || (status === 400 ? "Bad Request" : "Internal Server Error"),
        type: status === 400 ? "invalid_request_error" : "server_error",
        code: status
      }
    },
    { status }
  );
}
__name(errorResponse, "errorResponse");
async function parseJsonBody(request) {
  try {
    return await request.clone().json();
  } catch {
    throw new Error("Invalid JSON body");
  }
}
__name(parseJsonBody, "parseJsonBody");
function stripTrailingSlash(url) {
  return String(url || "").replace(/\/+$/, "");
}
__name(stripTrailingSlash, "stripTrailingSlash");
function joinUrl(baseUrl, path) {
  return `${stripTrailingSlash(baseUrl)}${path.startsWith("/") ? path : `/${path}`}`;
}
__name(joinUrl, "joinUrl");
function copyForwardHeaders(originalHeaders, blocked = []) {
  const headers = new Headers();
  const blockedSet = /* @__PURE__ */ new Set([
    "host",
    "connection",
    "authorization",
    "content-length",
    "accept-encoding",
    ...blocked.map((key) => key.toLowerCase())
  ]);
  for (const [key, value] of originalHeaders.entries()) {
    const lower = key.toLowerCase();
    if (lower.startsWith("cf-") || blockedSet.has(lower)) continue;
    headers.set(key, value);
  }
  return headers;
}
__name(copyForwardHeaders, "copyForwardHeaders");
function isModelsPath(pathname) {
  return pathname === "/models" || pathname.endsWith("/models");
}
__name(isModelsPath, "isModelsPath");

// src/admin/auth.js
var encoder = new TextEncoder();
var DEFAULT_MAX_AGE_SECONDS = 86400;
function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
__name(bytesToBase64Url, "bytesToBase64Url");
function base64UrlToBytes(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
__name(base64UrlToBytes, "base64UrlToBytes");
async function hmac(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return bytesToBase64Url(new Uint8Array(signature));
}
__name(hmac, "hmac");
function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return diff === 0;
}
__name(constantTimeEqual, "constantTimeEqual");
function parseCookies(cookieString = "") {
  const cookies = {};
  for (const cookie of cookieString.split(";")) {
    const trimmed = cookie.trim();
    if (!trimmed) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    cookies[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim();
  }
  return cookies;
}
__name(parseCookies, "parseCookies");
async function createAdminSessionValue(secret, options = {}) {
  const now = options.now ?? Date.now();
  const maxAgeSeconds = options.maxAgeSeconds ?? DEFAULT_MAX_AGE_SECONDS;
  const payload = {
    exp: now + maxAgeSeconds * 1e3,
    nonce: bytesToBase64Url(crypto.getRandomValues(new Uint8Array(12)))
  };
  const payloadBytes = encoder.encode(JSON.stringify(payload));
  const encodedPayload = bytesToBase64Url(payloadBytes);
  const signature = await hmac(secret, encodedPayload);
  return `${encodedPayload}.${signature}`;
}
__name(createAdminSessionValue, "createAdminSessionValue");
async function createAdminSessionCookie(secret, options = {}) {
  const maxAgeSeconds = options.maxAgeSeconds ?? DEFAULT_MAX_AGE_SECONDS;
  const value = await createAdminSessionValue(secret, options);
  return `admin_session=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSeconds}; Secure`;
}
__name(createAdminSessionCookie, "createAdminSessionCookie");
async function isValidAdminSession(sessionValue, secret, options = {}) {
  if (!sessionValue || !secret) return false;
  const parts = String(sessionValue).split(".");
  if (parts.length !== 2) return false;
  const [encodedPayload, signature] = parts;
  if (!encodedPayload || !signature) return false;
  const expected = await hmac(secret, encodedPayload);
  if (!constantTimeEqual(signature, expected)) return false;
  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(encodedPayload)));
    return Number(payload.exp) > (options.now ?? Date.now());
  } catch {
    return false;
  }
}
__name(isValidAdminSession, "isValidAdminSession");
async function checkAdminSession(request, config) {
  const cookies = parseCookies(request.headers.get("Cookie") || "");
  return isValidAdminSession(cookies.admin_session, config.proxyApiKey);
}
__name(checkAdminSession, "checkAdminSession");
function clearAdminSessionHeaders() {
  return [
    "admin_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; HttpOnly; SameSite=Strict; Secure",
    "admin_session=; Path=/admin; Expires=Thu, 01 Jan 1970 00:00:01 GMT; HttpOnly; SameSite=Strict; Secure"
  ];
}
__name(clearAdminSessionHeaders, "clearAdminSessionHeaders");

// src/admin/pages.js
function serveLoginPage() {
  return new Response(
    `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>LLM Stream Optimizer - Admin Login</title>
  <style>
    :root { color-scheme: light dark; font-family: Inter, system-ui, sans-serif; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f4f6f8; color: #16202a; }
    main { width: min(420px, calc(100vw - 32px)); background: white; border: 1px solid #d9e0e7; border-radius: 8px; padding: 28px; box-shadow: 0 20px 60px rgba(10, 31, 68, .12); }
    h1 { margin: 0 0 8px; font-size: 24px; }
    p { margin: 0 0 20px; color: #52616f; }
    label { display: block; font-weight: 650; margin-bottom: 8px; }
    input, button { width: 100%; box-sizing: border-box; font: inherit; border-radius: 6px; }
    input { border: 1px solid #cbd5df; padding: 12px; }
    button { margin-top: 14px; border: 0; padding: 12px; background: #1261a6; color: white; cursor: pointer; }
    #message { min-height: 22px; margin-top: 14px; color: #a83232; }
  </style>
</head>
<body>
  <main>
    <h1>LLM Stream Optimizer</h1>
    <p>Admin dashboard</p>
    <form id="login-form">
      <label for="password">Password</label>
      <input id="password" name="password" type="password" autocomplete="current-password" required>
      <button type="submit">Login</button>
      <div id="message" role="status"></div>
    </form>
  </main>
  <script>
    const form = document.getElementById('login-form');
    const message = document.getElementById('message');
    fetch('/admin/api/check-session').then(r => r.json()).then(data => {
      if (data.isLoggedIn) location.href = '/admin/dashboard';
    }).catch(() => {});
    form.addEventListener('submit', async event => {
      event.preventDefault();
      message.textContent = '';
      const response = await fetch('/admin/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: form.password.value })
      });
      const data = await response.json();
      if (data.success) location.href = '/admin/dashboard';
      else message.textContent = data.message || 'Login failed';
    });
  <\/script>
</body>
</html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}
__name(serveLoginPage, "serveLoginPage");
function serveDashboardPage() {
  return new Response(
    `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>LLM Stream Optimizer - Admin</title>
  <style>
    :root { color-scheme: light dark; font-family: Inter, system-ui, sans-serif; }
    body { margin: 0; background: #f5f7fa; color: #17212b; }
    header { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; background: white; border-bottom: 1px solid #d9e0e7; }
    h1 { margin: 0; font-size: 20px; }
    main { width: min(1080px, calc(100vw - 32px)); margin: 24px auto 48px; display: grid; gap: 16px; }
    section { background: white; border: 1px solid #d9e0e7; border-radius: 8px; padding: 18px; }
    h2 { margin: 0 0 14px; font-size: 17px; }
    label { display: block; font-weight: 650; margin: 10px 0 6px; }
    input, textarea, button { font: inherit; border-radius: 6px; box-sizing: border-box; }
    input, textarea { width: 100%; border: 1px solid #cbd5df; padding: 10px; }
    textarea { min-height: 150px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .checks { display: flex; gap: 18px; flex-wrap: wrap; margin-top: 10px; }
    .checks label { display: inline-flex; align-items: center; gap: 8px; margin: 0; }
    .checks input { width: auto; }
    .actions { display: flex; gap: 10px; justify-content: flex-end; }
    button { border: 0; padding: 10px 14px; background: #1261a6; color: white; cursor: pointer; }
    button.secondary { background: #5f6f7d; }
    #message { min-height: 24px; }
    @media (max-width: 760px) { .grid { grid-template-columns: 1fr; } header { padding: 14px 16px; } }
  </style>
</head>
<body>
  <header>
    <h1>LLM Stream Optimizer</h1>
    <button id="logout" class="secondary" type="button">Logout</button>
  </header>
  <main>
    <form id="config-form">
      <section>
        <h2>OpenAI-compatible upstreams</h2>
        <div class="grid">
          <div>
            <label for="defaultUpstreamUrl">Default upstream URL</label>
            <input id="defaultUpstreamUrl" type="url">
          </div>
          <div>
            <label for="defaultOutgoingApiKey">Default outgoing API key</label>
            <input id="defaultOutgoingApiKey" type="password" autocomplete="off">
          </div>
        </div>
        <label for="openaiEndpoints">OpenAI endpoints JSON</label>
        <textarea id="openaiEndpoints" spellcheck="false"></textarea>
      </section>
      <section>
        <h2>Provider keys</h2>
        <div class="grid">
          <div>
            <label for="geminiUpstreamUrl">Gemini URL</label>
            <input id="geminiUpstreamUrl" type="url">
          </div>
          <div>
            <label for="geminiApiKey">Gemini API key</label>
            <input id="geminiApiKey" type="password" autocomplete="off">
          </div>
          <div>
            <label for="anthropicUpstreamUrl">Anthropic URL</label>
            <input id="anthropicUpstreamUrl" type="url">
          </div>
          <div>
            <label for="anthropicApiKey">Anthropic API key</label>
            <input id="anthropicApiKey" type="password" autocomplete="off">
          </div>
          <div>
            <label for="proxyApiKey">Proxy/admin API key</label>
            <input id="proxyApiKey" type="password" autocomplete="new-password">
          </div>
        </div>
        <div class="checks">
          <label><input id="geminiUseNativeFetch" type="checkbox"> Gemini native fetch</label>
          <label><input id="anthropicUseNativeFetch" type="checkbox"> Anthropic native fetch</label>
        </div>
      </section>
      <section>
        <h2>Stream optimizer</h2>
        <div class="grid">
          <div><label for="minDelay">Min delay</label><input id="minDelay" type="number" min="0"></div>
          <div><label for="maxDelay">Max delay</label><input id="maxDelay" type="number" min="0"></div>
          <div><label for="adaptiveDelayFactor">Adaptive delay factor</label><input id="adaptiveDelayFactor" type="number" step="0.1" min="0"></div>
          <div><label for="chunkBufferSize">Chunk buffer size</label><input id="chunkBufferSize" type="number" min="1"></div>
          <div><label for="minContentLengthForFastOutput">Fast output threshold</label><input id="minContentLengthForFastOutput" type="number" min="0"></div>
          <div><label for="fastOutputDelay">Fast output delay</label><input id="fastOutputDelay" type="number" min="0"></div>
          <div><label for="finalLowDelay">Final low delay</label><input id="finalLowDelay" type="number" min="0"></div>
          <div><label for="disableOptimizationModels">Disable optimization models</label><input id="disableOptimizationModels" placeholder="gpt-4o, claude-3"></div>
        </div>
      </section>
      <div class="actions">
        <span id="message" role="status"></span>
        <button type="submit">Save</button>
      </div>
    </form>
  </main>
  <script>
    const ids = [
      'defaultUpstreamUrl','defaultOutgoingApiKey','geminiUpstreamUrl','geminiApiKey',
      'anthropicUpstreamUrl','anthropicApiKey','proxyApiKey','minDelay','maxDelay',
      'adaptiveDelayFactor','chunkBufferSize','minContentLengthForFastOutput','fastOutputDelay',
      'finalLowDelay','disableOptimizationModels'
    ];
    const byId = id => document.getElementById(id);
    const message = byId('message');
    function setValue(id, value) { byId(id).value = value ?? ''; }
    async function loadConfig() {
      const response = await fetch('/admin/api/config');
      if (response.status === 401) { location.href = '/admin'; return; }
      const data = await response.json();
      const config = data.config || {};
      for (const id of ids) {
        if (id === 'disableOptimizationModels') setValue(id, (config.disableOptimizationModels || []).join(', '));
        else setValue(id, config[id]);
      }
      byId('geminiUseNativeFetch').checked = config.geminiUseNativeFetch === true;
      byId('anthropicUseNativeFetch').checked = config.anthropicUseNativeFetch === true;
      byId('openaiEndpoints').value = JSON.stringify(config.openaiEndpoints || [], null, 2);
    }
    function formData() {
      let endpoints = [];
      try { endpoints = JSON.parse(byId('openaiEndpoints').value || '[]'); }
      catch { throw new Error('OpenAI endpoints JSON is invalid'); }
      return {
        defaultUpstreamUrl: byId('defaultUpstreamUrl').value.trim(),
        defaultOutgoingApiKey: byId('defaultOutgoingApiKey').value.trim(),
        openaiEndpoints: endpoints,
        geminiUpstreamUrl: byId('geminiUpstreamUrl').value.trim(),
        geminiApiKey: byId('geminiApiKey').value.trim(),
        geminiUseNativeFetch: byId('geminiUseNativeFetch').checked,
        anthropicUpstreamUrl: byId('anthropicUpstreamUrl').value.trim(),
        anthropicApiKey: byId('anthropicApiKey').value.trim(),
        anthropicUseNativeFetch: byId('anthropicUseNativeFetch').checked,
        proxyApiKey: byId('proxyApiKey').value.trim(),
        minDelay: byId('minDelay').value,
        maxDelay: byId('maxDelay').value,
        adaptiveDelayFactor: byId('adaptiveDelayFactor').value,
        chunkBufferSize: byId('chunkBufferSize').value,
        minContentLengthForFastOutput: byId('minContentLengthForFastOutput').value,
        fastOutputDelay: byId('fastOutputDelay').value,
        finalLowDelay: byId('finalLowDelay').value,
        disableOptimizationModels: byId('disableOptimizationModels').value.split(',').map(x => x.trim()).filter(Boolean)
      };
    }
    byId('config-form').addEventListener('submit', async event => {
      event.preventDefault();
      message.textContent = '';
      try {
        const response = await fetch('/admin/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData())
        });
        const data = await response.json();
        message.textContent = data.message || (data.success ? 'Saved' : 'Save failed');
        if (data.success) await loadConfig();
      } catch (error) {
        message.textContent = error.message;
      }
    });
    byId('logout').addEventListener('click', async () => {
      await fetch('/admin/api/logout', { method: 'POST' });
      location.href = '/admin';
    });
    loadConfig();
  <\/script>
</body>
</html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}
__name(serveDashboardPage, "serveDashboardPage");

// src/admin/routes.js
var ADMIN_API_PREFIX = "/admin/api";
function normalizeAdminApiPath(path) {
  if (path === ADMIN_API_PREFIX) return path;
  if (!path.startsWith(`${ADMIN_API_PREFIX}/`)) return path;
  return path.replace(/\/+$/g, "");
}
__name(normalizeAdminApiPath, "normalizeAdminApiPath");
async function readJsonBody(request) {
  try {
    return { ok: true, body: await request.json() };
  } catch {
    return {
      ok: false,
      response: jsonResponse({ success: false, message: "Invalid JSON body" }, { status: 400 })
    };
  }
}
__name(readJsonBody, "readJsonBody");
async function handleLoginRequest(request, env) {
  if (request.method !== "POST") {
    return jsonResponse({ success: false, message: "Method not allowed" }, { status: 405 });
  }
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  const { password } = parsed.body || {};
  const config = await loadConfig(env);
  if (!config.proxyApiKey || password !== config.proxyApiKey) {
    return jsonResponse({ success: false, message: "Invalid password" }, { status: 401 });
  }
  const response = jsonResponse({ success: true, message: "Login successful" });
  response.headers.set("Set-Cookie", await createAdminSessionCookie(config.proxyApiKey));
  return response;
}
__name(handleLoginRequest, "handleLoginRequest");
async function handleConfigApiRequest(request, env, config) {
  if (!await checkAdminSession(request, config)) {
    return jsonResponse({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  if (request.method === "GET") {
    return jsonResponse({ success: true, config: safeConfig(config) });
  }
  if (request.method !== "POST") {
    return jsonResponse({ success: false, message: "Method not allowed" }, { status: 405 });
  }
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body || {};
  const normalized = normalizeConfigInput(body);
  const merged = applyMaskedSecrets(normalized, config);
  const result = await saveConfig(env, merged);
  return jsonResponse(result, { status: result.success ? 200 : 500 });
}
__name(handleConfigApiRequest, "handleConfigApiRequest");
function handleLogoutRequest() {
  const response = jsonResponse({ success: true, message: "Logged out" });
  const [rootCookie, adminCookie] = clearAdminSessionHeaders();
  response.headers.set("Set-Cookie", rootCookie);
  response.headers.append("Set-Cookie", adminCookie);
  return response;
}
__name(handleLogoutRequest, "handleLogoutRequest");
async function handleAdminRequest(request, env) {
  const url = new URL(request.url);
  const path = normalizeAdminApiPath(url.pathname);
  const config = await loadConfig(env);
  const loggedIn = await checkAdminSession(request, config);
  if (path === "/admin/api/login") return handleLoginRequest(request, env);
  if (path === "/admin/api/logout") return handleLogoutRequest();
  if (path === "/admin/api/check-session") return jsonResponse({ isLoggedIn: loggedIn });
  if (path === "/admin/api/config") return handleConfigApiRequest(request, env, config);
  if ((path === "/admin" || path === "/admin/") && loggedIn) {
    return Response.redirect(`${url.origin}/admin/dashboard`, 302);
  }
  if (path === "/admin" || path === "/admin/") return serveLoginPage();
  if (path === "/admin/dashboard") {
    if (!loggedIn) return Response.redirect(`${url.origin}/admin`, 302);
    return serveDashboardPage();
  }
  if (path === ADMIN_API_PREFIX || path.startsWith(`${ADMIN_API_PREFIX}/`)) {
    return jsonResponse({ success: false, message: "Not found" }, { status: 404 });
  }
  return new Response("Not Found", { status: 404 });
}
__name(handleAdminRequest, "handleAdminRequest");

// src/logger.js
var SECRET_FIELD_RE = /(authorization|api[-_]?key|token|secret|password)/i;
function redactValue(value) {
  if (typeof value !== "string") return value;
  if (value.length <= 8) return "***";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}
__name(redactValue, "redactValue");
function redactSecrets(input) {
  if (!input || typeof input !== "object") return input;
  if (input instanceof Headers) {
    const output2 = {};
    for (const [key, value] of input.entries()) {
      output2[key] = SECRET_FIELD_RE.test(key) ? redactValue(value) : value;
    }
    return output2;
  }
  if (Array.isArray(input)) return input.map(redactSecrets);
  const output = {};
  for (const [key, value] of Object.entries(input)) {
    output[key] = SECRET_FIELD_RE.test(key) ? redactValue(String(value)) : redactSecrets(value);
  }
  return output;
}
__name(redactSecrets, "redactSecrets");
function createLogger(enabled = false) {
  const debug = /* @__PURE__ */ __name((...args) => {
    if (enabled) console.log(...args.map(redactSecrets));
  }, "debug");
  return {
    debug,
    info: debug,
    warn: /* @__PURE__ */ __name((...args) => console.warn(...args.map(redactSecrets)), "warn"),
    error: /* @__PURE__ */ __name((...args) => console.error(...args.map(redactSecrets)), "error")
  };
}
__name(createLogger, "createLogger");

// src/native-fetch.js
import { connect } from "cloudflare:sockets";
var encoder2 = new TextEncoder();
var decoder = new TextDecoder();
var HEADER_FILTER_RE = /^(host|accept-encoding|cf-|content-length)$/i;
function concatUint8Arrays(...arrays) {
  const total = arrays.reduce((sum, array) => sum + array.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const array of arrays) {
    result.set(array, offset);
    offset += array.length;
  }
  return result;
}
__name(concatUint8Arrays, "concatUint8Arrays");
function headersToString(headers) {
  return Array.from(headers.entries()).map(([key, value]) => `${key}: ${value}`).join("\r\n");
}
__name(headersToString, "headersToString");
function normalizeBody(body) {
  if (!body) return null;
  if (typeof body === "string") return encoder2.encode(body);
  if (body instanceof Uint8Array) return body;
  if (body instanceof ArrayBuffer) return new Uint8Array(body);
  throw new Error("Unsupported nativeFetch request body type");
}
__name(normalizeBody, "normalizeBody");
async function requestToParts(req, dstUrl) {
  const targetUrl = new URL(dstUrl);
  const headers = new Headers();
  const sourceHeaders = req instanceof Request ? req.headers : new Headers(req.headers || {});
  for (const [key, value] of sourceHeaders.entries()) {
    if (!HEADER_FILTER_RE.test(key)) headers.set(key, value);
  }
  headers.set("Host", targetUrl.hostname);
  headers.set("accept-encoding", "identity");
  let body = null;
  if (req instanceof Request && req.body) {
    const chunks = [];
    for await (const chunk of req.clone().body) chunks.push(chunk);
    body = concatUint8Arrays(...chunks);
  } else {
    body = normalizeBody(req.body);
  }
  headers.set("Content-Length", body ? String(body.length) : "0");
  return {
    method: req.method || "GET",
    targetUrl,
    headers,
    body
  };
}
__name(requestToParts, "requestToParts");
function parseHeaders(buffer) {
  const text = decoder.decode(buffer);
  const headerEnd = text.indexOf("\r\n\r\n");
  if (headerEnd === -1) return null;
  const lines = text.slice(0, headerEnd).split("\r\n");
  const statusMatch = lines[0].match(/HTTP\/1\.[01]\s+(\d+)\s*(.*)/);
  if (!statusMatch) throw new Error(`Invalid HTTP status line: ${lines[0]}`);
  const headers = new Headers();
  for (const line of lines.slice(1)) {
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    headers.append(line.slice(0, separator).trim(), line.slice(separator + 1).trim());
  }
  return {
    status: Number(statusMatch[1]),
    statusText: statusMatch[2],
    headers,
    headerEnd
  };
}
__name(parseHeaders, "parseHeaders");
async function* readChunkedBody(reader, buffer = new Uint8Array()) {
  while (true) {
    let lineEnd = -1;
    for (let i = 0; i < buffer.length - 1; i++) {
      if (buffer[i] === 13 && buffer[i + 1] === 10) {
        lineEnd = i;
        break;
      }
    }
    if (lineEnd === -1) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer = concatUint8Arrays(buffer, value);
      continue;
    }
    const size = Number.parseInt(decoder.decode(buffer.slice(0, lineEnd)).split(";")[0], 16);
    if (!size) break;
    buffer = buffer.slice(lineEnd + 2);
    while (buffer.length < size + 2) {
      const { value, done } = await reader.read();
      if (done) throw new Error("Unexpected EOF while reading chunked response");
      buffer = concatUint8Arrays(buffer, value);
    }
    yield buffer.slice(0, size);
    buffer = buffer.slice(size + 2);
  }
}
__name(readChunkedBody, "readChunkedBody");
async function parseResponse(reader) {
  let buffer = new Uint8Array();
  while (true) {
    const { value, done } = await reader.read();
    if (value) {
      buffer = concatUint8Arrays(buffer, value);
      const parsed = parseHeaders(buffer);
      if (!parsed) continue;
      const bodyStart = parsed.headerEnd + 4;
      const initialData = buffer.slice(bodyStart);
      const isChunked = parsed.headers.get("transfer-encoding")?.toLowerCase().includes("chunked");
      const contentLength = Number.parseInt(parsed.headers.get("content-length") || "0", 10);
      return new Response(
        new ReadableStream({
          async start(controller) {
            try {
              if (isChunked) {
                for await (const chunk of readChunkedBody(reader, initialData)) controller.enqueue(chunk);
              } else {
                let received = initialData.length;
                if (initialData.length) controller.enqueue(initialData);
                while (!contentLength || received < contentLength) {
                  const next = await reader.read();
                  if (next.done) break;
                  received += next.value.length;
                  controller.enqueue(next.value);
                }
              }
              controller.close();
            } catch (error) {
              controller.error(error);
            }
          }
        }),
        {
          status: parsed.status,
          statusText: parsed.statusText,
          headers: parsed.headers
        }
      );
    }
    if (done) break;
  }
  throw new Error("Unable to parse upstream response");
}
__name(parseResponse, "parseResponse");
async function nativeFetch(req, dstUrl) {
  const { method, targetUrl, headers, body } = await requestToParts(req, dstUrl);
  if (!/^https?:$/.test(targetUrl.protocol)) {
    throw new Error("nativeFetch only supports HTTP and HTTPS URLs");
  }
  const port = Number(targetUrl.port || (targetUrl.protocol === "https:" ? 443 : 80));
  const socket = await connect(
    { hostname: targetUrl.hostname, port },
    { secureTransport: targetUrl.protocol === "https:" ? "on" : "off" }
  );
  const writer = socket.writable.getWriter();
  const requestLine = `${method} ${targetUrl.pathname}${targetUrl.search} HTTP/1.1\r
${headersToString(headers)}\r
\r
`;
  await writer.write(encoder2.encode(requestLine));
  if (body) await writer.write(body);
  return parseResponse(socket.readable.getReader());
}
__name(nativeFetch, "nativeFetch");

// src/routing.js
function selectWeightedKey(keys, random = Math.random) {
  const candidates = String(keys || "").split(",").map((key) => key.trim()).filter(Boolean);
  if (candidates.length === 0) return "";
  const index = Math.min(candidates.length - 1, Math.floor(random() * candidates.length));
  return candidates[index];
}
__name(selectWeightedKey, "selectWeightedKey");
function modelMatches(modelName, models = []) {
  const normalized = String(modelName || "").toLowerCase().trim();
  if (!normalized || !Array.isArray(models) || models.length === 0) return false;
  return models.some((model2) => String(model2).toLowerCase().trim() === normalized);
}
__name(modelMatches, "modelMatches");
function modelPartiallyMatches(modelName, models = []) {
  const normalized = String(modelName || "").toLowerCase().trim();
  if (!normalized || !Array.isArray(models) || models.length === 0) return false;
  return models.some((model2) => {
    const candidate = String(model2).toLowerCase().trim();
    return candidate && (normalized.includes(candidate) || candidate.includes(normalized));
  });
}
__name(modelPartiallyMatches, "modelPartiallyMatches");
function bearerFromRequest(request) {
  const authHeader = request.headers.get("Authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}
__name(bearerFromRequest, "bearerFromRequest");
function rankEndpoint(endpoint, modelName, index) {
  if (!endpoint.url) return null;
  if (!endpoint.models || endpoint.models.length === 0) {
    return { endpoint, matchType: "generic", priority: 3, index };
  }
  if (modelMatches(modelName, endpoint.models)) {
    return { endpoint, matchType: "exact", priority: 1, index };
  }
  if (modelPartiallyMatches(modelName, endpoint.models)) {
    return { endpoint, matchType: "partial", priority: 2, index };
  }
  return { endpoint, matchType: "none", priority: 4, index };
}
__name(rankEndpoint, "rankEndpoint");
function selectOpenAIEndpoint({ request, requestBody = {}, config = {}, random = Math.random }) {
  const customUrl = request.headers.get("X-Upstream-URL");
  const customKey = request.headers.get("X-Outgoing-API-Key");
  if (customUrl) {
    return {
      endpoint: null,
      matchType: "custom",
      url: customUrl,
      apiKey: customKey || selectWeightedKey(config.defaultOutgoingApiKey, random) || bearerFromRequest(request),
      useNativeFetch: true,
      restrictedModels: null
    };
  }
  const endpoints = Array.isArray(config.openaiEndpoints) ? config.openaiEndpoints : [];
  const modelName = requestBody.model;
  const ranked = endpoints.map((endpoint, index) => rankEndpoint(endpoint, modelName, index)).filter(Boolean).sort((left, right) => left.priority - right.priority || left.index - right.index);
  const selected = ranked[0];
  if (selected) {
    const endpoint = selected.endpoint;
    return {
      endpoint,
      matchType: selected.matchType,
      url: endpoint.url,
      apiKey: customKey || selectWeightedKey(endpoint.apiKey, random),
      useNativeFetch: endpoint.useNativeFetch !== void 0 ? endpoint.useNativeFetch : true,
      restrictedModels: endpoint.models && endpoint.models.length > 0 ? endpoint.models : null
    };
  }
  return {
    endpoint: null,
    matchType: "default",
    url: config.defaultUpstreamUrl || DEFAULT_OPENAI_URL,
    apiKey: customKey || selectWeightedKey(config.defaultOutgoingApiKey, random) || bearerFromRequest(request),
    useNativeFetch: true,
    restrictedModels: null
  };
}
__name(selectOpenAIEndpoint, "selectOpenAIEndpoint");
function isModelAllowed(modelName, restrictedModels) {
  if (!restrictedModels || restrictedModels.length === 0) return true;
  return modelMatches(modelName, restrictedModels) || modelPartiallyMatches(modelName, restrictedModels);
}
__name(isModelAllowed, "isModelAllowed");

// src/models.js
function model(id, ownedBy) {
  return {
    id,
    object: "model",
    created: Math.floor(Date.now() / 1e3),
    owned_by: ownedBy
  };
}
__name(model, "model");
var FALLBACK_GEMINI_MODELS = [
  "gemini-2.0-flash",
  "gemini-2.5-pro-exp-03-25",
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash-thinking-exp",
  "gemini-1.5-pro",
  "gemini-1.5-flash"
].map((id) => model(id, "google"));
var FALLBACK_ANTHROPIC_MODELS = [
  "claude-3-7-sonnet-20250219",
  "claude-3-5-sonnet-20241022",
  "claude-3-5-haiku-20241022",
  "claude-3-5-sonnet-20240620",
  "claude-3-opus-20240229"
].map((id) => model(id, "anthropic"));
async function sendModelRequest(upstreamRequest, fetcher) {
  if (upstreamRequest.useNativeFetch) {
    try {
      return await nativeFetch(upstreamRequest, upstreamRequest.url);
    } catch {
      return fetcher(upstreamRequest.url, {
        method: upstreamRequest.method,
        headers: upstreamRequest.headers
      });
    }
  }
  return fetcher(upstreamRequest.url, {
    method: upstreamRequest.method,
    headers: upstreamRequest.headers
  });
}
__name(sendModelRequest, "sendModelRequest");
function cleanModels(data, owner) {
  return (Array.isArray(data) ? data : []).map((item) => model(item.id || item.name?.replace(/^models\//, ""), owner));
}
__name(cleanModels, "cleanModels");
async function getOpenAIModels(request, config, fetcher = fetch) {
  const endpoints = Array.isArray(config.openaiEndpoints) ? config.openaiEndpoints : [];
  if (endpoints.length > 0) {
    const allModels = [];
    for (const endpoint of endpoints) {
      if (!endpoint.apiKey) continue;
      if (Array.isArray(endpoint.models) && endpoint.models.length > 0) {
        allModels.push(...endpoint.models.map((id) => model(id, "openai")));
        continue;
      }
      try {
        const apiKey = selectWeightedKey(endpoint.apiKey);
        const response = await sendModelRequest(
          {
            method: "GET",
            headers: new Headers({
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json"
            }),
            url: joinUrl(endpoint.url, "/models"),
            useNativeFetch: endpoint.useNativeFetch !== void 0 ? endpoint.useNativeFetch : true
          },
          fetcher
        );
        if (response.ok) {
          const body = await response.json();
          allModels.push(...cleanModels(body.data, "openai"));
        }
      } catch {
      }
    }
    return { object: "list", data: allModels };
  }
  const route = selectOpenAIEndpoint({ request, requestBody: {}, config });
  if (!route.apiKey) return { object: "list", data: [] };
  try {
    const response = await sendModelRequest(
      {
        method: "GET",
        headers: new Headers({
          Authorization: `Bearer ${route.apiKey}`,
          "Content-Type": "application/json"
        }),
        url: joinUrl(route.url, "/models"),
        useNativeFetch: route.useNativeFetch
      },
      fetcher
    );
    if (!response.ok) return { object: "list", data: [] };
    const body = await response.json();
    return { object: "list", data: cleanModels(body.data, "openai") };
  } catch {
    return { object: "list", data: [] };
  }
}
__name(getOpenAIModels, "getOpenAIModels");
async function getGeminiModels(request, config, fetcher = fetch) {
  const apiKey = request.headers.get("X-Gemini-API-Key") || selectWeightedKey(config.geminiApiKey);
  if (!apiKey) return { object: "list", data: [] };
  try {
    const response = await fetcher(joinUrl(config.geminiUpstreamUrl || DEFAULT_GEMINI_URL, "/v1beta/models"), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      }
    });
    if (!response.ok) return { object: "list", data: FALLBACK_GEMINI_MODELS };
    const body = await response.json();
    return { object: "list", data: cleanModels(body.models, "google") };
  } catch {
    return { object: "list", data: FALLBACK_GEMINI_MODELS };
  }
}
__name(getGeminiModels, "getGeminiModels");
async function getAnthropicModels(request, config, fetcher = fetch) {
  const apiKey = request.headers.get("X-Anthropic-API-Key") || selectWeightedKey(config.anthropicApiKey);
  if (!apiKey) return { object: "list", data: [] };
  try {
    const response = await fetcher(joinUrl(config.anthropicUpstreamUrl || DEFAULT_ANTHROPIC_URL, "/v1/models"), {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json"
      }
    });
    if (!response.ok) return { object: "list", data: FALLBACK_ANTHROPIC_MODELS };
    const body = await response.json();
    return { object: "list", data: cleanModels(body.models || body.data, "anthropic") };
  } catch {
    return { object: "list", data: FALLBACK_ANTHROPIC_MODELS };
  }
}
__name(getAnthropicModels, "getAnthropicModels");
async function handleModelsRequest(request, config, fetcher = fetch) {
  const lists = await Promise.all([
    getOpenAIModels(request, config, fetcher),
    config.geminiEnabled ? getGeminiModels(request, config, fetcher) : { object: "list", data: [] },
    config.anthropicEnabled ? getAnthropicModels(request, config, fetcher) : { object: "list", data: [] }
  ]);
  const seen = /* @__PURE__ */ new Set();
  const data = [];
  for (const list of lists) {
    for (const item of list.data || []) {
      if (!item.id || seen.has(item.id)) continue;
      seen.add(item.id);
      data.push(item);
    }
  }
  data.sort((left, right) => left.id.localeCompare(right.id));
  return addCorsHeaders(jsonResponse({ object: "list", data }));
}
__name(handleModelsRequest, "handleModelsRequest");

// src/providers/anthropic.js
var FINISH_REASONS = {
  end_turn: "stop",
  stop_sequence: "stop",
  max_tokens: "length",
  tool_use: "tool_calls"
};
function sseDataFromLine(line) {
  if (!line.startsWith("data:")) return null;
  return line.slice(5).trim();
}
__name(sseDataFromLine, "sseDataFromLine");
function normalizeFinishReason(reason) {
  return FINISH_REASONS[reason] || reason || "stop";
}
__name(normalizeFinishReason, "normalizeFinishReason");
function openAICompletionChunk({ model: model2 = "claude-3", content = "", finishReason = null }) {
  return {
    id: `anthropic-${Date.now()}`,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1e3),
    model: model2,
    choices: [
      {
        index: 0,
        delta: content ? { content } : {},
        finish_reason: finishReason
      }
    ]
  };
}
__name(openAICompletionChunk, "openAICompletionChunk");
var anthropicProvider = {
  id: "anthropic",
  detect(modelName, config = {}) {
    return !!config.anthropicEnabled && String(modelName || "").toLowerCase().startsWith("claude-");
  },
  createRequest({ request, requestBody, config }) {
    const apiKey = request.headers.get("X-Anthropic-API-Key") || selectWeightedKey(config.anthropicApiKey);
    const prompt = (requestBody.messages || []).map((message) => `${message.role === "assistant" ? "Assistant" : "Human"}: ${message.content || ""}`).join("\n\n");
    return {
      method: "POST",
      headers: new Headers({
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json"
      }),
      body: JSON.stringify({
        model: String(requestBody.model || ""),
        prompt: `

${prompt}

Assistant:`,
        max_tokens_to_sample: requestBody.max_tokens || 4e3,
        temperature: requestBody.temperature || 0.7,
        stream: requestBody.stream
      }),
      url: joinUrl(config.anthropicUpstreamUrl || DEFAULT_ANTHROPIC_URL, "/v1/complete"),
      useNativeFetch: config.anthropicUseNativeFetch
    };
  },
  convertResponseBody(body) {
    if (body.error) return body;
    let content = "";
    if (Array.isArray(body.content)) {
      content = body.content.filter((block) => block.type === "text").map((block) => block.text || "").join("");
    } else {
      content = body.completion || body.text || "";
    }
    const promptTokens = body.usage?.input_tokens || 0;
    const completionTokens = body.usage?.output_tokens || 0;
    return {
      id: `anthropic-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1e3),
      model: body.model || "claude-3",
      choices: [
        {
          index: 0,
          message: { role: "assistant", content },
          finish_reason: normalizeFinishReason(body.stop_reason)
        }
      ],
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens
      }
    };
  },
  convertStreamLine(line) {
    const data = sseDataFromLine(line);
    if (data === null) return [];
    if (!data || data === "[DONE]") return [];
    const body = JSON.parse(data);
    if (body.error) return [body];
    if (body.type === "content_block_delta" && body.delta?.text) {
      return [openAICompletionChunk({ content: body.delta.text })];
    }
    if (body.type === "completion") {
      const chunks = [];
      if (body.completion) chunks.push(openAICompletionChunk({ content: body.completion }));
      if (body.stop_reason) {
        chunks.push(openAICompletionChunk({ finishReason: normalizeFinishReason(body.stop_reason) }));
      }
      return chunks;
    }
    if (body.type === "message_delta" && body.delta?.stop_reason) {
      return [openAICompletionChunk({ finishReason: normalizeFinishReason(body.delta.stop_reason) })];
    }
    if (body.type === "message_stop") {
      return [openAICompletionChunk({ finishReason: "stop" })];
    }
    return [];
  }
};

// src/providers/gemini.js
var FINISH_REASONS2 = {
  STOP: "stop",
  MAX_TOKENS: "length",
  SAFETY: "content_filter",
  RECITATION: "content_filter",
  PROHIBITED_CONTENT: "content_filter",
  SPII: "content_filter"
};
function sseDataFromLine2(line) {
  if (!line.startsWith("data:")) return null;
  return line.slice(5).trim();
}
__name(sseDataFromLine2, "sseDataFromLine");
function extractTextFromParts(parts = []) {
  return parts.filter((part) => part && typeof part.text === "string").map((part) => part.text).join("");
}
__name(extractTextFromParts, "extractTextFromParts");
function normalizeGeminiModel(modelName = "gemini-pro") {
  let model2 = String(modelName || "gemini-pro");
  if (!model2.startsWith("gemini-") && !model2.startsWith("models/")) model2 = `gemini-${model2}`;
  if (!model2.startsWith("models/")) model2 = `models/${model2}`;
  return model2;
}
__name(normalizeGeminiModel, "normalizeGeminiModel");
function openAICompletionChunk2({ model: model2, index = 0, content = "", finishReason = null }) {
  return {
    id: `chatcmpl-${Date.now()}`,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1e3),
    model: model2,
    choices: [
      {
        index,
        delta: content ? { content } : {},
        finish_reason: finishReason
      }
    ]
  };
}
__name(openAICompletionChunk2, "openAICompletionChunk");
var geminiProvider = {
  id: "gemini",
  detect(modelName, config = {}) {
    return !!config.geminiEnabled && String(modelName || "").toLowerCase().startsWith("gemini-");
  },
  createRequest({ request, requestBody, config }) {
    const apiKey = request.headers.get("X-Gemini-API-Key") || selectWeightedKey(config.geminiApiKey);
    const modelName = normalizeGeminiModel(requestBody.model);
    const isStreamRequest = requestBody.stream === true;
    const task = isStreamRequest ? "streamGenerateContent" : "generateContent";
    let url = joinUrl(config.geminiUpstreamUrl || DEFAULT_GEMINI_URL, `/v1beta/${modelName}:${task}`);
    if (isStreamRequest) url += "?alt=sse";
    let systemInstruction = null;
    const contents = [];
    for (const message of requestBody.messages || []) {
      if (message.role === "system") {
        systemInstruction = { parts: [{ text: String(message.content || "") }] };
      } else {
        contents.push({
          role: message.role === "assistant" ? "model" : "user",
          parts: [{ text: String(message.content || "") }]
        });
      }
    }
    if (contents.length === 0) contents.push({ role: "user", parts: [{ text: "Hello" }] });
    const body = {
      contents,
      generationConfig: {
        temperature: requestBody.temperature ?? 1,
        maxOutputTokens: requestBody.max_tokens ?? 8192,
        topP: requestBody.top_p ?? 0.95,
        topK: requestBody.top_k ?? 40
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "OFF" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "OFF" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "OFF" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "OFF" },
        { category: "HARM_CATEGORY_CIVIC_INTEGRITY", threshold: "BLOCK_NONE" }
      ]
    };
    if (systemInstruction) body.systemInstruction = systemInstruction;
    return {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
        "x-goog-api-client": "llm-stream-optimizer/1.0"
      },
      body: JSON.stringify(body),
      url,
      useNativeFetch: config.geminiUseNativeFetch
    };
  },
  convertResponseBody(body) {
    if (body.error) return body;
    const candidate = body.candidates?.[0];
    const content = candidate?.content?.parts ? extractTextFromParts(candidate.content.parts) : candidate?.text || body.text || "";
    const promptTokens = body.usageMetadata?.promptTokenCount || 0;
    const completionTokens = body.usageMetadata?.candidatesTokenCount || 0;
    return {
      id: `gemini-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1e3),
      model: body.modelId || candidate?.modelId || "gemini",
      choices: [
        {
          index: 0,
          message: { role: "assistant", content },
          finish_reason: FINISH_REASONS2[candidate?.finishReason] || candidate?.finishReason || "stop"
        }
      ],
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens
      }
    };
  },
  convertStreamLine(line) {
    const data = sseDataFromLine2(line);
    if (data === null) return [];
    if (!data || data === "[DONE]") return [];
    const body = JSON.parse(data);
    if (body.error) return [body];
    const chunks = [];
    for (const candidate of body.candidates || []) {
      const model2 = body.modelId || candidate.modelId || "gemini";
      const content = candidate.content?.parts ? extractTextFromParts(candidate.content.parts) : candidate.content?.text || candidate.text || "";
      if (content) chunks.push(openAICompletionChunk2({ model: model2, index: candidate.index || 0, content }));
      if (candidate.finishReason) {
        chunks.push(
          openAICompletionChunk2({
            model: model2,
            index: candidate.index || 0,
            finishReason: FINISH_REASONS2[candidate.finishReason] || candidate.finishReason
          })
        );
      }
    }
    return chunks;
  }
};

// src/providers/openai.js
function sseDataFromLine3(line) {
  if (!line.startsWith("data:")) return null;
  return line.slice(5).trim();
}
__name(sseDataFromLine3, "sseDataFromLine");
var openAIProvider = {
  id: "openai",
  detect() {
    return true;
  },
  createRequest({ request, requestBody, route }) {
    const headers = copyForwardHeaders(request.headers);
    if (route.apiKey) headers.set("Authorization", `Bearer ${route.apiKey}`);
    if (requestBody?.model) headers.set("x-model-name", String(requestBody.model));
    headers.set("Content-Type", "application/json");
    return {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
      url: joinUrl(route.url, "/chat/completions"),
      useNativeFetch: route.useNativeFetch
    };
  },
  convertResponseBody(body) {
    return body;
  },
  convertStreamLine(line) {
    const data = sseDataFromLine3(line);
    if (data === null) return [];
    if (!data || data === "[DONE]") return [];
    return [JSON.parse(data)];
  }
};

// src/providers/index.js
function selectProvider(modelName, config = {}) {
  if (anthropicProvider.detect(modelName, config)) return anthropicProvider;
  if (geminiProvider.detect(modelName, config)) return geminiProvider;
  return openAIProvider;
}
__name(selectProvider, "selectProvider");

// src/stream.js
var encoder3 = new TextEncoder();
var decoder2 = new TextDecoder();
function defaultSleep(ms) {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}
__name(defaultSleep, "defaultSleep");
function numberOrDefault(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
__name(numberOrDefault, "numberOrDefault");
function splitTextByCodePoint(text) {
  return Array.from(String(text || ""));
}
__name(splitTextByCodePoint, "splitTextByCodePoint");
function shouldDisableOptimization(modelName, disabledModels = []) {
  const current = String(modelName || "").toLowerCase().trim();
  if (!current || !Array.isArray(disabledModels)) return false;
  return disabledModels.some((model2) => {
    const candidate = String(model2 || "").toLowerCase().trim();
    return candidate && (current === candidate || current.includes(candidate));
  });
}
__name(shouldDisableOptimization, "shouldDisableOptimization");
function sseDataFromLine4(line) {
  if (!line.startsWith("data:")) return null;
  return line.slice(5).trim();
}
__name(sseDataFromLine4, "sseDataFromLine");
function contentFromChunk(chunk) {
  const choice = chunk.choices?.[0];
  if (!choice) return { content: "", isCompletion: false };
  if (choice.delta && typeof choice.delta.content === "string") {
    return { content: choice.delta.content, isCompletion: false };
  }
  if (typeof choice.text === "string") return { content: choice.text, isCompletion: true };
  return { content: "", isCompletion: false };
}
__name(contentFromChunk, "contentFromChunk");
function chunkWithContent(chunk, content, isCompletion) {
  const choice = chunk.choices[0];
  if (isCompletion) {
    return {
      ...chunk,
      choices: [{ ...choice, text: content }]
    };
  }
  return {
    ...chunk,
    choices: [{ ...choice, delta: { ...choice.delta || {}, content } }]
  };
}
__name(chunkWithContent, "chunkWithContent");
function splitChunk(chunk) {
  const { content, isCompletion } = contentFromChunk(chunk);
  if (!content) return [chunk];
  return splitTextByCodePoint(content).map((char) => chunkWithContent(chunk, char, isCompletion));
}
__name(splitChunk, "splitChunk");
function hasFinishReason(chunk) {
  const choice = chunk.choices?.[0];
  return !!(choice?.finish_reason || choice?.delta?.finish_reason || choice?.stop_reason || choice?.finishReason);
}
__name(hasFinishReason, "hasFinishReason");
function eventForChunk(chunk) {
  return `data: ${JSON.stringify(chunk)}

`;
}
__name(eventForChunk, "eventForChunk");
async function writeEvent(event, writer) {
  if (writer) await writer.write(encoder3.encode(event));
  return event;
}
__name(writeEvent, "writeEvent");
function splitLines(text) {
  return String(text).split(/\r\n|\n|\r/);
}
__name(splitLines, "splitLines");
function takeCompleteLines(buffer, flush = false) {
  const lines = [];
  let start = 0;
  for (let i = 0; i < buffer.length; i++) {
    const char = buffer[i];
    if (char !== "\r" && char !== "\n") continue;
    if (char === "\r" && i === buffer.length - 1 && !flush) break;
    lines.push(buffer.slice(start, i));
    if (char === "\r" && buffer[i + 1] === "\n") i++;
    start = i + 1;
  }
  return { lines, buffer: buffer.slice(start) };
}
__name(takeCompleteLines, "takeCompleteLines");
function calculateAdaptiveDelay(chunkSize, timeSinceLastChunk, config, isStreamEnding) {
  const minDelay = Math.max(0, numberOrDefault(config.minDelay, 5));
  const maxDelay = Math.max(minDelay, numberOrDefault(config.maxDelay, 40));
  const finalLowDelay = Math.max(0, numberOrDefault(config.finalLowDelay, minDelay));
  if (isStreamEnding) return finalLowDelay;
  if (chunkSize <= 0) return minDelay;
  const adaptiveDelayFactor = Math.max(0, Math.min(2, numberOrDefault(config.adaptiveDelayFactor, 0.5)));
  const sizeInverseFactor = 1 + Math.log(1 + Math.min(chunkSize, 200)) / Math.log(20);
  const normalizedSizeFactor = 1 / Math.max(0.5, Math.min(2, sizeInverseFactor));
  const normalizedTime = Math.min(2e3, Math.max(50, timeSinceLastChunk));
  const timeFactor = Math.sqrt(normalizedTime / 300);
  const adaptiveDelay = minDelay + (maxDelay - minDelay) * normalizedSizeFactor * timeFactor * adaptiveDelayFactor;
  return Math.min(maxDelay, Math.max(minDelay, adaptiveDelay));
}
__name(calculateAdaptiveDelay, "calculateAdaptiveDelay");
function updateStreamDelayState(state, chunkSize, config, now) {
  const chunkBufferSize = Math.max(1, numberOrDefault(config.chunkBufferSize, 10));
  const threshold = Math.max(0, numberOrDefault(config.minContentLengthForFastOutput, 0));
  const fastOutputDelay = Math.max(0, numberOrDefault(config.fastOutputDelay, state.currentDelay));
  const currentTime = now();
  const timeSinceLastChunk = Math.max(0, currentTime - state.lastChunkTime);
  state.lastChunkTime = currentTime;
  state.recentChunkSizes.push(chunkSize);
  if (state.recentChunkSizes.length > chunkBufferSize) state.recentChunkSizes.shift();
  state.maxSingleChunkSize = Math.max(state.maxSingleChunkSize, chunkSize);
  if (threshold && state.maxSingleChunkSize > threshold) state.fastOutputMode = true;
  if (state.fastOutputMode) {
    state.currentDelay = fastOutputDelay;
    return;
  }
  const averageChunkSize = state.recentChunkSizes.reduce((sum, size) => sum + size, 0) / state.recentChunkSizes.length;
  state.currentDelay = calculateAdaptiveDelay(averageChunkSize, timeSinceLastChunk, config, state.isStreamEnding);
}
__name(updateStreamDelayState, "updateStreamDelayState");
function createSSETransformer({ provider, config = {}, sleep = defaultSleep, now = /* @__PURE__ */ __name(() => Date.now(), "now") }) {
  const minDelay = Math.max(0, numberOrDefault(config.minDelay, 0));
  const finalLowDelay = Math.max(0, numberOrDefault(config.finalLowDelay, minDelay));
  async function processLine(line, state, writer = null) {
    const trimmed = line.trim();
    if (!trimmed) return "";
    if (sseDataFromLine4(trimmed) === "[DONE]") {
      state.done = true;
      if (state.doneEmitted) return "";
      state.doneEmitted = true;
      return writeEvent("data: [DONE]\n\n", writer);
    }
    let chunks;
    try {
      chunks = provider.convertStreamLine(trimmed) || [];
    } catch {
      return writeEvent(`${trimmed}

`, writer);
    }
    let output = "";
    for (const chunk of chunks) {
      const isFinishChunk = hasFinishReason(chunk);
      if (isFinishChunk) state.isStreamEnding = true;
      const pieces = isFinishChunk ? [chunk] : splitChunk(chunk);
      for (let i = 0; i < pieces.length; i++) {
        const event = eventForChunk(pieces[i]);
        if (writer) await writer.write(encoder3.encode(event));
        output += event;
        const delay = isFinishChunk ? finalLowDelay : state.currentDelay ?? minDelay;
        if (writer && delay > 0 && (i < pieces.length - 1 || isFinishChunk)) await sleep(delay);
      }
      if (isFinishChunk) state.done = true;
    }
    return output;
  }
  __name(processLine, "processLine");
  async function transformText(text) {
    const state = { done: false, doneEmitted: false };
    const lines = splitLines(text);
    let output = "";
    for (const line of lines) {
      output += await processLine(line, state);
    }
    if (!state.doneEmitted) output += "data: [DONE]\n\n";
    return output;
  }
  __name(transformText, "transformText");
  function transformStream(inputStream) {
    const state = {
      done: false,
      doneEmitted: false,
      isStreamEnding: false,
      currentDelay: minDelay,
      fastOutputMode: false,
      lastChunkTime: now(),
      maxSingleChunkSize: 0,
      recentChunkSizes: []
    };
    return new ReadableStream({
      async start(controller) {
        const reader = inputStream.getReader();
        const writer = {
          write: /* @__PURE__ */ __name((chunk) => {
            controller.enqueue(chunk);
            return Promise.resolve();
          }, "write")
        };
        let buffer = "";
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            updateStreamDelayState(state, value.length, config, now);
            buffer += decoder2.decode(value, { stream: true });
            const result2 = takeCompleteLines(buffer);
            buffer = result2.buffer;
            const { lines } = result2;
            for (const line of lines) {
              await processLine(line, state, writer);
            }
          }
          buffer += decoder2.decode();
          const result = takeCompleteLines(buffer, true);
          buffer = result.buffer;
          for (const line of result.lines) {
            await processLine(line, state, writer);
          }
          if (buffer.trim()) await processLine(buffer, state, writer);
          if (!state.doneEmitted) controller.enqueue(encoder3.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          controller.error(error);
        } finally {
          reader.releaseLock();
        }
      }
    });
  }
  __name(transformStream, "transformStream");
  return { transformText, transformStream };
}
__name(createSSETransformer, "createSSETransformer");

// src/proxy.js
function validateProxyApiKey(request, config) {
  if (!config.proxyApiKey) return true;
  const path = new URL(request.url).pathname;
  const authHeader = request.headers.get("Authorization") || "";
  const apiKey = authHeader.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || "";
  if (isModelsPath(path) && apiKey !== config.proxyApiKey) return true;
  return apiKey === config.proxyApiKey;
}
__name(validateProxyApiKey, "validateProxyApiKey");
async function sendUpstreamRequest(upstreamRequest, fetcher, logger) {
  if (upstreamRequest.useNativeFetch && !upstreamRequest.forceStandardFetch) {
    try {
      return await nativeFetch(upstreamRequest, upstreamRequest.url);
    } catch (error) {
      logger.warn("nativeFetch failed, falling back to standard fetch", { message: error.message });
    }
  }
  try {
    return await fetcher(upstreamRequest.url, {
      method: upstreamRequest.method || "POST",
      headers: upstreamRequest.headers,
      body: upstreamRequest.body
    });
  } catch (error) {
    logger.warn("standard fetch failed, retrying with nativeFetch", { message: error.message });
    return nativeFetch(upstreamRequest, upstreamRequest.url);
  }
}
__name(sendUpstreamRequest, "sendUpstreamRequest");
function modelNameFromResponse(response, fallback) {
  return response.headers.get("x-model-name") || response.headers.get("x-model") || fallback || "unknown";
}
__name(modelNameFromResponse, "modelNameFromResponse");
function streamResponse(upstreamResponse, provider, config, requestBody) {
  const modelName = modelNameFromResponse(upstreamResponse, requestBody.model);
  if (shouldDisableOptimization(modelName, config.disableOptimizationModels)) {
    return addCorsHeaders(upstreamResponse);
  }
  const transformer = createSSETransformer({ provider, config });
  const headers = new Headers(upstreamResponse.headers);
  headers.set("Content-Type", "text/event-stream");
  headers.set("Cache-Control", "no-cache");
  headers.set("Connection", "keep-alive");
  return addCorsHeaders(
    new Response(transformer.transformStream(upstreamResponse.body), {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers
    })
  );
}
__name(streamResponse, "streamResponse");
function modelError(modelName, restrictedModels) {
  return jsonResponse(
    {
      error: {
        message: `Model ${modelName} is not in the selected endpoint model allowlist.`,
        type: "invalid_request_error",
        param: "model",
        code: 400,
        allowed_models: restrictedModels
      }
    },
    { status: 400 }
  );
}
__name(modelError, "modelError");
async function handleProxyRequest(request, config, options = {}) {
  const fetcher = options.fetcher || fetch;
  const logger = options.logger || createLogger(config.debugLogging);
  if (request.method === "OPTIONS") return corsPreflight();
  try {
    const url = new URL(request.url);
    if (!validateProxyApiKey(request, config)) {
      return jsonResponse(
        {
          error: {
            message: "Invalid API key or missing authentication",
            type: "auth_error",
            code: 401
          }
        },
        { status: 401 }
      );
    }
    if (isModelsPath(url.pathname)) {
      return handleModelsRequest(request, config, fetcher);
    }
    const requestBody = await parseJsonBody(request);
    const provider = selectProvider(requestBody.model, config);
    let upstreamRequest;
    if (provider.id === "openai") {
      const route = selectOpenAIEndpoint({ request, requestBody, config });
      if (!isModelAllowed(requestBody.model, route.restrictedModels)) {
        return modelError(requestBody.model, route.restrictedModels);
      }
      upstreamRequest = provider.createRequest({ request, requestBody, route, config });
    } else {
      upstreamRequest = provider.createRequest({ request, requestBody, config });
    }
    const upstreamResponse = await sendUpstreamRequest(upstreamRequest, fetcher, logger);
    const isStreamRequest = requestBody.stream === true;
    if (!isStreamRequest || !upstreamResponse.ok) {
      if (provider.id !== "openai" && upstreamResponse.ok) {
        const body = await upstreamResponse.json();
        return jsonResponse(provider.convertResponseBody(body), { status: upstreamResponse.status });
      }
      return addCorsHeaders(upstreamResponse);
    }
    const headers = new Headers(upstreamResponse.headers);
    if (requestBody.model) headers.set("x-model-name", String(requestBody.model));
    return streamResponse(
      new Response(upstreamResponse.body, {
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        headers
      }),
      provider,
      config,
      requestBody
    );
  } catch (error) {
    logger.error("Proxy request failed", { message: error.message });
    return errorResponse(error, error.message === "Invalid JSON body" ? 400 : 500);
  }
}
__name(handleProxyRequest, "handleProxyRequest");

// src/worker.js
var worker_default = {
  async fetch(request, env = {}) {
    const url = new URL(request.url);
    if (url.pathname === "/" || url.pathname === "") {
      return Response.redirect(`${url.origin}/admin`, 302);
    }
    if (url.pathname.startsWith("/admin")) {
      return handleAdminRequest(request, env);
    }
    const config = await loadConfig(env);
    const logger = createLogger(config.debugLogging);
    return handleProxyRequest(request, config, { logger });
  }
};
export {
  worker_default as default
};
