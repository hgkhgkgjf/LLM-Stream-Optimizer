import { copyForwardHeaders, joinUrl } from "../http.js";

function sseDataFromLine(line) {
  if (!line.startsWith("data:")) return null;
  return line.slice(5).trim();
}

export const openAIProvider = {
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
      useNativeFetch: route.useNativeFetch,
    };
  },

  convertResponseBody(body) {
    return body;
  },

  convertStreamLine(line) {
    const data = sseDataFromLine(line);
    if (data === null) return [];
    if (!data || data === "[DONE]") return [];
    return [JSON.parse(data)];
  },
};
