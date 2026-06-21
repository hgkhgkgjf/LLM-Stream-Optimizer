import test from "node:test";
import assert from "node:assert/strict";

import {
  createAdminSessionCookie,
  isValidAdminSession,
  parseCookies,
} from "../src/admin/auth.js";
import { handleAdminRequest } from "../src/admin/routes.js";
import { serveDashboardPage } from "../src/admin/pages.js";

function memoryKv(seed = {}) {
  const values = new Map(Object.entries(seed));
  return {
    values,
    async get(key) {
      return values.has(key) ? values.get(key) : null;
    },
    async put(key, value) {
      values.set(key, value);
    },
  };
}

async function sessionCookie(secret) {
  return await createAdminSessionCookie(secret, {
    now: Date.now(),
    maxAgeSeconds: 60,
  });
}

test("admin session cookies are signed and expire", async () => {
  const now = 1_700_000_000_000;
  const secret = "proxy-password";
  const cookieHeader = await createAdminSessionCookie(secret, {
    now,
    maxAgeSeconds: 60,
  });

  const cookieValue = cookieHeader.match(/admin_session=([^;]+)/)?.[1];
  assert.ok(cookieValue);
  assert.match(cookieHeader, /HttpOnly/);
  assert.match(cookieHeader, /SameSite=Strict/);

  const valid = await isValidAdminSession(cookieValue, secret, { now: now + 59_000 });
  const expired = await isValidAdminSession(cookieValue, secret, { now: now + 61_000 });
  const wrongSecret = await isValidAdminSession(cookieValue, "other-secret", { now: now + 1_000 });

  assert.equal(valid, true);
  assert.equal(expired, false);
  assert.equal(wrongSecret, false);
});

test("admin session validation rejects malformed token shapes", async () => {
  const now = 1_700_000_000_000;
  const secret = "proxy-password";
  const cookieHeader = await createAdminSessionCookie(secret, {
    now,
    maxAgeSeconds: 60,
  });
  const cookieValue = cookieHeader.match(/admin_session=([^;]+)/)?.[1];

  assert.ok(cookieValue);
  assert.equal(await isValidAdminSession(`${cookieValue}.extra`, secret, { now: now + 1_000 }), false);
});

test("parseCookies handles values containing equals signs", () => {
  assert.deepEqual(parseCookies("a=1; admin_session=abc=def; theme=dark"), {
    a: "1",
    admin_session: "abc=def",
    theme: "dark",
  });
});

test("admin API routes accept trailing slash compatibility", async () => {
  const response = await handleAdminRequest(
    new Request("https://worker.example/admin/api/login/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "proxy-secret" }),
    }),
    { PROXY_API_KEY: "proxy-secret" },
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.match(response.headers.get("Set-Cookie") || "", /admin_session=/);
});

test("admin API returns JSON errors for unsupported API routes", async () => {
  const response = await handleAdminRequest(
    new Request("https://worker.example/admin/api/not-found"),
    { PROXY_API_KEY: "proxy-secret" },
  );
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.success, false);
  assert.equal(body.message, "Not found");
  assert.match(response.headers.get("Content-Type") || "", /^application\/json/);
});

test("admin API returns bad request for malformed JSON bodies", async () => {
  const response = await handleAdminRequest(
    new Request("https://worker.example/admin/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    }),
    { PROXY_API_KEY: "proxy-secret" },
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.success, false);
  assert.equal(body.message, "Invalid JSON body");
});

test("admin config route preserves masked keys during authenticated roundtrip", async () => {
  const kv = memoryKv();
  const env = {
    CONFIG_KV: kv,
    OPENAI_API_KEY: "sk-default-secret-123456",
    PROXY_API_KEY: "proxy-secret",
  };
  const cookie = await sessionCookie("proxy-secret");
  const getResponse = await handleAdminRequest(
    new Request("https://worker.example/admin/api/config", {
      headers: { Cookie: cookie },
    }),
    env,
  );
  const { config } = await getResponse.json();

  assert.notEqual(config.defaultOutgoingApiKey, "sk-default-secret-123456");
  assert.notEqual(config.openaiEndpoints[0].apiKey, "sk-default-secret-123456");

  const postResponse = await handleAdminRequest(
    new Request("https://worker.example/admin/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify(config),
    }),
    env,
  );
  const body = await postResponse.json();
  const endpoints = JSON.parse(kv.values.get("openai_endpoints"));

  assert.equal(postResponse.status, 200);
  assert.equal(body.success, true);
  assert.equal(kv.values.get("outgoing_api_key"), "sk-default-secret-123456");
  assert.equal(endpoints[0].apiKey, "sk-default-secret-123456");
});

test("dashboard page fetches config without unsafe HTML injection sinks", async () => {
  const html = await serveDashboardPage().text();

  assert.match(html, /fetch\('\/admin\/api\/config'\)/);
  assert.equal(html.includes("innerHTML"), false);
  assert.equal(html.includes("insertAdjacentHTML"), false);
  assert.equal(html.includes("document.write"), false);
});

test("dashboard exposes stream whitelist instead of manual tuning inputs", async () => {
  const html = await serveDashboardPage().text();

  assert.match(html, /streamOptimizationModels/);
  assert.equal(html.includes("minDelay"), false);
  assert.equal(html.includes("maxDelay"), false);
  assert.equal(html.includes("adaptiveDelayFactor"), false);
  assert.equal(html.includes("chunkBufferSize"), false);
  assert.equal(html.includes("fastOutputDelay"), false);
  assert.equal(html.includes("finalLowDelay"), false);
  assert.equal(html.includes("disableOptimizationModels"), false);
});
