# LLM Stream Optimizer

[中文文档请见 README-CN.md](README-CN.md)

LLM Stream Optimizer is a lightweight Cloudflare Workers proxy for OpenAI-compatible clients. It can route requests to OpenAI-compatible, Anthropic, and Google Gemini upstream APIs, normalize selected responses into OpenAI-style output, and smooth streaming responses so large chunks are emitted more naturally.

> [!WARNING]
> This project is currently in paused / limited maintenance mode. The repository is kept available for existing users and self-hosting, but new features and security fixes are not guaranteed.

## Features

- OpenAI-compatible proxy endpoint for chat completions and model listing.
- Multiple OpenAI-compatible upstream endpoints with optional model routing.
- Anthropic and Gemini upstream support with OpenAI-style response conversion.
- Whitelist-based streaming optimization that automatically adapts to upstream chunk cadence and content shape.
- Web administration dashboard at `/admin`.
- Optional Cloudflare KV storage for runtime configuration.
- ShadowFetch / native fetch switching for upstream requests that need fewer Cloudflare-added headers.

## Requirements

- A Cloudflare account with Workers enabled.
- A Cloudflare Workers KV namespace if you want persistent dashboard configuration.
- Node.js 18 or newer for local Wrangler workflows.
- One or more upstream LLM API keys.

## Quick Start With Wrangler

Install dependencies:

```bash
npm install
```

Copy the local development environment example:

```bash
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars` and set at least:

```ini
PROXY_API_KEY="replace-with-your-password-and-proxy-key"
```

Start local development:

```bash
npm run dev
```

Open the local Worker URL, then go to `/admin` to configure upstream APIs.

Build the copy-and-paste single-file Worker:

```bash
npm run build
```

The source of truth is the modular code in `src/`. The root [`worker.js`](worker.js) file is a generated artifact produced by `npm run build`; do not edit it by hand.

Before deploying, create a KV namespace and fill the `CONFIG_KV` binding in `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "CONFIG_KV"
id = "your-production-kv-namespace-id"
preview_id = "your-preview-kv-namespace-id"
```

Validate the generated Worker and Wrangler config with a dry run:

```bash
npm run check
```

Then deploy:

```bash
npm run deploy
```

## Manual Cloudflare Dashboard Deployment

If you prefer the original copy-and-paste deployment flow:

1. Create a new Cloudflare Worker.
2. Run `npm run build`.
3. Copy all content from the generated [`worker.js`](worker.js) into the Workers editor and deploy it.
4. In Workers settings, add a secret named `PROXY_API_KEY`. This value is both the proxy API key and the `/admin` login password.
5. Create a Workers KV namespace.
6. Add a KV binding named `CONFIG_KV` and point it to the namespace you created.
7. Open your Worker domain and visit `/admin`.

## Configuration

### Production Secrets And Bindings

- `PROXY_API_KEY`: Proxy API key and web dashboard login password. Use a strong value for any shared or production deployment.
- `CONFIG_KV`: KV namespace binding used to store API endpoint and stream optimization configuration. Without this binding, the Worker can still run from environment variables, but dashboard changes cannot be persisted.

### Optional Environment Variables

- `OPENAI_API_KEY`: Default OpenAI-compatible upstream API key.
- `UPSTREAM_URL`: Default OpenAI-compatible upstream base URL. Defaults to `https://api.openai.com/v1`.
- `OPENAI_ENDPOINTS`: JSON array for multiple OpenAI-compatible endpoints.
- `GEMINI_API_KEY`: Google Gemini API key.
- `GEMINI_URL`: Gemini API base URL. Defaults to `https://generativelanguage.googleapis.com`.
- `GEMINI_USE_NATIVE_FETCH`: Set to `false` to disable native fetch for Gemini.
- `ANTHROPIC_API_KEY`: Anthropic API key.
- `ANTHROPIC_URL`: Anthropic API base URL. Defaults to `https://api.anthropic.com`.
- `ANTHROPIC_USE_NATIVE_FETCH`: Set to `false` to disable native fetch for Anthropic.
- `STREAM_OPTIMIZATION_MODELS`: JSON array or comma-separated list of exact model names that should use adaptive stream optimization. Empty by default.

Most runtime settings can also be configured from the `/admin` dashboard when `CONFIG_KV` is bound.

### Stream Optimization

Streaming optimization is opt-in by model. Add exact model names to `STREAM_OPTIMIZATION_MODELS` or the `/admin` whitelist to enable it. Models that are not listed pass through the upstream SSE stream unchanged.

The optimizer no longer uses manual delay tuning. When enabled, it observes upstream chunk cadence and content shape at runtime: natural language can be smoothed from large bursts, already-small streams stay close to pass-through, and code, JSON, tables, and long lists are emitted in larger fast chunks.

## API Usage

Use the deployed Worker URL as an OpenAI-compatible base URL:

```bash
curl https://your-worker.example.workers.dev/v1/models \
  -H "Authorization: Bearer $PROXY_API_KEY"
```

Model listing requests are intentionally permissive in the current Worker implementation so clients can discover configured models. Chat completion requests require the configured proxy API key when `PROXY_API_KEY` is set.

## Security Notes

- Do not commit `.dev.vars`, real API keys, KV namespace ids that you consider private, or dashboard credentials.
- Use a strong `PROXY_API_KEY`; it protects both proxy requests and the administration dashboard.
- Treat the dashboard as an administrative surface. Avoid exposing it through shared credentials.
- This project is in limited maintenance mode, so review the code and Cloudflare settings before production use.

See [SECURITY.md](SECURITY.md) for more details.

## Development Commands

```bash
npm run dev
npm test
npm run build
npm run check
npm run deploy
```

- `npm run dev`: runs Wrangler against `src/worker.js` with `wrangler.toml` for local development.
- `npm run build`: bundles `src/worker.js` into the generated, copy-and-paste root `worker.js` artifact.
- `npm run check`: runs `npm run build`, then validates the generated `worker.js` with `wrangler deploy --dry-run`.
- `npm run deploy`: runs `npm run build`, then deploys the generated `worker.js` through `wrangler.toml`.

Always make source edits in `src/`, then rerun `npm run build`. Hand edits to the generated root `worker.js` will be overwritten.

## Source Layout

- `src/worker.js`: Worker entrypoint and top-level route split.
- `src/proxy.js`: OpenAI-compatible proxy request flow.
- `src/providers/`: OpenAI, Gemini, and Anthropic request/response adapters.
- `src/stream.js`: SSE parsing, OpenAI chunk normalization, model whitelist checks, and adaptive pacing.
- `src/admin/`: login/session handling and the `/admin` dashboard.
- `src/config.js`: environment/KV config loading, masked secret handling, and persistence.

## License

Licensed under the [Apache License 2.0](LICENSE).

## Sponsor

CDN acceleration and security protection for this project are sponsored by Tencent EdgeOne.

![EdgeOne](https://edgeone.ai/media/34fe3a45-492d-4ea4-ae5d-ea1087ca7b4b.png)

[Best Asian CDN, Edge, and Secure Solutions - Tencent EdgeOne](https://edgeone.ai/?from=github)
