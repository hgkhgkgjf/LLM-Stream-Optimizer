import { DEFAULT_GEMINI_URL } from "../constants.js";
import { joinUrl, parseImageUrl, textFromMessageContent } from "../http.js";
import { selectWeightedKey } from "../routing.js";

const FINISH_REASONS = {
  STOP: "stop",
  MAX_TOKENS: "length",
  SAFETY: "content_filter",
  RECITATION: "content_filter",
  PROHIBITED_CONTENT: "content_filter",
  SPII: "content_filter",
};

function sseDataFromLine(line) {
  if (!line.startsWith("data:")) return null;
  return line.slice(5).trim();
}

function extractPartFields(parts = []) {
  const fields = {
    content: "",
    reasoningContent: "",
    reasoningSignature: "",
  };
  for (const part of parts) {
    if (!part) continue;
    if (typeof part.text === "string") {
      if (part.thought === true) fields.reasoningContent += part.text;
      else fields.content += part.text;
    }
    if (part.thoughtSignature) fields.reasoningSignature += String(part.thoughtSignature);
  }
  return fields;
}

function normalizeGeminiModel(modelName = "gemini-pro") {
  let model = String(modelName || "gemini-pro");
  if (!model.startsWith("gemini-") && !model.startsWith("models/")) model = `gemini-${model}`;
  if (!model.startsWith("models/")) model = `models/${model}`;
  return model;
}

// Converts OpenAI-style message content into Gemini `parts`, mapping image
// parts to `inlineData` (data URIs) or `fileData` (remote URLs). Adjacent text
// segments are merged so plain-text messages stay a single part.
function partsFromMessageContent(content) {
  if (!Array.isArray(content)) {
    return [{ text: String(content || "") }];
  }
  const parts = [];
  let text = "";
  const flushText = () => {
    if (text) {
      parts.push({ text });
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
        parts.push({ inlineData: { mimeType: image.mediaType, data: image.data } });
      } else {
        parts.push({ fileData: { mimeType: image.mediaType, fileUri: image.url } });
      }
    }
  }
  flushText();
  if (parts.length === 0) parts.push({ text: "" });
  return parts;
}

function openAICompletionChunk({
  model,
  index = 0,
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
    id: `chatcmpl-${Date.now()}`,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index,
        delta,
        finish_reason: finishReason,
      },
    ],
  };
}

function firstObject(...values) {
  return values.find((value) => value && typeof value === "object" && !Array.isArray(value));
}

function copyOptionalThinkingField(target, source, inputName, outputName, coerce = (value) => value) {
  if (!source || !Object.hasOwn(source, inputName)) return;
  const value = coerce(source[inputName]);
  if (value !== undefined) target[outputName] = value;
}

function normalizeThinkingConfig(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const output = {};
  copyOptionalThinkingField(output, input, "includeThoughts", "includeThoughts", (value) =>
    typeof value === "boolean" ? value : undefined,
  );
  copyOptionalThinkingField(output, input, "include_thoughts", "includeThoughts", (value) =>
    typeof value === "boolean" ? value : undefined,
  );
  copyOptionalThinkingField(output, input, "thinkingBudget", "thinkingBudget", (value) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  });
  copyOptionalThinkingField(output, input, "thinking_budget", "thinkingBudget", (value) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  });
  copyOptionalThinkingField(output, input, "thinkingLevel", "thinkingLevel", (value) =>
    typeof value === "string" && value.trim() ? value.trim() : undefined,
  );
  copyOptionalThinkingField(output, input, "thinking_level", "thinkingLevel", (value) =>
    typeof value === "string" && value.trim() ? value.trim() : undefined,
  );
  return Object.keys(output).length ? output : null;
}

function thinkingConfigFromRequest(requestBody = {}, modelName = "") {
  const extraBody = firstObject(requestBody.extra_body, requestBody.extraBody);
  const nestedExtraBody = firstObject(extraBody?.extra_body, extraBody?.extraBody);
  const google = firstObject(extraBody?.google, nestedExtraBody?.google);
  const explicit = normalizeThinkingConfig(
    firstObject(
      requestBody.thinkingConfig,
      requestBody.thinking_config,
      google?.thinkingConfig,
      google?.thinking_config,
    ),
  );
  if (explicit) return explicit;

  const effort = typeof requestBody.reasoning_effort === "string" ? requestBody.reasoning_effort.trim() : "";
  if (!effort) return null;
  const normalizedEffort = effort.toLowerCase();
  const normalizedModel = String(modelName || "").toLowerCase();
  if (normalizedModel.includes("gemini-3")) {
    const levels = {
      minimal: normalizedModel.includes("gemini-3.1-pro") ? "low" : "minimal",
      low: "low",
      medium: "medium",
      high: "high",
    };
    if (Object.hasOwn(levels, normalizedEffort)) return { thinkingLevel: levels[normalizedEffort] };
    return null;
  }
  const budgets = {
    none: 0,
    minimal: 1024,
    low: 1024,
    medium: 8192,
    high: 24576,
  };
  if (Object.hasOwn(budgets, normalizedEffort)) return { thinkingBudget: budgets[normalizedEffort] };
  return null;
}

