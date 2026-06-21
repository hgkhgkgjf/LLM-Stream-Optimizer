import test from "node:test";
import assert from "node:assert/strict";

import {
  createSSETransformer,
  splitTextByCodePoint,
  shouldOptimizeModel,
} from "../src/stream.js";
import { handleProxyRequest } from "../src/proxy.js";
import { geminiProvider } from "../src/providers/gemini.js";
import { openAIProvider } from "../src/providers/openai.js";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function readStreamText(stream) {
  const reader = stream.getReader();
  let output = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    output += decoder.decode(value, { stream: true });
  }
  output += decoder.decode();
  return output;
}

function streamFromByteChunks(chunks) {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
}

function parsedEvents(output) {
  return output
    .split(/\n\n|\r\n\r\n|\r\r/)
    .map((event) => event.trim())
    .filter((event) => event.startsWith("data:"))
    .map((event) => event.slice(5).trim())
    .filter((data) => data && data !== "[DONE]")
    .map((data) => JSON.parse(data));
}

function contentEvents(output) {
  return parsedEvents(output)
    .map((event) => event.choices?.[0]?.delta?.content ?? event.choices?.[0]?.text)
    .filter((content) => typeof content === "string");
}

async function proxyStreamOutput({ model = "gpt-4o", streamOptimizationModels = [] } = {}) {
  const upstreamBody = encoder.encode(
    'data: {"id":"1","choices":[{"index":0,"delta":{"content":"AB"},"finish_reason":null}]}\n\n',
  );
  const request = new Request("https://worker.example/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, stream: true, messages: [{ role: "user", content: "Hi" }] }),
  });
  const response = await handleProxyRequest(
    request,
    {
      defaultUpstreamUrl: "https://upstream.example/v1",
      defaultOutgoingApiKey: "sk-test",
      openaiEndpoints: [{ url: "https://upstream.example/v1", apiKey: "sk-test", useNativeFetch: false }],
      streamOptimizationModels,
    },
    {
      fetcher: async () =>
        new Response(streamFromByteChunks([upstreamBody]), {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        }),
    },
  );

  return readStreamText(response.body);
}

async function proxyGeminiStreamOutput({ streamOptimizationModels = [] } = {}) {
  const upstreamBody = encoder.encode(
    'data: {"modelId":"gemini-2.5-flash","candidates":[{"index":0,"content":{"parts":[{"text":"Hi"}]}}]}\n\n',
  );
  const request = new Request("https://worker.example/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gemini-2.5-flash",
      stream: true,
      messages: [{ role: "user", content: "Hi" }],
    }),
  });
  const response = await handleProxyRequest(
    request,
    {
      geminiEnabled: true,
      geminiApiKey: "gemini-test",
      geminiUpstreamUrl: "https://generativelanguage.googleapis.com",
      geminiUseNativeFetch: false,
      streamOptimizationModels,
    },
    {
      fetcher: async () =>
        new Response(streamFromByteChunks([upstreamBody]), {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        }),
    },
  );

  return readStreamText(response.body);
}

test("splitTextByCodePoint does not split surrogate pairs", () => {
  const emoji = "\u{1F604}";
  assert.deepEqual(splitTextByCodePoint(`A${emoji}B`), ["A", emoji, "B"]);
});

test("splitTextByCodePoint uses grapheme segmentation when available", () => {
  assert.deepEqual(splitTextByCodePoint("e\u0301A"), ["e\u0301", "A"]);
});

test("shouldOptimizeModel requires exact case-insensitive whitelist matches", () => {
  assert.equal(shouldOptimizeModel("GPT-4O", [" gpt-4o "]), true);
  assert.equal(shouldOptimizeModel("gpt-4o-mini", ["gpt-4o"]), false);
  assert.equal(shouldOptimizeModel("gpt-4o", []), false);
});

test("proxy streams pass through when model is not whitelisted", async () => {
  const output = await proxyStreamOutput({ model: "gpt-4o", streamOptimizationModels: [] });

  assert.deepEqual(contentEvents(output), ["AB"]);
  assert.equal(output.match(/data: \[DONE\]/g)?.length || 0, 0);
});

