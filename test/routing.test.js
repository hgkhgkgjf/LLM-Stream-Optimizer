import test from "node:test";
import assert from "node:assert/strict";

import { selectOpenAIEndpoint, selectWeightedKey } from "../src/routing.js";

test("selectOpenAIEndpoint prefers exact model endpoints over generic endpoints", () => {
  const config = {
    defaultUpstreamUrl: "https://fallback.example/v1",
    openaiEndpoints: [
      {
        name: "generic",
        url: "https://generic.example/v1",
        apiKey: "generic-key",
        models: [],
        useNativeFetch: false,
      },
      {
        name: "reasoning",
        url: "https://reasoning.example/v1",
        apiKey: "reasoning-a, reasoning-b",
        models: ["o3-mini"],
        useNativeFetch: true,
      },
    ],
  };

  const selected = selectOpenAIEndpoint({
    request: new Request("https://proxy.example/v1/chat/completions"),
    requestBody: { model: "o3-mini" },
    config,
    random: () => 0.99,
  });

  assert.equal(selected.endpoint.name, "reasoning");
  assert.equal(selected.url, "https://reasoning.example/v1");
  assert.equal(selected.apiKey, "reasoning-b");
  assert.equal(selected.useNativeFetch, true);
  assert.deepEqual(selected.restrictedModels, ["o3-mini"]);
});

test("selectOpenAIEndpoint honors explicit upstream and outgoing key headers", () => {
  const request = new Request("https://proxy.example/v1/chat/completions", {
    headers: {
      "X-Upstream-URL": "https://custom.example/v1",
      "X-Outgoing-API-Key": "custom-secret",
    },
  });

  const selected = selectOpenAIEndpoint({
    request,
    requestBody: { model: "anything" },
    config: { defaultUpstreamUrl: "https://fallback.example/v1" },
  });

  assert.equal(selected.url, "https://custom.example/v1");
  assert.equal(selected.apiKey, "custom-secret");
  assert.equal(selected.restrictedModels, null);
});

test("selectWeightedKey chooses comma-separated keys using supplied random source", () => {
  assert.equal(selectWeightedKey("a, b, c", () => 0), "a");
  assert.equal(selectWeightedKey("a, b, c", () => 0.34), "b");
  assert.equal(selectWeightedKey("a, b, c", () => 0.99), "c");
});
