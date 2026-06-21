import { DEFAULT_ANTHROPIC_URL } from "../constants.js";
import { joinUrl, messageContentHasImage, parseImageUrl, textFromMessageContent } from "../http.js";
import { selectWeightedKey } from "../routing.js";

const FINISH_REASONS = {
  end_turn: "stop",
  stop_sequence: "stop",
  max_tokens: "length",
  tool_use: "tool_calls",
};

function sseDataFromLine(line) {
  if (!line.startsWith("data:")) return null;
  return line.slice(5).trim();
}

function normalizeFinishReason(reason) {
  return FINISH_REASONS[reason] || reason || "stop";
}

function openAICompletionChunk({
  model = "claude-3",
  content = "",
  reasoningContent = "",
  reasoningSignature = "",
  finishReason = null,
}) {
  const delta = {};
  if (reasoningContent) delta.reasoning_content = reasoningContent;
  if (reasoningSignature) delta.reasoning_signature = reasoningSignature;
  if (content) delta.content = content;
  return {
    id: `anthropic-${Date.now()}`,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        delta,
        finish_reason: finishReason,
      },
    ],
  };
}

function firstObject(...values) {
  return values.find((value) => value && typeof value === "object" && !Array.isArray(value));
}

function thinkingConfigFromRequest(requestBody = {}) {
  const extraBody = firstObject(requestBody.extra_body, requestBody.extraBody);
  const nestedExtraBody = firstObject(extraBody?.extra_body, extraBody?.extraBody);
  const anthropic = firstObject(extraBody?.anthropic, nestedExtraBody?.anthropic);
  return firstObject(requestBody.thinking, anthropic?.thinking, extraBody?.thinking, nestedExtraBody?.thinking);
}

// Converts OpenAI-style message content into Anthropic content blocks, mapping
// image parts to `base64` (data URIs) or `url` image sources. Adjacent text
// segments are merged into a single text block.
function contentBlocksFromMessageContent(content) {
  const blocks = [];
  let text = "";
  const flushText = () => {
    if (text) {
      blocks.push({ type: "text", text });
      text = "";
    }
  };
  for (const part of content) {
    if (!part) continue;
    if (typeof part.text === "string") {
      text += part.text;
      continue;
    }
    if (part.type === "image_url" || part.type === "input_image") {
      const image = parseImageUrl(part.image_url);
      if (!image) continue;
      flushText();
      if (image.kind === "base64") {
        blocks.push({
          type: "image",
          source: { type: "base64", media_type: image.mediaType, data: image.data },
        });
      } else {
        blocks.push({ type: "image", source: { type: "url", url: image.url } });
      }
    }
  }
  flushText();
  return blocks;
}

function createMessagesRequestBody(requestBody, thinking) {
  const messages = [];
  const systemMessages = [];
  for (const message of requestBody.messages || []) {
    if (message.role === "system") {
      const content = textFromMessageContent(message.content);
      if (content) systemMessages.push(content);
      continue;
    }
    const role = message.role === "assistant" ? "assistant" : "user";
    if (messageContentHasImage(message.content)) {
      const blocks = contentBlocksFromMessageContent(message.content);
      messages.push({ role, content: blocks.length ? blocks : "" });
    } else {
      messages.push({ role, content: textFromMessageContent(message.content) });
    }
  }
  if (messages.length === 0) messages.push({ role: "user", content: "Hello" });

  const body = {
    model: String(requestBody.model || ""),
    messages,
    max_tokens: requestBody.max_tokens || 4000,
    stream: requestBody.stream,
  };
  if (systemMessages.length) body.system = systemMessages.join("\n\n");
  if (thinking) body.thinking = thinking;
  if (requestBody.temperature !== undefined) body.temperature = requestBody.temperature;
  if (requestBody.top_p !== undefined) body.top_p = requestBody.top_p;
  if (requestBody.stop !== undefined) body.stop_sequences = Array.isArray(requestBody.stop) ? requestBody.stop : [requestBody.stop];
  return body;
}

export const anthropicProvider = {
  id: "anthropic",

  detect(modelName, config = {}) {
    return !!config.anthropicEnabled && String(modelName || "").toLowerCase().startsWith("claude-");
  },

  createRequest({ request, requestBody, config }) {
    const apiKey = request.headers.get("X-Anthropic-API-Key") || selectWeightedKey(config.anthropicApiKey);
    const thinking = thinkingConfigFromRequest(requestBody);
    return {
      method: "POST",
      headers: new Headers({
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      }),
      body: JSON.stringify(createMessagesRequestBody(requestBody, thinking)),
      url: joinUrl(config.anthropicUpstreamUrl || DEFAULT_ANTHROPIC_URL, "/v1/messages"),
      useNativeFetch: config.anthropicUseNativeFetch,
    };
  },

  convertResponseBody(body) {
    if (body.error) return body;
    let content = "";
    let reasoningContent = "";
    let reasoningSignature = "";
    if (Array.isArray(body.content)) {
      for (const block of body.content) {
        if (block?.type === "text") content += block.text || "";
        if (block?.type === "thinking") {
          reasoningContent += block.thinking || block.text || "";
          if (block.signature) reasoningSignature += String(block.signature);
        }
      }
    } else {
      content = body.completion || body.text || "";
    }
    const promptTokens = body.usage?.input_tokens || 0;
    const completionTokens = body.usage?.output_tokens || 0;
    const message = { role: "assistant", content };
    if (reasoningContent) message.reasoning_content = reasoningContent;
    if (reasoningSignature) message.reasoning_signature = reasoningSignature;
    return {
      id: `anthropic-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: body.model || "claude-3",
      choices: [
        {
          index: 0,
          message,
          finish_reason: normalizeFinishReason(body.stop_reason),
        },
      ],
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
      },
    };
  },

  convertStreamLine(line) {
    const data = sseDataFromLine(line);
    if (data === null) return [];
    if (!data || data === "[DONE]") return [];
    const body = JSON.parse(data);
    if (body.error) return [body];
    if (body.type === "content_block_delta") {
      if (body.delta?.thinking) {
        return [openAICompletionChunk({ reasoningContent: body.delta.thinking })];
      }
      if (body.delta?.signature) {
        return [openAICompletionChunk({ reasoningSignature: body.delta.signature })];
      }
      if (body.delta?.text) {
        return [openAICompletionChunk({ content: body.delta.text })];
      }
    }
    if (body.type === "completion") {
      const chunks = [];
      if (body.completion) chunks.push(openAICompletionChunk({ content: body.completion }));
      if (body.stop_reason) {
        chunks.push(openAICompletionChunk({ finishReason: normalizeFinishReason(body.stop_reason) }));
      }
      return chunks;
    }
    if (body.type === "message_delta" && body.delta?.stop_reason) {
      return [openAICompletionChunk({ finishReason: normalizeFinishReason(body.delta.stop_reason) })];
    }
    if (body.type === "message_stop") {
      return [openAICompletionChunk({ finishReason: "stop" })];
    }
    return [];
  },
};
