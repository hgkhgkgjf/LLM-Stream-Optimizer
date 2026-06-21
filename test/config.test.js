import test from "node:test";
import assert from "node:assert/strict";

import {
  applyMaskedSecrets,
  getDefaultConfig,
  maskAPIKey,
  normalizeConfigInput,
  safeConfig,
} from "../src/config.js";

test("getDefaultConfig keeps environment compatibility and creates default endpoint", () => {
  const config = getDefaultConfig({
    OPENAI_API_KEY: "sk-default",
    UPSTREAM_URL: "https://upstream.example/v1",
    PROXY_API_KEY: "proxy",
    STREAM_OPTIMIZATION_MODELS: '["gpt-4o", " claude-3 "]',
  });

  assert.equal(config.defaultUpstreamUrl, "https://upstream.example/v1");
  assert.equal(config.defaultOutgoingApiKey, "sk-default");
  assert.equal(config.proxyApiKey, "proxy");
  assert.equal(config.openaiEndpoints.length, 1);
  assert.equal(config.openaiEndpoints[0].url, "https://upstream.example/v1");
  assert.deepEqual(config.openaiEndpoints[0].models, []);
  assert.deepEqual(config.streamOptimizationModels, ["gpt-4o", "claude-3"]);
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

test("normalizeConfigInput trims stream optimization model whitelist", () => {
  const normalized = normalizeConfigInput({
    minDelay: "0",
    maxDelay: "abc",
    adaptiveDelayFactor: "1.5",
    chunkBufferSize: "2",
    disableOptimizationModels: [" gpt-4o ", "", 42],
    streamOptimizationModels: [" gpt-4o ", "", 42, "CLAUDE-3-5-Sonnet"],
  });

  assert.equal(normalized.minDelay, undefined);
  assert.equal(normalized.maxDelay, undefined);
  assert.equal(normalized.adaptiveDelayFactor, undefined);
  assert.equal(normalized.chunkBufferSize, undefined);
  assert.equal(normalized.disableOptimizationModels, undefined);
  assert.deepEqual(normalized.streamOptimizationModels, ["gpt-4o", "CLAUDE-3-5-Sonnet"]);
});

test("safeConfig exposes stream whitelist but hides deprecated tuning settings", () => {
  const config = safeConfig({
    streamOptimizationModels: ["gpt-4o"],
    minDelay: 1,
    maxDelay: 20,
    adaptiveDelayFactor: 1.5,
    chunkBufferSize: 2,
    minContentLengthForFastOutput: 100,
    fastOutputDelay: 3,
    finalLowDelay: 1,
    disableOptimizationModels: ["legacy"],
  });

  assert.deepEqual(config.streamOptimizationModels, ["gpt-4o"]);
  assert.equal(Object.hasOwn(config, "minDelay"), false);
  assert.equal(Object.hasOwn(config, "maxDelay"), false);
  assert.equal(Object.hasOwn(config, "adaptiveDelayFactor"), false);
  assert.equal(Object.hasOwn(config, "chunkBufferSize"), false);
  assert.equal(Object.hasOwn(config, "minContentLengthForFastOutput"), false);
  assert.equal(Object.hasOwn(config, "fastOutputDelay"), false);
  assert.equal(Object.hasOwn(config, "finalLowDelay"), false);
  assert.equal(Object.hasOwn(config, "disableOptimizationModels"), false);
});

test("maskAPIKey masks each comma-separated key without leaking the original values", () => {
  const masked = maskAPIKey("sk-1234567890, sk-abcdefghi");

  assert.match(masked, /\*/);
  assert.equal(masked.split(",").length, 2);
  assert.equal(masked.includes("1234567890"), false);
  assert.equal(masked.includes("abcdefghi"), false);
});
