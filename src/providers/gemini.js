import { DEFAULT_GEMINI_URL } from "../constants.js";
import { joinUrl } from "../http.js";
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

function extractTextFromParts(parts = []) {
  return parts
    .filter((part) => part && typeof part.text === "string")
    .map((part) => part.text)
    .join("");
}

function normalizeGeminiModel(modelName = "gemini-pro") {
  let model = String(modelName || "gemini-pro");
  if (!model.startsWith("gemini-") && !model.startsWith("models/")) model = `gemini-${model}`;
  if (!model.startsWith("models/")) model = `models/${model}`;
  return model;
}

function openAICompletionChunk({ model, index = 0, content = "", finishReason = null }) {
  return {
    id: `chatcmpl-${Date.now()}`,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index,
        delta: content ? { content } : {},
        finish_reason: finishReason,
      },
    ],
  };
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
        systemInstruction = { parts: [{ text: String(message.content || "") }] };
      } else {
        contents.push({
          role: message.role === "assistant" ? "model" : "user",
          parts: [{ text: String(message.content || "") }],
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
    const content = candidate?.content?.parts
      ? extractTextFromParts(candidate.content.parts)
      : candidate?.text || body.text || "";
    const promptTokens = body.usageMetadata?.promptTokenCount || 0;
    const completionTokens = body.usageMetadata?.candidatesTokenCount || 0;
    return {
      id: `gemini-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: body.modelId || candidate?.modelId || "gemini",
      choices: [
        {
          index: 0,
          message: { role: "assistant", content },
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
      const content = candidate.content?.parts
        ? extractTextFromParts(candidate.content.parts)
        : candidate.content?.text || candidate.text || "";
      if (content) chunks.push(openAICompletionChunk({ model, index: candidate.index || 0, content }));
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
