import test from "node:test";
import assert from "node:assert/strict";

import {
  createSSETransformer,
  splitTextByCodePoint,
  shouldDisableOptimization,
} from "../src/stream.js";
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

function contentEvents(output) {
  return Array.from(output.matchAll(/"content":"([^"]*)"/g), (match) => match[1]);
}

test("splitTextByCodePoint does not split surrogate pairs", () => {
  assert.deepEqual(splitTextByCodePoint("A😀B"), ["A", "😀", "B"]);
});

test("shouldDisableOptimization matches exact and partial model names", () => {
  assert.equal(
    shouldDisableOptimization("gpt-4o-mini", ["claude", "gpt-4o"]),
    true,
  );
  assert.equal(shouldDisableOptimization("gemini-flash", ["claude"]), false);
  assert.equal(shouldDisableOptimization("gpt-4o", ["gpt-4o-mini"]), false);
});

test("SSE transformer emits DONE only once when upstream already sends DONE", async () => {
  const transformer = createSSETransformer({
    provider: openAIProvider,
    config: { minDelay: 0, maxDelay: 0 },
  });

  const input = [
    'data: {"id":"1","choices":[{"index":0,"delta":{"content":"😀"},"finish_reason":null}]}',
    "",
    "data: [DONE]",
    "",
  ].join("\n");

  const output = await transformer.transformText(input);
  const doneCount = output.match(/data: \[DONE\]/g)?.length || 0;

  assert.equal(doneCount, 1);
  assert.match(output, /"content":"😀"/);
});

test("SSE transformer splits lone CR line endings", async () => {
  const transformer = createSSETransformer({
    provider: openAIProvider,
    config: { minDelay: 0, maxDelay: 0 },
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
    config: { minDelay: 0, maxDelay: 0 },
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
    config: { minDelay: 0, maxDelay: 0 },
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
    config: { minDelay: 0, maxDelay: 0 },
  });
  const bytes = encoder.encode("data: {not json}\n\n");

  const output = await readStreamText(transformer.transformStream(streamFromByteChunks([bytes])));

  assert.match(output, /data: \{not json\}\n\n/);
  assert.equal(output.match(/data: \[DONE\]/g)?.length || 0, 1);
});

test("SSE transformer passes provider error objects through", async () => {
  const transformer = createSSETransformer({
    provider: geminiProvider,
    config: { minDelay: 0, maxDelay: 0 },
  });

  const output = await transformer.transformText(
    'data: {"error":{"message":"quota exceeded","code":429}}\n\n',
  );

  assert.match(output, /"error":\{"message":"quota exceeded","code":429\}/);
  assert.doesNotMatch(output, /Gemini API error/);
  assert.equal(output.match(/data: \[DONE\]/g)?.length || 0, 1);
});

test("SSE stream transformer honors fast and final delay settings", async () => {
  const observedDelays = [];
  const transformer = createSSETransformer({
    provider: openAIProvider,
    config: {
      minDelay: 1,
      maxDelay: 20,
      adaptiveDelayFactor: 0.5,
      minContentLengthForFastOutput: 20,
      fastOutputDelay: 4,
      finalLowDelay: 2,
    },
    sleep: async (delay) => {
      observedDelays.push(delay);
    },
  });
  const bytes = encoder.encode(
    [
      'data: {"id":"1","choices":[{"index":0,"delta":{"content":"abcdef"},"finish_reason":null}]}',
      "",
      'data: {"id":"1","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}',
      "",
    ].join("\n"),
  );

  await readStreamText(transformer.transformStream(streamFromByteChunks([bytes])));

  assert.ok(observedDelays.includes(4), "large chunks should use fastOutputDelay");
  assert.ok(observedDelays.includes(2), "finish chunks should use finalLowDelay");
});
