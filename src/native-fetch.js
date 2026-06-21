import { connect } from "cloudflare:sockets";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const HEADER_FILTER_RE = /^(host|accept-encoding|cf-|content-length)$/i;

function concatUint8Arrays(...arrays) {
  const total = arrays.reduce((sum, array) => sum + array.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const array of arrays) {
    result.set(array, offset);
    offset += array.length;
  }
  return result;
}

function headersToString(headers) {
  return Array.from(headers.entries())
    .map(([key, value]) => `${key}: ${value}`)
    .join("\r\n");
}

function normalizeBody(body) {
  if (!body) return null;
  if (typeof body === "string") return encoder.encode(body);
  if (body instanceof Uint8Array) return body;
  if (body instanceof ArrayBuffer) return new Uint8Array(body);
  throw new Error("Unsupported nativeFetch request body type");
}

async function requestToParts(req, dstUrl) {
  const targetUrl = new URL(dstUrl);
  const headers = new Headers();
  const sourceHeaders = req instanceof Request ? req.headers : new Headers(req.headers || {});
  for (const [key, value] of sourceHeaders.entries()) {
    if (!HEADER_FILTER_RE.test(key)) headers.set(key, value);
  }
  headers.set("Host", targetUrl.hostname);
  headers.set("accept-encoding", "identity");

  let body = null;
  if (req instanceof Request && req.body) {
    const chunks = [];
    for await (const chunk of req.clone().body) chunks.push(chunk);
    body = concatUint8Arrays(...chunks);
  } else {
    body = normalizeBody(req.body);
  }
  headers.set("Content-Length", body ? String(body.length) : "0");

  return {
    method: req.method || "GET",
    targetUrl,
    headers,
    body,
  };
}

function parseHeaders(buffer) {
  const text = decoder.decode(buffer);
  const headerEnd = text.indexOf("\r\n\r\n");
  if (headerEnd === -1) return null;
  const lines = text.slice(0, headerEnd).split("\r\n");
  const statusMatch = lines[0].match(/HTTP\/1\.[01]\s+(\d+)\s*(.*)/);
  if (!statusMatch) throw new Error(`Invalid HTTP status line: ${lines[0]}`);
  const headers = new Headers();
  for (const line of lines.slice(1)) {
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    headers.append(line.slice(0, separator).trim(), line.slice(separator + 1).trim());
  }
  return {
    status: Number(statusMatch[1]),
    statusText: statusMatch[2],
    headers,
    headerEnd,
  };
}

async function* readChunkedBody(reader, buffer = new Uint8Array()) {
  while (true) {
    let lineEnd = -1;
    for (let i = 0; i < buffer.length - 1; i++) {
      if (buffer[i] === 13 && buffer[i + 1] === 10) {
        lineEnd = i;
        break;
      }
    }
    if (lineEnd === -1) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer = concatUint8Arrays(buffer, value);
      continue;
    }
    const size = Number.parseInt(decoder.decode(buffer.slice(0, lineEnd)).split(";")[0], 16);
    if (!size) break;
    buffer = buffer.slice(lineEnd + 2);
    while (buffer.length < size + 2) {
      const { value, done } = await reader.read();
      if (done) throw new Error("Unexpected EOF while reading chunked response");
      buffer = concatUint8Arrays(buffer, value);
    }
    yield buffer.slice(0, size);
    buffer = buffer.slice(size + 2);
  }
}

async function parseResponse(reader) {
  let buffer = new Uint8Array();
  while (true) {
    const { value, done } = await reader.read();
    if (value) {
      buffer = concatUint8Arrays(buffer, value);
      const parsed = parseHeaders(buffer);
      if (!parsed) continue;
      const bodyStart = parsed.headerEnd + 4;
      const initialData = buffer.slice(bodyStart);
      const isChunked = parsed.headers.get("transfer-encoding")?.toLowerCase().includes("chunked");
      const contentLength = Number.parseInt(parsed.headers.get("content-length") || "0", 10);
      return new Response(
        new ReadableStream({
          async start(controller) {
            try {
              if (isChunked) {
                for await (const chunk of readChunkedBody(reader, initialData)) controller.enqueue(chunk);
              } else {
                let received = initialData.length;
                if (initialData.length) controller.enqueue(initialData);
                while (!contentLength || received < contentLength) {
                  const next = await reader.read();
                  if (next.done) break;
                  received += next.value.length;
                  controller.enqueue(next.value);
                }
              }
              controller.close();
            } catch (error) {
              controller.error(error);
            }
          },
        }),
        {
          status: parsed.status,
          statusText: parsed.statusText,
          headers: parsed.headers,
        },
      );
    }
    if (done) break;
  }
  throw new Error("Unable to parse upstream response");
}

export async function nativeFetch(req, dstUrl) {
  const { method, targetUrl, headers, body } = await requestToParts(req, dstUrl);
  if (!/^https?:$/.test(targetUrl.protocol)) {
    throw new Error("nativeFetch only supports HTTP and HTTPS URLs");
  }
  const port = Number(targetUrl.port || (targetUrl.protocol === "https:" ? 443 : 80));
  const socket = await connect(
    { hostname: targetUrl.hostname, port },
    { secureTransport: targetUrl.protocol === "https:" ? "on" : "off" },
  );
  const writer = socket.writable.getWriter();
  const requestLine =
    `${method} ${targetUrl.pathname}${targetUrl.search} HTTP/1.1\r\n` +
    `${headersToString(headers)}\r\n\r\n`;
  await writer.write(encoder.encode(requestLine));
  if (body) await writer.write(body);
  return parseResponse(socket.readable.getReader());
}
