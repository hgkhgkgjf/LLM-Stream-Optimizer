import {
  DEFAULT_ANTHROPIC_URL,
  DEFAULT_CONFIG,
  DEFAULT_GEMINI_URL,
  DEFAULT_OPENAI_URL,
  KV_CONFIG_KEYS,
} from "./constants.js";

function uuid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function parseJsonArray(value, fallback = []) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return value === true || String(value).toLowerCase() === "true";
}

function parsePositiveInt(value, fallback, min = 1) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, parsed);
}

function parseNumber(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getDefaultConfig(env = {}) {
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
    debugLogging: env.DEBUG_LOGGING === "true",
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
        useNativeFetch: true,
      },
    ];
  }

  return config;
}

export async function loadConfig(env = {}) {
  if (!env.CONFIG_KV) return getDefaultConfig(env);

  const config = getDefaultConfig(env);
  const entries = await Promise.all(
    Object.entries(KV_CONFIG_KEYS).map(async ([name, key]) => [name, await env.CONFIG_KV.get(key)]),
  );

  for (const [name, value] of entries) {
    if (value === null || value === undefined) continue;
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

export function normalizeConfigInput(input = {}) {
  const output = {};
  const intFields = [
    "minDelay",
    "maxDelay",
    "chunkBufferSize",
    "minContentLengthForFastOutput",
    "fastOutputDelay",
    "finalLowDelay",
  ];
  for (const field of intFields) {
    const parsed = parsePositiveInt(input[field], undefined, field === "minDelay" ? 1 : 0);
    if (parsed !== undefined) output[field] = parsed;
  }
  const adaptiveDelayFactor = parseNumber(input.adaptiveDelayFactor, undefined);
  if (adaptiveDelayFactor !== undefined) output.adaptiveDelayFactor = adaptiveDelayFactor;
  if (Array.isArray(input.disableOptimizationModels)) {
    output.disableOptimizationModels = input.disableOptimizationModels
      .filter((model) => typeof model === "string")
      .map((model) => model.trim())
      .filter(Boolean);
  }
  for (const field of [
    "defaultUpstreamUrl",
    "defaultOutgoingApiKey",
    "geminiUpstreamUrl",
    "geminiApiKey",
    "anthropicUpstreamUrl",
    "anthropicApiKey",
    "proxyApiKey",
  ]) {
    if (Object.hasOwn(input, field)) output[field] = String(input[field] || "").trim();
  }
  for (const field of ["geminiUseNativeFetch", "anthropicUseNativeFetch"]) {
    if (Object.hasOwn(input, field)) output[field] = !!input[field];
  }
  if (Array.isArray(input.openaiEndpoints)) {
    output.openaiEndpoints = input.openaiEndpoints
      .map((endpoint) => ({
        id: endpoint.id || uuid(),
        name: String(endpoint.name || "").trim(),
        url: String(endpoint.url || "").trim(),
        apiKey: String(endpoint.apiKey || "").trim(),
        models: Array.isArray(endpoint.models)
          ? endpoint.models.map((model) => String(model).trim()).filter(Boolean)
          : [],
        useNativeFetch: endpoint.useNativeFetch !== undefined ? !!endpoint.useNativeFetch : true,
      }))
      .filter((endpoint) => endpoint.url || endpoint.apiKey || endpoint.name || endpoint.models.length);
  }
  return output;
}

export function isMaskedSecret(value) {
  return typeof value === "string" && value.includes("*");
}

function resolveSecret(field, next, current) {
  if (!Object.hasOwn(next, field)) return current[field] || "";
  const value = next[field];
  if (isMaskedSecret(value)) return current[field] || "";
  return value || "";
}

export function applyMaskedSecrets(input = {}, current = {}) {
  const next = { ...current, ...input };
  for (const field of ["defaultOutgoingApiKey", "geminiApiKey", "anthropicApiKey", "proxyApiKey"]) {
    next[field] = resolveSecret(field, input, current);
  }
  next.defaultEnabled = !!next.defaultOutgoingApiKey;
  next.geminiEnabled = !!next.geminiApiKey;
  next.anthropicEnabled = !!next.anthropicApiKey;

  if (Array.isArray(input.openaiEndpoints)) {
    next.openaiEndpoints = input.openaiEndpoints
      .map((endpoint) => {
        const existing =
          current.openaiEndpoints?.find((item) => endpoint.id && item.id === endpoint.id) ||
          current.openaiEndpoints?.find((item) => item.name === endpoint.name && item.url === endpoint.url);
        return {
          ...endpoint,
          apiKey: isMaskedSecret(endpoint.apiKey) ? existing?.apiKey || "" : endpoint.apiKey || "",
        };
      })
      .filter((endpoint) => endpoint.url && endpoint.apiKey);
  }

  return next;
}

export function maskAPIKey(apiKey) {
  if (!apiKey) return "";
  if (apiKey.includes(",")) {
    return apiKey
      .split(",")
      .map((key) => maskAPIKey(key.trim()))
      .join(", ");
  }
  if (apiKey.length <= 8) return apiKey;
  const visibleChars = Math.min(4, Math.floor(apiKey.length / 4));
  return `${apiKey.slice(0, visibleChars)}${"*".repeat(apiKey.length - visibleChars * 2)}${apiKey.slice(
    -visibleChars,
  )}`;
}

export function safeConfig(config) {
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
      useNativeFetch: endpoint.useNativeFetch !== undefined ? endpoint.useNativeFetch : true,
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
    finalLowDelay: config.finalLowDelay,
  };
}

export async function saveConfig(env, config) {
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
    [KV_CONFIG_KEYS.FINAL_LOW_DELAY, String(config.finalLowDelay)],
  ];
  await Promise.all(entries.map(([key, value]) => env.CONFIG_KV.put(key, value)));
  return { success: true, message: "Configuration saved." };
}
