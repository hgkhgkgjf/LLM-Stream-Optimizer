import { DEFAULT_ANTHROPIC_URL, DEFAULT_GEMINI_URL } from "./constants.js";
import { addCorsHeaders, joinUrl, jsonResponse } from "./http.js";
import { nativeFetch } from "./native-fetch.js";
import { selectOpenAIEndpoint, selectWeightedKey } from "./routing.js";

function model(id, ownedBy) {
  return {
    id,
    object: "model",
    created: Math.floor(Date.now() / 1000),
    owned_by: ownedBy,
  };
}

const FALLBACK_GEMINI_MODELS = [
  "gemini-2.0-flash",
  "gemini-2.5-pro-exp-03-25",
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash-thinking-exp",
  "gemini-1.5-pro",
  "gemini-1.5-flash",
].map((id) => model(id, "google"));

const FALLBACK_ANTHROPIC_MODELS = [
  "claude-3-7-sonnet-20250219",
  "claude-3-5-sonnet-20241022",
  "claude-3-5-haiku-20241022",
  "claude-3-5-sonnet-20240620",
  "claude-3-opus-20240229",
].map((id) => model(id, "anthropic"));

async function sendModelRequest(upstreamRequest, fetcher) {
  if (upstreamRequest.useNativeFetch) {
    try {
      return await nativeFetch(upstreamRequest, upstreamRequest.url);
    } catch {
      return fetcher(upstreamRequest.url, {
        method: upstreamRequest.method,
        headers: upstreamRequest.headers,
      });
    }
  }
  return fetcher(upstreamRequest.url, {
    method: upstreamRequest.method,
    headers: upstreamRequest.headers,
  });
}

function cleanModels(data, owner) {
  return (Array.isArray(data) ? data : []).map((item) => model(item.id || item.name?.replace(/^models\//, ""), owner));
}

export async function getOpenAIModels(request, config, fetcher = fetch) {
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
              "Content-Type": "application/json",
            }),
            url: joinUrl(endpoint.url, "/models"),
            useNativeFetch: endpoint.useNativeFetch !== undefined ? endpoint.useNativeFetch : true,
          },
          fetcher,
        );
        if (response.ok) {
          const body = await response.json();
          allModels.push(...cleanModels(body.data, "openai"));
        }
      } catch {
        // Model listing is best effort.
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
          "Content-Type": "application/json",
        }),
        url: joinUrl(route.url, "/models"),
        useNativeFetch: route.useNativeFetch,
      },
      fetcher,
    );
    if (!response.ok) return { object: "list", data: [] };
    const body = await response.json();
    return { object: "list", data: cleanModels(body.data, "openai") };
  } catch {
    return { object: "list", data: [] };
  }
}

export async function getGeminiModels(request, config, fetcher = fetch) {
  const apiKey = request.headers.get("X-Gemini-API-Key") || selectWeightedKey(config.geminiApiKey);
  if (!apiKey) return { object: "list", data: [] };
  try {
    const response = await fetcher(joinUrl(config.geminiUpstreamUrl || DEFAULT_GEMINI_URL, "/v1beta/models"), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
    });
    if (!response.ok) return { object: "list", data: FALLBACK_GEMINI_MODELS };
    const body = await response.json();
    return { object: "list", data: cleanModels(body.models, "google") };
  } catch {
    return { object: "list", data: FALLBACK_GEMINI_MODELS };
  }
}

export async function getAnthropicModels(request, config, fetcher = fetch) {
  const apiKey = request.headers.get("X-Anthropic-API-Key") || selectWeightedKey(config.anthropicApiKey);
  if (!apiKey) return { object: "list", data: [] };
  try {
    const response = await fetcher(joinUrl(config.anthropicUpstreamUrl || DEFAULT_ANTHROPIC_URL, "/v1/models"), {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) return { object: "list", data: FALLBACK_ANTHROPIC_MODELS };
    const body = await response.json();
    return { object: "list", data: cleanModels(body.models || body.data, "anthropic") };
  } catch {
    return { object: "list", data: FALLBACK_ANTHROPIC_MODELS };
  }
}

export async function handleModelsRequest(request, config, fetcher = fetch) {
  const lists = await Promise.all([
    getOpenAIModels(request, config, fetcher),
    config.geminiEnabled ? getGeminiModels(request, config, fetcher) : { object: "list", data: [] },
    config.anthropicEnabled ? getAnthropicModels(request, config, fetcher) : { object: "list", data: [] },
  ]);
  const seen = new Set();
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