export const geminiProvider = {
  id: "gemini",

  detect(modelName, config = {}) {
    return !!config.geminiEnabled && String(modelName || "").toLowerCase().startsWith("gemini-");
  },

  createRequest({ request, requestBody, config }) {
    const apiKey = request.headers.get("X-Gemini-API-Key") || selectWeightedKey(config.geminiApiKey);
    const modelName = normalizeGeminiModel(requestBody.model);
    const isStreamRequest = requestBody.stream === true;
    const task = isStreamRequest ? "streamGenerateContent" : "generateContent";
    let url = joinUrl(config.geminiUpstreamUrl || DEFAULT_GEMINI_URL, `/v1beta/${modelName}:${task}`);
    if (isStreamRequest) url += "?alt=sse";

    let systemInstruction = null;
    const contents = [];
    for (const message of requestBody.messages || []) {
      if (message.role === "system") {
        systemInstruction = { parts: [{ text: textFromMessageContent(message.content) }] };
      } else {
        contents.push({
          role: message.role === "assistant" ? "model" : "user",
          parts: partsFromMessageContent(message.content),
        });
      }
    }
    if (contents.length === 0) contents.push({ role: "user", parts: [{ text: "Hello" }] });

    const body = {
      contents,
      generationConfig: {
        temperature: requestBody.temperature ?? 1,
        maxOutputTokens: requestBody.max_tokens ?? 8192,
        topP: requestBody.top_p ?? 0.95,
        topK: requestBody.top_k ?? 40,
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "OFF" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "OFF" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "OFF" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "OFF" },
        { category: "HARM_CATEGORY_CIVIC_INTEGRITY", threshold: "BLOCK_NONE" },
      ],
    };
    const thinkingConfig = thinkingConfigFromRequest(requestBody, requestBody.model);
    if (thinkingConfig) body.generationConfig.thinkingConfig = thinkingConfig;
    if (systemInstruction) body.systemInstruction = systemInstruction;

    return {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
        "x-goog-api-client": "llm-stream-optimizer/1.0",
      },
      body: JSON.stringify(body),
      url,
      useNativeFetch: config.geminiUseNativeFetch,
    };
  },

  convertResponseBody(body) {
    if (body.error) return body;
    const candidate = body.candidates?.[0];
    const partFields = candidate?.content?.parts ? extractPartFields(candidate.content.parts) : null;
    const content = partFields ? partFields.content : candidate?.text || body.text || "";
    const promptTokens = body.usageMetadata?.promptTokenCount || 0;
    const completionTokens = body.usageMetadata?.candidatesTokenCount || 0;
    const message = { role: "assistant", content };
    if (partFields?.reasoningContent) message.reasoning_content = partFields.reasoningContent;
    if (partFields?.reasoningSignature) message.reasoning_signature = partFields.reasoningSignature;
    return {
      id: `gemini-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: body.modelId || candidate?.modelId || "gemini",
      choices: [
        {
          index: 0,
          message,
          finish_reason: FINISH_REASONS[candidate?.finishReason] || candidate?.finishReason || "stop",
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
    const chunks = [];
    for (const candidate of body.candidates || []) {
      const model = body.modelId || candidate.modelId || "gemini";
      if (candidate.content?.parts) {
        for (const part of candidate.content.parts) {
          if (!part) continue;
          const partFields = extractPartFields([part]);
          if (partFields.reasoningContent || partFields.reasoningSignature) {
            chunks.push(
              openAICompletionChunk({
                model,
                index: candidate.index || 0,
                reasoningContent: partFields.reasoningContent,
                reasoningSignature: partFields.reasoningSignature,
              }),
            );
          }
          if (partFields.content) {
            chunks.push(openAICompletionChunk({ model, index: candidate.index || 0, content: partFields.content }));
          }
        }
      } else {
        const content = candidate.content?.text || candidate.text || "";
        if (content) chunks.push(openAICompletionChunk({ model, index: candidate.index || 0, content }));
      }
      if (candidate.finishReason) {
        chunks.push(
          openAICompletionChunk({
            model,
            index: candidate.index || 0,
            finishReason: FINISH_REASONS[candidate.finishReason] || candidate.finishReason,
          }),
        );
      }
    }
    return chunks;
  },
};
