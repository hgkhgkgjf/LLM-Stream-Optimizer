import { DEFAULT_OPENAI_URL } from "./constants.js";

export function selectWeightedKey(keys, random = Math.random) {
  const candidates = String(keys || "")
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);
  if (candidates.length === 0) return "";
  const index = Math.min(candidates.length - 1, Math.floor(random() * candidates.length));
  return candidates[index];
}

export function modelMatches(modelName, models = []) {
  const normalized = String(modelName || "").toLowerCase().trim();
  if (!normalized || !Array.isArray(models) || models.length === 0) return false;
  return models.some((model) => String(model).toLowerCase().trim() === normalized);
}

export function modelPartiallyMatches(modelName, models = []) {
  const normalized = String(modelName || "").toLowerCase().trim();
  if (!normalized || !Array.isArray(models) || models.length === 0) return false;
  return models.some((model) => {
    const candidate = String(model).toLowerCase().trim();
    return candidate && (normalized.includes(candidate) || candidate.includes(normalized));
  });
}

function bearerFromRequest(request) {
  const authHeader = request.headers.get("Authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

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

export function selectOpenAIEndpoint({ request, requestBody = {}, config = {}, random = Math.random }) {
  const customUrl = request.headers.get("X-Upstream-URL");
  const customKey = request.headers.get("X-Outgoing-API-Key");
  if (customUrl) {
    return {
      endpoint: null,
      matchType: "custom",
      url: customUrl,
      apiKey: customKey || selectWeightedKey(config.defaultOutgoingApiKey, random) || bearerFromRequest(request),
      useNativeFetch: true,
      restrictedModels: null,
    };
  }

  const endpoints = Array.isArray(config.openaiEndpoints) ? config.openaiEndpoints : [];
  const modelName = requestBody.model;
  const ranked = endpoints
    .map((endpoint, index) => rankEndpoint(endpoint, modelName, index))
    .filter(Boolean)
    .sort((left, right) => left.priority - right.priority || left.index - right.index);
  const selected = ranked[0];

  if (selected) {
    const endpoint = selected.endpoint;
    return {
      endpoint,
      matchType: selected.matchType,
      url: endpoint.url,
      apiKey: customKey || selectWeightedKey(endpoint.apiKey, random),
      useNativeFetch: endpoint.useNativeFetch !== undefined ? endpoint.useNativeFetch : true,
      restrictedModels: endpoint.models && endpoint.models.length > 0 ? endpoint.models : null,
    };
  }

  return {
    endpoint: null,
    matchType: "default",
    url: config.defaultUpstreamUrl || DEFAULT_OPENAI_URL,
    apiKey: customKey || selectWeightedKey(config.defaultOutgoingApiKey, random) || bearerFromRequest(request),
    useNativeFetch: true,
    restrictedModels: null,
  };
}

export function isModelAllowed(modelName, restrictedModels) {
  if (!restrictedModels || restrictedModels.length === 0) return true;
  return modelMatches(modelName, restrictedModels) || modelPartiallyMatches(modelName, restrictedModels);
}
