import { handleAdminRequest } from "./admin/routes.js";
import { loadConfig } from "./config.js";
import { createLogger } from "./logger.js";
import { handleProxyRequest } from "./proxy.js";

export default {
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
  },
};
