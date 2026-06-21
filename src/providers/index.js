import { anthropicProvider } from "./anthropic.js";
import { geminiProvider } from "./gemini.js";
import { openAIProvider } from "./openai.js";

export const providers = {
  openai: openAIProvider,
  gemini: geminiProvider,
  anthropic: anthropicProvider,
};

export function selectProvider(modelName, config = {}) {
  if (anthropicProvider.detect(modelName, config)) return anthropicProvider;
  if (geminiProvider.detect(modelName, config)) return geminiProvider;
  return openAIProvider;
}
