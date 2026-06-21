export const KV_CONFIG_KEYS = {
  UPSTREAM_URL: "upstream_url",
  OUTGOING_API_KEY: "outgoing_api_key",
  OPENAI_ENDPOINTS: "openai_endpoints",
  GEMINI_URL: "gemini_url",
  GEMINI_API_KEY: "gemini_api_key",
  GEMINI_USE_NATIVE_FETCH: "gemini_use_native_fetch",
  ANTHROPIC_URL: "anthropic_url",
  ANTHROPIC_API_KEY: "anthropic_api_key",
  ANTHROPIC_USE_NATIVE_FETCH: "anthropic_use_native_fetch",
  PROXY_API_KEY: "proxy_api_key",
  MIN_DELAY: "min_delay",
  MAX_DELAY: "max_delay",
  ADAPTIVE_DELAY_FACTOR: "adaptive_delay_factor",
  CHUNK_BUFFER_SIZE: "chunk_buffer_size",
  DISABLE_OPTIMIZATION_MODELS: "disable_optimization_models",
  MIN_CONTENT_LENGTH_FOR_FAST_OUTPUT: "min_content_length_for_fast_output",
  FAST_OUTPUT_DELAY: "fast_output_delay",
  FINAL_LOW_DELAY: "final_low_delay",
};

export const DEFAULT_CONFIG = {
  minDelay: 5,
  maxDelay: 40,
  adaptiveDelayFactor: 0.5,
  chunkBufferSize: 10,
  minContentLengthForFastOutput: 10000,
  fastOutputDelay: 3,
  finalLowDelay: 1,
  openaiEndpoints: [],
  debugLogging: false,
};

export const DEFAULT_OPENAI_URL = "https://api.openai.com/v1";
export const DEFAULT_GEMINI_URL = "https://generativelanguage.googleapis.com";
export const DEFAULT_ANTHROPIC_URL = "https://api.anthropic.com";

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Upstream-URL, X-Outgoing-API-Key, X-Anthropic-API-Key, X-Gemini-API-Key",
  "Access-Control-Max-Age": "86400",
};

export const MODEL_PREFIX_MAP = {
  "claude-": "anthropic",
  "gemini-": "gemini",
};