test("proxy converts Gemini streams even when stream optimization is not whitelisted", async () => {
  const output = await proxyGeminiStreamOutput({ streamOptimizationModels: [] });
  const events = parsedEvents(output);

  assert.equal(events[0].choices[0].delta.content, "Hi");
  assert.equal(events[0].model, "gemini-2.5-flash");
  assert.doesNotMatch(output, /"candidates"/);
});

test("proxy streams optimize exact whitelisted models", async () => {
  const output = await proxyStreamOutput({
    model: "gpt-4o",
    streamOptimizationModels: ["gpt-4o"],
  });

  assert.deepEqual(contentEvents(output), ["A", "B"]);
  assert.equal(output.match(/data: \[DONE\]/g)?.length || 0, 1);
});

test("SSE transformer emits DONE only once when upstream already sends DONE", async () => {
  const transformer = createSSETransformer({
    provider: openAIProvider,
  });
  const emoji = "\u{1F604}";

  const input = [
    `data: {"id":"1","choices":[{"index":0,"delta":{"content":"${emoji}"},"finish_reason":null}]}`,
    "",
    "data: [DONE]",
    "",
  ].join("\n");

  const output = await transformer.transformText(input);
  const doneCount = output.match(/data: \[DONE\]/g)?.length || 0;

  assert.equal(doneCount, 1);
  assert.deepEqual(contentEvents(output), [emoji]);
});

test("SSE transformer splits lone CR line endings", async () => {
  const transformer = createSSETransformer({
    provider: openAIProvider,
  });

  const input = [
    'data: {"id":"1","choices":[{"index":0,"delta":{"content":"AB"},"finish_reason":null}]}',
    "",
    "data: [DONE]",
    "",
  ].join("\r");

  const output = await transformer.transformText(input);

  assert.deepEqual(contentEvents(output), ["A", "B"]);
  assert.equal(output.match(/data: \[DONE\]/g)?.length || 0, 1);
});

test("SSE transformer preserves split UTF-8 code points in streams", async () => {
  const transformer = createSSETransformer({
    provider: openAIProvider,
  });
  const emoji = "\u{1F604}";
  const bytes = encoder.encode(
    `data: {"id":"1","choices":[{"index":0,"delta":{"content":"${emoji}"},"finish_reason":null}]}\r\n\r\n`,
  );
  const stream = streamFromByteChunks(Array.from(bytes, (byte) => Uint8Array.of(byte)));

  const output = await readStreamText(transformer.transformStream(stream));

  assert.deepEqual(contentEvents(output), [emoji]);
  assert.equal(output.match(/data: \[DONE\]/g)?.length || 0, 1);
});

test("SSE stream transformer emits upstream DONE once", async () => {
  const transformer = createSSETransformer({
    provider: openAIProvider,
  });
  const bytes = encoder.encode(
    'data: {"id":"1","choices":[{"index":0,"delta":{"content":"A"},"finish_reason":null}]}\n\ndata: [DONE]\n\n',
  );

  const output = await readStreamText(transformer.transformStream(streamFromByteChunks([bytes])));

  assert.equal(output.match(/data: \[DONE\]/g)?.length || 0, 1);
});

test("SSE stream transformer passes malformed data lines through", async () => {
  const transformer = createSSETransformer({
    provider: openAIProvider,
  });
  const bytes = encoder.encode("data: {not json}\n\n");

  const output = await readStreamText(transformer.transformStream(streamFromByteChunks([bytes])));

  assert.match(output, /data: \{not json\}\n\n/);
  assert.equal(output.match(/data: \[DONE\]/g)?.length || 0, 1);
});

