import test from "node:test";
import assert from "node:assert/strict";

import {
  applyMaskedSecrets,
  getDefaultConfig,
  maskAPIKey,
  normalizeConfigInput,
} from "../src/config.js";

test("getDefaultConfig keeps environment compatibility and creates default endpoint", () => {
  const config = getDefaultConfig({
    OPENAI_API_KEY: "sk-default",
    UPSTREAM_URL: "https://upstream.example/v1",
    PROXY_API_KEY: "proxy",
  });

  assert.equal(config.defaultUpstreamUrl, "https://upstream.example/v1");
  assert.equal(config.defaultOutgoingApiKey, "sk-default");
  assert.equal(config.proxyApiKey, "proxy");
  assert.equal(config.openaiEndpoints.length, 1);
  assert.equal(config.openaiEndpoints[0].url, "https://upstream.example/v1");
  assert.deepEqual(config.openaiEndpoints[0].models, []);
});

test("applyMaskedSecrets preserves existing secrets when admin form submits masked values", () => {
  const current = {
    defaultOutgoingApiKey: "sk-existing",
    geminiApiKey: "gemini-existing",
    anthropicApiKey: "anthropic-existing",
    proxyApiKey: "proxy-existing",
    openaiEndpoints: [
      {
        id: "one",
        name: "Primary",
        url: "https://one.example/v1",
        apiKey: "sk-one-existing",
      },
    ],
  };

  const next = applyMaskedSecrets(
    {
      defaultOutgoingApiKey: "sk-****ting",
      geminiApiKey: "",
      anthropicApiKey: "sk-ant-new",
      proxyApiKey: "proxy-****ting",
      openaiEndpoints: [
        {
          id: "one",
          name: "Primary",
          url: "https://one.example/v1",
          apiKey: "sk-****ting",
        },
      ],
    },
    current,
  );

  assert.equal(next.defaultOutgoingApiKey, "sk-existing");
  assert.equal(next.geminiApiKey, "");
  assert.equal(next.anthropicApiKey, "sk-ant-new");
  assert.equal(next.proxyApiKey, "proxy-existing");
  assert.equal(next.openaiEndpoints[0].apiKey, "sk-one-existing");
});

test("normalizeConfigInput clamps numeric stream settings and trims model disables", () => {
  const normalized = normalizeConfigInput({
    minDelay: "0",
    maxDelay: "abc",
    adaptiveDelayFactor: "1.5",
    chunkBufferSize: "2",
    disableOptimizationModels: [" gpt-4o ", "", 42],
  });

  assert.equal(normalized.minDelay, 1);
  assert.equal(normalized.maxDelay, undefined);
  assert.equal(normalized.adaptiveDelayFactor, 1.5);
  assert.equal(normalized.chunkBufferSize, 2);
  assert.deepEqual(normalized.disableOptimizationModels, ["gpt-4o"]);
});

test("maskAPIKey masks each comma-separated key without leaking the original values", () => {
  const masked = maskAPIKey("sk-1234567890, sk-abcdefghi");

  assert.match(masked, /\*/);
  assert.equal(masked.split(",").length, 2);
  assert.equal(masked.includes("1234567890"), false);
  assert.equal(masked.includes("abcdefghi"), false);
});
