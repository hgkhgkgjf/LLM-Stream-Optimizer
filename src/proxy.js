import { addCorsHeaders, corsPreflight, errorResponse, isModelsPath, jsonResponse, parseJsonBody } from "./http.js";
import { createLogger } from "./logger.js";
import { handleModelsRequest } from "./models.js";
import { nativeFetch } from "./native-fetch.js";
import { selectProvider } from "./providers/index.js";
import { isModelAllowed, selectOpenAIEndpoint } from "./routing.js";
import { createSSETransformer, shouldOptimizeModel } from "./stream.js";

function validateProxyApiKey(request, config) {
  if (!config.proxyApiKey) return true;
  const path = new URL(request.url).pathname;
  const authHeader = request.headers.get("Authorization") || "";
  const apiKey = authHeader.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || "";
  if (isModelsPath(path) && apiKey !== config.proxyApiKey) return true;
  return apiKey === config.proxyApiKey;
}

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
      body: upstreamRequest.body,
    });
  } catch (error) {
    logger.warn("standard fetch failed, retrying with nativeFetch", { message: error.message });
    return nativeFetch(upstreamRequest, upstreamRequest.url);
  }
}

function modelNameFromResponse(response, fallback) {
  return response.headers.get("x-model-name") || response.headers.get("x-model") || fallback || "unknown";
}

function streamResponse(upstreamResponse, provider, config, requestBody) {
  const modelName = modelNameFromResponse(upstreamResponse, requestBody.model);
  if (!shouldOptimizeModel(modelName, config.streamOptimizationModels)) {
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
      headers,
    }),
  );
}

function modelError(modelName, restrictedModels) {
  return jsonResponse(
    {
      error: {
        message: `Model ${modelName} is not in the selected endpoint model allowlist.`,
        type: "invalid_request_error",
        param: "model",
        code: 400,
        allowed_models: restrictedModels,
      },
    },
    { status: 400 },
  );
}

export async function handleProxyRequest(request, config, options = {}) {
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
            code: 401,
          },
        },
        { status: 401 },
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
        headers,
      }),
      provider,
      config,
      requestBody,
    );
  } catch (error) {
    logger.error("Proxy request failed", { message: error.message });
    return errorResponse(error, error.message === "Invalid JSON body" ? 400 : 500);
  }
}
