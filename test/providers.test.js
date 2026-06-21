import test from "node:test";
import assert from "node:assert/strict";

import { anthropicProvider } from "../src/providers/anthropic.js";
import { geminiProvider } from "../src/providers/gemini.js";
import { selectProvider } from "../src/providers/index.js";
import { openAIProvider } from "../src/providers/openai.js";

test("Gemini non-stream response converts to OpenAI chat completion format", () => {
  const converted = geminiProvider.convertResponseBody({
    modelId: "gemini-2.0-flash",
    candidates: [
      {
        content: { parts: [{ text: "hello" }, { text: " world" }] },
        finishReason: "STOP",
      },
    ],
    usageMetadata: {
      promptTokenCount: 3,
      candidatesTokenCount: 4,
    },
  });

  assert.equal(converted.object, "chat.completion");
  assert.equal(converted.model, "gemini-2.0-flash");
  assert.equal(converted.choices[0].message.content, "hello world");
  assert.equal(converted.choices[0].finish_reason, "stop");
  assert.deepEqual(converted.usage, {
    prompt_tokens: 3,
    completion_tokens: 4,
    total_tokens: 7,
  });
});

test("Anthropic stream lines convert to OpenAI chunks", () => {
  const chunks = anthropicProvider.convertStreamLine(
    'data: {"type":"content_block_delta","delta":{"text":"Hi"}}',
  );

  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].choices[0].delta.content, "Hi");
  assert.equal(chunks[0].choices[0].finish_reason, null);
});

test("Anthropic request construction preserves full Claude model ids", async () => {
  const upstreamRequest = anthropicProvider.createRequest({
    request: new Request("https://proxy.example/v1/chat/completions"),
    requestBody: {
      model: "claude-3-5-sonnet-20241022",
      messages: [{ role: "user", content: "Hello" }],
      stream: false,
    },
    config: {
      anthropicApiKey: "sk-ant-test",
      anthropicUpstreamUrl: "https://api.anthropic.com",
      anthropicUseNativeFetch: true,
    },
  });

  const body = JSON.parse(upstreamRequest.body);

  assert.equal(body.model, "claude-3-5-sonnet-20241022");
});

test("Anthropic non-stream response normalizes max token finish reason", () => {
  const converted = anthropicProvider.convertResponseBody({
    model: "claude-3-5-sonnet",
    content: [{ type: "text", text: "partial" }],
    stop_reason: "max_tokens",
    usage: {
      input_tokens: 2,
      output_tokens: 3,
    },
  });

  assert.equal(converted.choices[0].message.content, "partial");
  assert.equal(converted.choices[0].finish_reason, "length");
});

test("Anthropic stream message delta emits normalized finish chunk", () => {
  const chunks = anthropicProvider.convertStreamLine(
    'data: {"type":"message_delta","delta":{"stop_reason":"max_tokens"}}',
  );

  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].choices[0].finish_reason, "length");
});

test("OpenAI stream lines pass chunks through parsed", () => {
  const chunks = openAIProvider.convertStreamLine(
    'data: {"id":"1","choices":[{"index":0,"delta":{"content":"A"},"finish_reason":null}]}',
  );

  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].choices[0].delta.content, "A");
});

test("OpenAI stream lines accept data field without a space", () => {
  const chunks = openAIProvider.convertStreamLine(
    'data:{"id":"1","choices":[{"index":0,"delta":{"content":"A"},"finish_reason":null}]}',
  );

  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].choices[0].delta.content, "A");
});

test("Gemini stream errors pass through as error objects", () => {
  const chunks = geminiProvider.convertStreamLine(
    'data: {"error":{"message":"quota exceeded","code":429}}',
  );

  assert.deepEqual(chunks, [{ error: { message: "quota exceeded", code: 429 } }]);
});

test("selectProvider defaults to OpenAI when config is omitted", () => {
  assert.equal(selectProvider("gpt-4o"), openAIProvider);
});
