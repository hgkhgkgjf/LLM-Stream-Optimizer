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

/**
 * Normalizes an OpenAI-style message `content` field into a plain string.
 *
 * OpenAI allows `content` to be either a string or an array of content parts
 * (e.g. `[{ type: "text", text: "..." }]`). Many clients send the array form
 * even for plain text. Coercing an array with `String(content)` yields
 * "[object Object]", so this extracts and joins the `text` of each part.
 */
export function textFromMessageContent(content) {
  if (Array.isArray(content)) {
    return content
      .filter((part) => part && typeof part.text === "string")
      .map((part) => part.text)
      .join("");
  }
  return String(content || "");
}

const IMAGE_EXTENSION_MEDIA_TYPES = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
};

function mediaTypeFromUrl(url) {
  const match = String(url).split(/[?#]/)[0].match(/\.([a-z0-9]+)$/i);
  const ext = match ? match[1].toLowerCase() : "";
  return IMAGE_EXTENSION_MEDIA_TYPES[ext] || "image/jpeg";
}

/**
 * Returns true when a content part carries image data rather than text.
 * Covers OpenAI Chat Completions (`image_url`) and Responses (`input_image`).
 */
export function isImageContentPart(part) {
  if (!part || typeof part !== "object") return false;
  return part.type === "image_url" || part.type === "input_image" || part.type === "image";
}

/**
 * True when an OpenAI-style message `content` carries at least one image part.
 */
export function messageContentHasImage(content) {
  return Array.isArray(content) && content.some(isImageContentPart);
}

/**
 * Normalizes an OpenAI `image_url` value into a provider-agnostic descriptor.
 *
 * Accepts both the object form (`{ url }`) and the bare string form. Inline
 * `data:` URIs are reported as base64 payloads, while everything else is
 * treated as a remote URL with a best-effort media type guessed from the path.
 */
export function parseImageUrl(imageUrl) {
  const url =
    typeof imageUrl === "string"
      ? imageUrl
      : imageUrl && typeof imageUrl === "object"
        ? imageUrl.url
        : "";
  if (!url || typeof url !== "string") return null;
  const dataUri = url.match(/^data:([^;,]*?)(;base64)?,([\s\S]*)$/);
  if (dataUri) {
    return {
      kind: "base64",
      mediaType: dataUri[1] || "image/jpeg",
      data: dataUri[3] || "",
    };
  }
  return { kind: "url", url, mediaType: mediaTypeFromUrl(url) };
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
