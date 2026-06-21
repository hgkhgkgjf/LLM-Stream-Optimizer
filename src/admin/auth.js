const encoder = new TextEncoder();
const DEFAULT_MAX_AGE_SECONDS = 86400;

function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return bytesToBase64Url(new Uint8Array(signature));
}

function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return diff === 0;
}

export function parseCookies(cookieString = "") {
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

export async function createAdminSessionValue(secret, options = {}) {
  const now = options.now ?? Date.now();
  const maxAgeSeconds = options.maxAgeSeconds ?? DEFAULT_MAX_AGE_SECONDS;
  const payload = {
    exp: now + maxAgeSeconds * 1000,
    nonce: bytesToBase64Url(crypto.getRandomValues(new Uint8Array(12))),
  };
  const payloadBytes = encoder.encode(JSON.stringify(payload));
  const encodedPayload = bytesToBase64Url(payloadBytes);
  const signature = await hmac(secret, encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export async function createAdminSessionCookie(secret, options = {}) {
  const maxAgeSeconds = options.maxAgeSeconds ?? DEFAULT_MAX_AGE_SECONDS;
  const value = await createAdminSessionValue(secret, options);
  return `admin_session=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSeconds}; Secure`;
}

export async function isValidAdminSession(sessionValue, secret, options = {}) {
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

export async function checkAdminSession(request, config) {
  const cookies = parseCookies(request.headers.get("Cookie") || "");
  return isValidAdminSession(cookies.admin_session, config.proxyApiKey);
}

export function clearAdminSessionHeaders() {
  return [
    "admin_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; HttpOnly; SameSite=Strict; Secure",
    "admin_session=; Path=/admin; Expires=Thu, 01 Jan 1970 00:00:01 GMT; HttpOnly; SameSite=Strict; Secure",
  ];
}
