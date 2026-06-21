const encoder = new TextEncoder();
const decoder = new TextDecoder();

function defaultSleep(ms) {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}

function numberOrDefault(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function splitTextByCodePoint(text) {
  return Array.from(String(text || ""));
}

export function shouldDisableOptimization(modelName, disabledModels = []) {
  const current = String(modelName || "").toLowerCase().trim();
  if (!current || !Array.isArray(disabledModels)) return false;
  return disabledModels.some((model) => {
    const candidate = String(model || "").toLowerCase().trim();
    return candidate && (current === candidate || current.includes(candidate));
  });
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

function splitChunk(chunk) {
  const { content, isCompletion } = contentFromChunk(chunk);
  if (!content) return [chunk];
  return splitTextByCodePoint(content).map((char) => chunkWithContent(chunk, char, isCompletion));
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

function calculateAdaptiveDelay(chunkSize, timeSinceLastChunk, config, isStreamEnding) {
  const minDelay = Math.max(0, numberOrDefault(config.minDelay, 5));
  const maxDelay = Math.max(minDelay, numberOrDefault(config.maxDelay, 40));
  const finalLowDelay = Math.max(0, numberOrDefault(config.finalLowDelay, minDelay));
  if (isStreamEnding) return finalLowDelay;
  if (chunkSize <= 0) return minDelay;

  const adaptiveDelayFactor = Math.max(0, Math.min(2, numberOrDefault(config.adaptiveDelayFactor, 0.5)));
  const sizeInverseFactor = 1 + Math.log(1 + Math.min(chunkSize, 200)) / Math.log(20);
  const normalizedSizeFactor = 1 / Math.max(0.5, Math.min(2, sizeInverseFactor));
  const normalizedTime = Math.min(2000, Math.max(50, timeSinceLastChunk));
  const timeFactor = Math.sqrt(normalizedTime / 300);
  const adaptiveDelay =
    minDelay + (maxDelay - minDelay) * normalizedSizeFactor * timeFactor * adaptiveDelayFactor;
  return Math.min(maxDelay, Math.max(minDelay, adaptiveDelay));
}

function updateStreamDelayState(state, chunkSize, config, now) {
  const chunkBufferSize = Math.max(1, numberOrDefault(config.chunkBufferSize, 10));
  const threshold = Math.max(0, numberOrDefault(config.minContentLengthForFastOutput, 0));
  const fastOutputDelay = Math.max(0, numberOrDefault(config.fastOutputDelay, state.currentDelay));
  const currentTime = now();
  const timeSinceLastChunk = Math.max(0, currentTime - state.lastChunkTime);
  state.lastChunkTime = currentTime;
  state.recentChunkSizes.push(chunkSize);
  if (state.recentChunkSizes.length > chunkBufferSize) state.recentChunkSizes.shift();
  state.maxSingleChunkSize = Math.max(state.maxSingleChunkSize, chunkSize);
  if (threshold && state.maxSingleChunkSize > threshold) state.fastOutputMode = true;
  if (state.fastOutputMode) {
    state.currentDelay = fastOutputDelay;
    return;
  }
  const averageChunkSize =
    state.recentChunkSizes.reduce((sum, size) => sum + size, 0) / state.recentChunkSizes.length;
  state.currentDelay = calculateAdaptiveDelay(averageChunkSize, timeSinceLastChunk, config, state.isStreamEnding);
}

export function createSSETransformer({ provider, config = {}, sleep = defaultSleep, now = () => Date.now() }) {
  const minDelay = Math.max(0, numberOrDefault(config.minDelay, 0));
  const finalLowDelay = Math.max(0, numberOrDefault(config.finalLowDelay, minDelay));

  async function processLine(line, state, writer = null) {
    const trimmed = line.trim();
    if (!trimmed) return "";
    if (sseDataFromLine(trimmed) === "[DONE]") {
      state.done = true;
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
      if (isFinishChunk) state.isStreamEnding = true;
      const pieces = isFinishChunk ? [chunk] : splitChunk(chunk);
      for (let i = 0; i < pieces.length; i++) {
        const event = eventForChunk(pieces[i]);
        if (writer) await writer.write(encoder.encode(event));
        output += event;
        const delay = isFinishChunk ? finalLowDelay : state.currentDelay ?? minDelay;
        if (writer && delay > 0 && (i < pieces.length - 1 || isFinishChunk)) await sleep(delay);
      }
      if (isFinishChunk) state.done = true;
    }
    return output;
  }

  async function transformText(text) {
    const state = { done: false, doneEmitted: false };
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
      currentDelay: minDelay,
      fastOutputMode: false,
      lastChunkTime: now(),
      maxSingleChunkSize: 0,
      recentChunkSizes: [],
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
            updateStreamDelayState(state, value.length, config, now);
            buffer += decoder.decode(value, { stream: true });
            const result = takeCompleteLines(buffer);
            buffer = result.buffer;
            const { lines } = result;
            for (const line of lines) {
              await processLine(line, state, writer);
            }
          }
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
