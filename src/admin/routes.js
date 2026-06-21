import {
  applyMaskedSecrets,
  loadConfig,
  normalizeConfigInput,
  safeConfig,
  saveConfig,
} from "../config.js";
import { jsonResponse } from "../http.js";
import {
  checkAdminSession,
  clearAdminSessionHeaders,
  createAdminSessionCookie,
} from "./auth.js";
import { serveDashboardPage, serveLoginPage } from "./pages.js";

const ADMIN_API_PREFIX = "/admin/api";

function normalizeAdminApiPath(path) {
  if (path === ADMIN_API_PREFIX) return path;
  if (!path.startsWith(`${ADMIN_API_PREFIX}/`)) return path;
  return path.replace(/\/+$/g, "");
}

async function readJsonBody(request) {
  try {
    return { ok: true, body: await request.json() };
  } catch {
    return {
      ok: false,
      response: jsonResponse({ success: false, message: "Invalid JSON body" }, { status: 400 }),
    };
  }
}

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

async function handleConfigApiRequest(request, env, config) {
  if (!(await checkAdminSession(request, config))) {
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

function handleLogoutRequest() {
  const response = jsonResponse({ success: true, message: "Logged out" });
  const [rootCookie, adminCookie] = clearAdminSessionHeaders();
  response.headers.set("Set-Cookie", rootCookie);
  response.headers.append("Set-Cookie", adminCookie);
  return response;
}

export async function handleAdminRequest(request, env) {
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