test("SSE transformer passes provider error objects through", async () => {
  const transformer = createSSETransformer({
    provider: geminiProvider,
  });

  const output = await transformer.transformText(
    'data: {"error":{"message":"quota exceeded","code":429}}\n\n',
  );

  assert.match(output, /"error":\{"message":"quota exceeded","code":429\}/);
  assert.doesNotMatch(output, /Gemini API error/);
  assert.equal(output.match(/data: \[DONE\]/g)?.length || 0, 1);
});

test("SSE transformer does not split non-text tool call deltas", async () => {
  const transformer = createSSETransformer({
    provider: openAIProvider,
  });
  const toolCall = {
    id: "1",
    choices: [
      {
        index: 0,
        delta: { tool_calls: [{ index: 0, function: { arguments: "{\"a\":1}" } }] },
        finish_reason: null,
      },
    ],
  };

  const output = await transformer.transformText(`data: ${JSON.stringify(toolCall)}\n\n`);
  const events = parsedEvents(output);

  assert.equal(events.length, 1);
  assert.deepEqual(events[0].choices[0].delta.tool_calls, toolCall.choices[0].delta.tool_calls);
});

test("SSE transformer does not optimize chunks carrying reasoning content", async () => {
  const transformer = createSSETransformer({
    provider: openAIProvider,
  });
  const reasoningChunk = {
    id: "1",
    choices: [
      {
        index: 0,
        delta: { reasoning_content: "private reasoning", content: "AB" },
        finish_reason: null,
      },
    ],
  };

  const output = await transformer.transformText(`data: ${JSON.stringify(reasoningChunk)}\n\n`);
  const events = parsedEvents(output);

  assert.equal(events.length, 1);
  assert.deepEqual(events[0].choices[0].delta, reasoningChunk.choices[0].delta);
});

test("SSE stream transformer leaves naturally small upstream chunks undelayed", async () => {
  const observedDelays = [];
  const transformer = createSSETransformer({
    provider: openAIProvider,
    sleep: async (delay) => {
      observedDelays.push(delay);
    },
  });
  const first = encoder.encode(
    'data: {"id":"1","choices":[{"index":0,"delta":{"content":"A"},"finish_reason":null}]}\n\n',
  );
  const second = encoder.encode(
    'data: {"id":"1","choices":[{"index":0,"delta":{"content":"B"},"finish_reason":null}]}\n\n',
  );

  await readStreamText(transformer.transformStream(streamFromByteChunks([first, second])));

  assert.deepEqual(observedDelays, []);
});

test("SSE stream transformer smooths large natural language chunks", async () => {
  const observedDelays = [];
  const transformer = createSSETransformer({
    provider: openAIProvider,
    sleep: async (delay) => {
      observedDelays.push(delay);
    },
  });
  const text = "Hello world, this is a longer natural language response.";
  const bytes = encoder.encode(
    [
      `data: {"id":"1","choices":[{"index":0,"delta":{"content":${JSON.stringify(text)}},"finish_reason":null}]}`,
      "",
    ].join("\n"),
  );

  const output = await readStreamText(transformer.transformStream(streamFromByteChunks([bytes])));

  assert.equal(contentEvents(output).join(""), text);
  assert.ok(contentEvents(output).length > 10);
  assert.ok(observedDelays.some((delay) => delay > 0));
});

test("SSE stream transformer emits structured output in fast larger chunks", async () => {
  const observedDelays = [];
  const transformer = createSSETransformer({
    provider: openAIProvider,
    sleep: async (delay) => {
      observedDelays.push(delay);
    },
  });
  const text = JSON.stringify({ answer: ["alpha", "beta", "gamma"], ok: true }, null, 2);
  const bytes = encoder.encode(
    [
      `data: {"id":"1","choices":[{"index":0,"delta":{"content":${JSON.stringify(text)}},"finish_reason":null}]}`,
      "",
    ].join("\n"),
  );

  const output = await readStreamText(transformer.transformStream(streamFromByteChunks([bytes])));

  assert.equal(contentEvents(output).join(""), text);
  assert.ok(contentEvents(output).length < splitTextByCodePoint(text).length / 2);
  assert.ok(observedDelays.length <= 2);
});
