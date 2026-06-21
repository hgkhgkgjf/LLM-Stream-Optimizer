# LLM Stream Optimizer

[English README](README.md)

LLM Stream Optimizer 是一个基于 Cloudflare Workers 的轻量级 LLM API 代理。它面向 OpenAI 兼容客户端，可以接入 OpenAI 兼容接口、Anthropic 和 Google Gemini 上游 API，并把部分响应统一转换为 OpenAI 风格，同时对流式输出进行平滑优化。

> [!WARNING]
> 本项目当前处于暂停 / 有限维护状态。仓库会继续保留，方便已有用户自托管和参考，但不保证持续新增功能或及时修复安全问题。

## 功能

- 提供 OpenAI 兼容的代理接口和模型列表接口。
- 支持多个 OpenAI 兼容上游端点，并可按模型路由。
- 支持 Anthropic 和 Gemini 上游，并转换为 OpenAI 风格响应。
- 支持基于模型白名单的流式输出优化，可根据上游 chunk 节奏和内容形态自动适配。
- 内置 `/admin` Web 管理页面。
- 可使用 Cloudflare KV 持久化运行时配置。
- 支持在原生 fetch 和 ShadowFetch 之间切换，以减少部分 Cloudflare 自动添加的上游请求头。

## 环境要求

- 已启用 Workers 的 Cloudflare 账号。
- 如需持久化管理页配置，需要一个 Cloudflare Workers KV 命名空间。
- 本地 Wrangler 工作流需要 Node.js 18 或更高版本。
- 至少一个上游 LLM API Key。

## 使用 Wrangler 部署

安装依赖：

```bash
npm install
```

复制本地开发环境变量模板：

```bash
cp .dev.vars.example .dev.vars
```

编辑 `.dev.vars`，至少设置：

```ini
PROXY_API_KEY="替换为你的代理密钥和管理页密码"
```

启动本地开发：

```bash
npm run dev
```

打开本地 Worker 地址，然后访问 `/admin` 配置上游 API。

部署前，请先创建 KV 命名空间，并在 `wrangler.toml` 中填写 `CONFIG_KV` 绑定：

```toml
[[kv_namespaces]]
binding = "CONFIG_KV"
id = "你的生产 KV namespace id"
preview_id = "你的预览 KV namespace id"
```

然后部署：

```bash
npm run deploy
```

## Cloudflare 控制台手动部署

如果你更喜欢原始的复制粘贴方式：

1. 新建一个 Cloudflare Worker。
2. 复制 [`worker.js`](worker.js) 中的全部内容，粘贴到 Workers 编辑器并部署。
3. 在 Workers 设置中添加一个名为 `PROXY_API_KEY` 的密钥。它同时是代理 API Key 和 `/admin` 登录密码。
4. 创建一个 Workers KV 命名空间。
5. 添加 KV 绑定，变量名设置为 `CONFIG_KV`，并选择刚刚创建的 KV 命名空间。
6. 打开你的 Worker 域名并访问 `/admin`。

## 配置

### 生产环境密钥和绑定

- `PROXY_API_KEY`：代理 API Key，同时也是 Web 管理页登录密码。共享或生产部署请使用强密钥。
- `CONFIG_KV`：KV 命名空间绑定，用于存储 API 端点和流式优化配置。没有此绑定时，Worker 仍可读取环境变量运行，但管理页修改无法持久化。

### 可选环境变量

- `OPENAI_API_KEY`：默认 OpenAI 兼容上游 API Key。
- `UPSTREAM_URL`：默认 OpenAI 兼容上游基础地址，默认值为 `https://api.openai.com/v1`。
- `OPENAI_ENDPOINTS`：多个 OpenAI 兼容端点的 JSON 数组。
- `GEMINI_API_KEY`：Google Gemini API Key。
- `GEMINI_URL`：Gemini API 基础地址，默认值为 `https://generativelanguage.googleapis.com`。
- `GEMINI_USE_NATIVE_FETCH`：设为 `false` 可关闭 Gemini 原生 fetch。
- `ANTHROPIC_API_KEY`：Anthropic API Key。
- `ANTHROPIC_URL`：Anthropic API 基础地址，默认值为 `https://api.anthropic.com`。
- `ANTHROPIC_USE_NATIVE_FETCH`：设为 `false` 可关闭 Anthropic 原生 fetch。
- `STREAM_OPTIMIZATION_MODELS`：启用自适应流式优化的精确模型名列表，支持 JSON 数组或逗号分隔字符串，默认空列表。

绑定 `CONFIG_KV` 后，大多数运行时设置也可以通过 `/admin` 管理页配置。

### 流式输出优化

流式优化按模型白名单启用。将精确模型名加入 `STREAM_OPTIMIZATION_MODELS` 或 `/admin` 白名单后，该模型才会进入优化链路；未列入白名单的模型会原样透传上游 SSE 流。

优化器不再使用手动延迟参数。启用后，它会运行时观察上游 chunk 到达节奏和内容形态：大块自然语言会被平滑输出，原本已经很细的流尽量接近直通，代码、JSON、表格和长列表会以更大的快速块输出。

## API 使用示例

将部署后的 Worker 地址作为 OpenAI 兼容 base URL：

```bash
curl https://your-worker.example.workers.dev/v1/models \
  -H "Authorization: Bearer $PROXY_API_KEY"
```

当前 Worker 实现会放宽模型列表接口的鉴权，方便客户端发现已配置模型。设置 `PROXY_API_KEY` 后，聊天补全等代理请求仍需要有效密钥。

## 安全说明

- 不要提交 `.dev.vars`、真实 API Key、你认为需要保密的 KV namespace id 或管理页凭据。
- 请使用强 `PROXY_API_KEY`；它同时保护代理请求和管理页。
- 请把 `/admin` 视为管理入口，避免多人共享同一个弱密码。
- 本项目处于有限维护状态，生产使用前请自行审查代码和 Cloudflare 设置。

更多信息见 [SECURITY.md](SECURITY.md)。

## 开发命令

```bash
npm run dev
npm run check
npm run deploy
```

`npm run check` 会执行 Wrangler dry-run 部署校验。

## 许可证

本项目使用 [Apache License 2.0](LICENSE)。

## 赞助

本项目的 CDN 加速和安全防护由 Tencent EdgeOne 赞助。

![EdgeOne](https://edgeone.ai/media/34fe3a45-492d-4ea4-ae5d-ea1087ca7b4b.png)

[Best Asian CDN, Edge, and Secure Solutions - Tencent EdgeOne](https://edgeone.ai/?from=github)
