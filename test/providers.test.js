import test from "node:test";
import assert from "node:assert/strict";

import { anthropicProvider } from "../src/providers/anthropic.js";
import { geminiProvider } from "../src/providers/gemini.js";
import { selectProvider } from "../src/providers/index.js";
import { openAIProvider } from "../src/providers/openai.js";
import { messageContentHasImage, parseImageUrl } from "../src/http.js";

const PNG_DATA_URI =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMCAQDQzNHvAAAAAElFTkSuQmCC";

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

test("Gemini non-stream response separates thought summaries from visible content", () => {
  const converted = geminiProvider.convertResponseBody({
    modelId: "gemini-2.5-flash",
    candidates: [
      {
        content: {
          parts: [
            { text: "draft reasoning", thought: true },
            { text: "final answer" },
          ],
        },
        finishReason: "STOP",
      },
    ],
  });

  assert.equal(converted.choices[0].message.reasoning_content, "draft reasoning");
  assert.equal(converted.choices[0].message.content, "final answer");
});

test("Gemini stream thought parts convert to reasoning content chunks", () => {
  const chunks = geminiProvider.convertStreamLine(
    'data: {"modelId":"gemini-2.5-flash","candidates":[{"index":0,"content":{"parts":[{"text":"draft reasoning","thought":true},{"text":"final answer"}]}}]}',
  );

  assert.equal(chunks.length, 2);
  assert.equal(chunks[0].choices[0].delta.reasoning_content, "draft reasoning");
  assert.equal(chunks[0].choices[0].delta.content, undefined);
  assert.equal(chunks[1].choices[0].delta.content, "final answer");
});

test("Gemini request construction forwards explicit thinking config", () => {
  const upstreamRequest = geminiProvider.createRequest({
    request: new Request("https://proxy.example/v1/chat/completions"),
    requestBody: {
      model: "gemini-2.5-flash",
      messages: [{ role: "user", content: "Hello" }],
      stream: true,
      extra_body: {
        google: {
          thinking_config: {
            include_thoughts: true,
            thinking_budget: 1024,
          },
        },
      },
    },
    config: {
      geminiApiKey: "gemini-test",
      geminiUpstreamUrl: "https://generativelanguage.googleapis.com",
    },
  });
  const body = JSON.parse(upstreamRequest.body);

  assert.deepEqual(body.generationConfig.thinkingConfig, {
    includeThoughts: true,
    thinkingBudget: 1024,
  });
});

test("Gemini request construction maps reasoning effort to thinking config", () => {
  const upstreamRequest = geminiProvider.createRequest({
    request: new Request("https://proxy.example/v1/chat/completions"),
    requestBody: {
      model: "gemini-3-pro",
      messages: [{ role: "user", content: "Hello" }],
      reasoning_effort: "high",
    },
    config: {
      geminiApiKey: "gemini-test",
      geminiUpstreamUrl: "https://generativelanguage.googleapis.com",
    },
  });
  const body = JSON.parse(upstreamRequest.body);

  assert.deepEqual(body.generationConfig.thinkingConfig, {
    thinkingLevel: "high",
  });
});

