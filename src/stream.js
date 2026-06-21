const encoder = new TextEncoder();
const decoder = new TextDecoder();

const OBSERVATION_WINDOW = 8;
const NATURAL_FIRST_FAST_UNITS = 6;
const NATURAL_BACKLOG_FAST_THRESHOLD = 60;
const NATURAL_BACKLOG_DRAIN_THRESHOLD = 120;
const STRUCTURED_UNIT_SIZE = 48;
const STRUCTURED_LARGE_UNIT_SIZE = 80;

const graphemeSegmenter =
  typeof Intl !== "undefined" && typeof Intl.Segmenter === "function"
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

function defaultSleep(ms) {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function pushRecent(values, value) {
  values.push(value);
  if (values.length > OBSERVATION_WINDOW) values.shift();
}

function trimComparableModelName(modelName) {
  return String(modelName || "").toLowerCase().trim();
}

export function splitTextByCodePoint(text) {
  const value = String(text || "");
  if (!value) return [];
  if (!graphemeSegmenter) return Array.from(value);
  return Array.from(graphemeSegmenter.segment(value), (segment) => segment.segment);
}

export function shouldOptimizeModel(modelName, optimizationModels = []) {
  const current = trimComparableModelName(modelName);
  if (!current || !Array.isArray(optimizationModels)) return false;
  return optimizationModels.some((model) => trimComparableModelName(model) === current);
}

function sseDataFromLine(line) {
  if (!line.startsWith("data:")) return null;
  return line.slice(5).trim();
}

function contentFromChunk(chunk) {
  const choice = chunk.choices?.[0];
  if (!choice) return { content: "", isCompletion: false };
  if (choice.delta && typeof choice.delta.content === "string") {
    return { content: choice.delta.content, isCompletion: false };
  }
  if (typeof choice.text === "string") return { content: choice.text, isCompletion: true };
  return { content: "", isCompletion: false };
}

function hasNonTextPayload(chunk) {
  if (chunk?.error) return true;
  const choice = chunk.choices?.[0];
  const delta = choice?.delta || {};
  return !!(
    delta.tool_calls ||
    delta.function_call ||
    delta.reasoning_content ||
    delta.reasoning_signature ||
    choice?.tool_calls ||
    choice?.function_call
  );
}

function chunkWithContent(chunk, content, isCompletion) {
  const choice = chunk.choices[0];
  if (isCompletion) {
    return {
      ...chunk,
      choices: [{ ...choice, text: content }],
    };
  }
  return {
    ...chunk,
    choices: [{ ...choice, delta: { ...(choice.delta || {}), content } }],
  };
}

function chunkGraphemes(graphemes, size) {
  const chunks = [];
  for (let index = 0; index < graphemes.length; index += size) {
    chunks.push(graphemes.slice(index, index + size).join(""));
  }
  return chunks;
}

function isLikelyStructuredText(text) {
  const value = String(text || "");
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/^(```|~~~)/.test(trimmed)) return true;
  if (/^[\[{]/.test(trimmed) && /[\]}]$/.test(trimmed)) return true;
  if (/^\s*(const|let|var|function|class|import|export|if|for|while|return)\b/m.test(value)) return true;

  const lines = value.split(/\r\n|\n|\r/).filter((line) => line.trim());
  if (lines.length < 3) return false;
  if (lines.some((line) => /\|/.test(line)) && lines.some((line) => /^\s*\|?\s*:?-{3,}:?\s*\|/.test(line))) {
    return true;
  }

  const listLines = lines.filter((line) => /^\s*(?:[-*+]|\d+[.)])\s+/.test(line)).length;
  if (listLines >= Math.min(3, lines.length)) return true;

  const codeLikeLines = lines.filter((line) => /^\s{2,}\S/.test(line) || /[{};=<>]/.test(line)).length;
  return codeLikeLines >= 2;
}

function splitChunk(chunk) {
  if (hasNonTextPayload(chunk)) return { kind: "raw", pieces: [chunk] };
  const { content, isCompletion } = contentFromChunk(chunk);
  if (!content) return { kind: "raw", pieces: [chunk] };

  const graphemes = splitTextByCodePoint(content);
  if (graphemes.length <= 1) return { kind: "natural", pieces: [chunk] };

  const isStructured = isLikelyStructuredText(content);
  const textPieces = isStructured
    ? chunkGraphemes(graphemes, graphemes.length > 240 ? STRUCTURED_LARGE_UNIT_SIZE : STRUCTURED_UNIT_SIZE)
    : graphemes;

  return {
    kind: isStructured ? "structured" : "natural",
    pieces: textPieces.map((piece) => chunkWithContent(chunk, piece, isCompletion)),
  };
}

function hasFinishReason(chunk) {
  const choice = chunk.choices?.[0];
  return !!(choice?.finish_reason || choice?.delta?.finish_reason || choice?.stop_reason || choice?.finishReason);
}

function eventForChunk(chunk) {
  return `data: ${JSON.stringify(chunk)}\n\n`;
}

async function writeEvent(event, writer) {
  if (writer) await writer.write(encoder.encode(event));
  return event;
}

function splitLines(text) {
  return String(text).split(/\r\n|\n|\r/);
}

function takeCompleteLines(buffer, flush = false) {
  const lines = [];
  let start = 0;
  for (let i = 0; i < buffer.length; i++) {
    const char = buffer[i];
    if (char !== "\r" && char !== "\n") continue;
    if (char === "\r" && i === buffer.length - 1 && !flush) break;
    lines.push(buffer.slice(start, i));
    if (char === "\r" && buffer[i + 1] === "\n") i++;
    start = i + 1;
  }
  return { lines, buffer: buffer.slice(start) };
}

class AdaptiveStreamPacer {
  constructor(now) {
    this.now = now;
    this.lastUpstreamTime = null;
    this.recentUpstreamIntervals = [];
    this.recentUpstreamBytes = [];
    this.outputUnits = 0;
    this.isEnding = false;
  }

  observeUpstreamChunk(byteLength) {
    const currentTime = this.now();
    if (this.lastUpstreamTime !== null) {
      pushRecent(this.recentUpstreamIntervals, Math.max(0, currentTime - this.lastUpstreamTime));
    }
    this.lastUpstreamTime = currentTime;
    pushRecent(this.recentUpstreamBytes, Math.max(0, byteLength));
  }

  markEnding() {
    this.isEnding = true;
  }

  delayFor({ kind, remaining }) {
    if (this.isEnding || remaining <= 0) {
      this.outputUnits++;
      return 0;
    }

    let delay = 0;
    if (kind === "structured") {
      delay = remaining > 8 ? 0 : 1;
    } else if (this.outputUnits < NATURAL_FIRST_FAST_UNITS) {
      delay = remaining > 24 ? 1 : 0;
    } else if (remaining > NATURAL_BACKLOG_DRAIN_THRESHOLD) {
      delay = 0;
    } else if (remaining > NATURAL_BACKLOG_FAST_THRESHOLD) {
      delay = 1;
    } else {
      const upstreamBytes = average(this.recentUpstreamBytes);
      const upstreamInterval = average(this.recentUpstreamIntervals);
      if (upstreamBytes <= 128 && upstreamInterval >= 15) delay = 0;
      else if (upstreamBytes > 2048) delay = 2;
      else if (upstreamBytes > 512) delay = 3;
      else delay = 4;
    }

    this.outputUnits++;
    return delay;
  }
}

export function createSSETransformer({
  provider,
  config = {},
  sleep = defaultSleep,
  now = () => Date.now(),
  optimize = true,
}) {
  void config;

  async function processLine(line, state, writer = null) {
    const trimmed = line.trim();
    if (!trimmed) return "";
    if (sseDataFromLine(trimmed) === "[DONE]") {
      state.done = true;
      state.pacer.markEnding();
      if (state.doneEmitted) return "";
      state.doneEmitted = true;
      return writeEvent("data: [DONE]\n\n", writer);
    }

    let chunks;
    try {
      chunks = provider.convertStreamLine(trimmed) || [];
    } catch {
      return writeEvent(`${trimmed}\n\n`, writer);
    }

    let output = "";
    for (const chunk of chunks) {
      const isFinishChunk = hasFinishReason(chunk);
      if (isFinishChunk) {
        state.isStreamEnding = true;
        state.pacer.markEnding();
      }
      const { kind, pieces } = !optimize || isFinishChunk ? { kind: "raw", pieces: [chunk] } : splitChunk(chunk);
      for (let i = 0; i < pieces.length; i++) {
        const event = eventForChunk(pieces[i]);
        if (writer) await writer.write(encoder.encode(event));
        output += event;
        const remaining = pieces.length - i - 1;
        const delay = state.pacer.delayFor({ kind, remaining });
        if (writer && delay > 0 && remaining > 0) await sleep(delay);
      }
      if (isFinishChunk) state.done = true;
    }
    return output;
  }

  async function transformText(text) {
    const state = {
      done: false,
      doneEmitted: false,
      isStreamEnding: false,
      pacer: new AdaptiveStreamPacer(now),
    };
    const lines = splitLines(text);
    let output = "";
    for (const line of lines) {
      output += await processLine(line, state);
    }
    if (!state.doneEmitted) output += "data: [DONE]\n\n";
    return output;
  }

  function transformStream(inputStream) {
    const state = {
      done: false,
      doneEmitted: false,
      isStreamEnding: false,
      pacer: new AdaptiveStreamPacer(now),
    };
    return new ReadableStream({
      async start(controller) {
        const reader = inputStream.getReader();
        const writer = {
          write: (chunk) => {
            controller.enqueue(chunk);
            return Promise.resolve();
          },
        };
        let buffer = "";
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            state.pacer.observeUpstreamChunk(value.length);
            buffer += decoder.decode(value, { stream: true });
            const result = takeCompleteLines(buffer);
            buffer = result.buffer;
            for (const line of result.lines) {
              await processLine(line, state, writer);
            }
          }
          state.pacer.markEnding();
          buffer += decoder.decode();
          const result = takeCompleteLines(buffer, true);
          buffer = result.buffer;
          for (const line of result.lines) {
            await processLine(line, state, writer);
          }
          if (buffer.trim()) await processLine(buffer, state, writer);
          if (!state.doneEmitted) controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          controller.error(error);
        } finally {
          reader.releaseLock();
        }
      },
    });
  }

  return { transformText, transformStream };
}
