import { DEFAULT_ANTHROPIC_URL } from "../constants.js";
import { joinUrl } from "../http.js";
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

function openAICompletionChunk({ model = "claude-3", content = "", finishReason = null }) {
  return {
    id: `anthropic-${Date.now()}`,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        delta: content ? { content } : {},
        finish_reason: finishReason,
      },
    ],
  };
}

export const anthropicProvider = {
  id: "anthropic",

  detect(modelName, config = {}) {
    return !!config.anthropicEnabled && String(modelName || "").toLowerCase().startsWith("claude-");
  },

  createRequest({ request, requestBody, config }) {
    const apiKey = request.headers.get("X-Anthropic-API-Key") || selectWeightedKey(config.anthropicApiKey);
    const prompt = (requestBody.messages || [])
      .map((message) => `${message.role === "assistant" ? "Assistant" : "Human"}: ${message.content || ""}`)
      .join("\n\n");
    return {
      method: "POST",
      headers: new Headers({
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        model: String(requestBody.model || ""),
        prompt: `\n\n${prompt}\n\nAssistant:`,
        max_tokens_to_sample: requestBody.max_tokens || 4000,
        temperature: requestBody.temperature || 0.7,
        stream: requestBody.stream,
      }),
      url: joinUrl(config.anthropicUpstreamUrl || DEFAULT_ANTHROPIC_URL, "/v1/complete"),
      useNativeFetch: config.anthropicUseNativeFetch,
    };
  },

  convertResponseBody(body) {
    if (body.error) return body;
    let content = "";
    if (Array.isArray(body.content)) {
      content = body.content
        .filter((block) => block.type === "text")
        .map((block) => block.text || "")
        .join("");
    } else {
      content = body.completion || body.text || "";
    }
    const promptTokens = body.usage?.input_tokens || 0;
    const completionTokens = body.usage?.output_tokens || 0;
    return {
      id: `anthropic-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: body.model || "claude-3",
      choices: [
        {
          index: 0,
          message: { role: "assistant", content },
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
    if (body.type === "content_block_delta" && body.delta?.text) {
      return [openAICompletionChunk({ content: body.delta.text })];
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