test("Gemini request construction maps 2.5 minimal reasoning effort to documented budget", () => {
  const upstreamRequest = geminiProvider.createRequest({
    request: new Request("https://proxy.example/v1/chat/completions"),
    requestBody: {
      model: "gemini-2.5-flash",
      messages: [{ role: "user", content: "Hello" }],
      reasoning_effort: "minimal",
    },
    config: {
      geminiApiKey: "gemini-test",
      geminiUpstreamUrl: "https://generativelanguage.googleapis.com",
    },
  });
  const body = JSON.parse(upstreamRequest.body);

  assert.deepEqual(body.generationConfig.thinkingConfig, {
    thinkingBudget: 1024,
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

test("Anthropic stream thinking deltas convert to reasoning content chunks", () => {
  const chunks = anthropicProvider.convertStreamLine(
    'data: {"type":"content_block_delta","delta":{"type":"thinking_delta","thinking":"private reasoning"}}',
  );

  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].choices[0].delta.reasoning_content, "private reasoning");
  assert.equal(chunks[0].choices[0].delta.content, undefined);
});

test("Anthropic stream signature deltas are forwarded as reasoning signatures", () => {
  const chunks = anthropicProvider.convertStreamLine(
    'data: {"type":"content_block_delta","delta":{"type":"signature_delta","signature":"sig-123"}}',
  );

  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].choices[0].delta.reasoning_signature, "sig-123");
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

test("Anthropic request construction uses messages API when thinking is requested", () => {
  const upstreamRequest = anthropicProvider.createRequest({
    request: new Request("https://proxy.example/v1/chat/completions"),
    requestBody: {
      model: "claude-3-7-sonnet-latest",
      messages: [
        { role: "system", content: "Be concise." },
        { role: "user", content: "Hello" },
      ],
      stream: true,
      max_tokens: 4096,
      thinking: { type: "enabled", budget_tokens: 1024, display: "summarized" },
    },
    config: {
      anthropicApiKey: "sk-ant-test",
      anthropicUpstreamUrl: "https://api.anthropic.com",
      anthropicUseNativeFetch: true,
    },
  });
  const body = JSON.parse(upstreamRequest.body);

  assert.match(upstreamRequest.url, /\/v1\/messages$/);
  assert.equal(body.system, "Be concise.");
  assert.deepEqual(body.messages, [{ role: "user", content: "Hello" }]);
  assert.deepEqual(body.thinking, { type: "enabled", budget_tokens: 1024, display: "summarized" });
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

test("Anthropic non-stream response separates thinking blocks from visible content", () => {
  const converted = anthropicProvider.convertResponseBody({
    model: "claude-3-7-sonnet-latest",
    content: [
      { type: "thinking", thinking: "private reasoning", signature: "sig-123" },
      { type: "text", text: "final answer" },
    ],
    stop_reason: "end_turn",
  });

  assert.equal(converted.choices[0].message.reasoning_content, "private reasoning");
  assert.equal(converted.choices[0].message.reasoning_signature, "sig-123");
  assert.equal(converted.choices[0].message.content, "final answer");
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

test("Gemini request construction joins array-form content into text", () => {
  const upstreamRequest = geminiProvider.createRequest({
    request: new Request("https://proxy.example/v1/chat/completions"),
    requestBody: {
      model: "gemini-2.5-flash",
      messages: [
        { role: "system", content: [{ type: "text", text: "Be concise." }] },
        { role: "user", content: [{ type: "text", text: "Hello " }, { type: "text", text: "world" }] },
        { role: "assistant", content: "Hi there" },
        { role: "user", content: "Follow up" },
      ],
    },
    config: {
      geminiApiKey: "gemini-test",
      geminiUpstreamUrl: "https://generativelanguage.googleapis.com",
    },
  });
  const body = JSON.parse(upstreamRequest.body);

  assert.equal(body.systemInstruction.parts[0].text, "Be concise.");
  assert.deepEqual(
    body.contents.map((entry) => ({ role: entry.role, text: entry.parts[0].text })),
    [
      { role: "user", text: "Hello world" },
      { role: "model", text: "Hi there" },
      { role: "user", text: "Follow up" },
    ],
  );
});

test("parseImageUrl decodes base64 data URIs", () => {
  const parsed = parseImageUrl(PNG_DATA_URI);
  assert.equal(parsed.kind, "base64");
  assert.equal(parsed.mediaType, "image/png");
  assert.ok(parsed.data.startsWith("iVBORw0KGgo"));
});

test("parseImageUrl treats remote links as urls and guesses media type", () => {
  const parsed = parseImageUrl({ url: "https://cdn.example/photo.JPG?token=1" });
  assert.deepEqual(parsed, {
    kind: "url",
    url: "https://cdn.example/photo.JPG?token=1",
    mediaType: "image/jpeg",
  });
});

test("messageContentHasImage detects image parts only", () => {
  assert.equal(messageContentHasImage("plain text"), false);
  assert.equal(messageContentHasImage([{ type: "text", text: "hi" }]), false);
  assert.equal(
    messageContentHasImage([
      { type: "text", text: "hi" },
      { type: "image_url", image_url: { url: PNG_DATA_URI } },
    ]),
    true,
  );
});

test("Gemini request construction maps inline image data to inlineData parts", () => {
  const upstreamRequest = geminiProvider.createRequest({
    request: new Request("https://proxy.example/v1/chat/completions"),
    requestBody: {
      model: "gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "What is in this image?" },
            { type: "image_url", image_url: { url: PNG_DATA_URI } },
          ],
        },
      ],
    },
    config: {
      geminiApiKey: "gemini-test",
      geminiUpstreamUrl: "https://generativelanguage.googleapis.com",
    },
  });
  const body = JSON.parse(upstreamRequest.body);

  assert.deepEqual(body.contents[0].parts[0], { text: "What is in this image?" });
  assert.equal(body.contents[0].parts[1].inlineData.mimeType, "image/png");
  assert.ok(body.contents[0].parts[1].inlineData.data.startsWith("iVBORw0KGgo"));
});

test("Gemini request construction maps remote image links to fileData parts", () => {
  const upstreamRequest = geminiProvider.createRequest({
    request: new Request("https://proxy.example/v1/chat/completions"),
    requestBody: {
      model: "gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: [{ type: "image_url", image_url: { url: "https://cdn.example/cat.png" } }],
        },
      ],
    },
    config: {
      geminiApiKey: "gemini-test",
      geminiUpstreamUrl: "https://generativelanguage.googleapis.com",
    },
  });
  const body = JSON.parse(upstreamRequest.body);

  assert.deepEqual(body.contents[0].parts[0], {
    fileData: { mimeType: "image/png", fileUri: "https://cdn.example/cat.png" },
  });
});

test("Anthropic request construction maps inline image data to base64 image blocks", () => {
  const upstreamRequest = anthropicProvider.createRequest({
    request: new Request("https://proxy.example/v1/chat/completions"),
    requestBody: {
      model: "claude-3-5-sonnet-20241022",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Describe this." },
            { type: "image_url", image_url: { url: PNG_DATA_URI } },
          ],
        },
      ],
    },
    config: {
      anthropicApiKey: "sk-ant-test",
      anthropicUpstreamUrl: "https://api.anthropic.com",
    },
  });
  const body = JSON.parse(upstreamRequest.body);

  assert.match(upstreamRequest.url, /\/v1\/messages$/);
  assert.equal(body.messages[0].content[0].type, "text");
  assert.equal(body.messages[0].content[1].type, "image");
  assert.equal(body.messages[0].content[1].source.type, "base64");
  assert.equal(body.messages[0].content[1].source.media_type, "image/png");
  assert.ok(body.messages[0].content[1].source.data.startsWith("iVBORw0KGgo"));
});

test("Anthropic request construction maps remote image links to url image blocks", () => {
  const upstreamRequest = anthropicProvider.createRequest({
    request: new Request("https://proxy.example/v1/chat/completions"),
    requestBody: {
      model: "claude-3-5-sonnet-20241022",
      messages: [
        {
          role: "user",
          content: [{ type: "image_url", image_url: { url: "https://cdn.example/cat.webp" } }],
        },
      ],
    },
    config: {
      anthropicApiKey: "sk-ant-test",
      anthropicUpstreamUrl: "https://api.anthropic.com",
    },
  });
  const body = JSON.parse(upstreamRequest.body);

  assert.deepEqual(body.messages[0].content[0], {
    type: "image",
    source: { type: "url", url: "https://cdn.example/cat.webp" },
  });
});

test("Anthropic request construction uses the messages API for plain text requests", () => {
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
    },
  });
  const body = JSON.parse(upstreamRequest.body);

  assert.match(upstreamRequest.url, /\/v1\/messages$/);
  assert.deepEqual(body.messages, [{ role: "user", content: "Hello" }]);
});

test("selectProvider defaults to OpenAI when config is omitted", () => {
  assert.equal(selectProvider("gpt-4o"), openAIProvider);
});
