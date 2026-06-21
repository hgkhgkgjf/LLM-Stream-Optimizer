const SECRET_FIELD_RE = /(authorization|api[-_]?key|token|secret|password)/i;

function redactValue(value) {
  if (typeof value !== "string") return value;
  if (value.length <= 8) return "***";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export function redactSecrets(input) {
  if (!input || typeof input !== "object") return input;
  if (input instanceof Headers) {
    const output = {};
    for (const [key, value] of input.entries()) {
      output[key] = SECRET_FIELD_RE.test(key) ? redactValue(value) : value;
    }
    return output;
  }
  if (Array.isArray(input)) return input.map(redactSecrets);
  const output = {};
  for (const [key, value] of Object.entries(input)) {
    output[key] = SECRET_FIELD_RE.test(key) ? redactValue(String(value)) : redactSecrets(value);
  }
  return output;
}

export function createLogger(enabled = false) {
  const debug = (...args) => {
    if (enabled) console.log(...args.map(redactSecrets));
  };
  return {
    debug,
    info: debug,
    warn: (...args) => console.warn(...args.map(redactSecrets)),
    error: (...args) => console.error(...args.map(redactSecrets)),
  };
}
