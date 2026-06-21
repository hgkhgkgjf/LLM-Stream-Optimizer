const NEO_BRUTAL_STYLE = `
  :root {
    --bg: #fef6e4;
    --ink: #0a0a0a;
    --paper: #ffffff;
    --yellow: #ffd23f;
    --pink: #ff5c8a;
    --blue: #4d9de0;
    --green: #7ae582;
    --red: #ff4d4d;
    --muted: #6b6357;
    --bw: 3px;
    --shadow: 6px 6px 0 var(--ink);
    --shadow-sm: 4px 4px 0 var(--ink);
    --display: "Arial Black", "Helvetica Neue", Helvetica, Arial, system-ui, sans-serif;
    --body: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    --mono: ui-monospace, "SF Mono", SFMono-Regular, Consolas, "Liberation Mono", monospace;
    color-scheme: light;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    font-family: var(--body);
    color: var(--ink);
    background-color: var(--bg);
    background-image: radial-gradient(var(--ink) 1px, transparent 1px);
    background-size: 22px 22px;
    background-position: -11px -11px;
    position: relative;
  }
  body::before {
    content: "";
    position: fixed;
    inset: 0;
    background-color: rgba(254, 246, 228, 0.86);
    pointer-events: none;
    z-index: 0;
  }
  .display {
    font-family: var(--display);
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0;
  }

  label.lbl {
    display: block;
    font-family: var(--display);
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-size: 11px;
    margin: 16px 0 8px;
  }
  input.fld, textarea.fld {
    width: 100%;
    font: inherit;
    font-family: var(--mono);
    background: var(--paper);
    border: var(--bw) solid var(--ink);
    padding: 12px;
    box-shadow: var(--shadow-sm);
    border-radius: 0;
    outline: none;
    color: var(--ink);
  }
  input.fld:focus, textarea.fld:focus {
    background: var(--yellow);
    box-shadow: 2px 2px 0 var(--ink);
    transform: translate(2px, 2px);
  }
  textarea.fld { min-height: 150px; resize: vertical; }
  .hint {
    color: var(--muted);
    font-size: 13px;
    line-height: 1.45;
    margin: 8px 0 0;
  }

  .btn {
    font-family: var(--display);
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-size: 13px;
    border: var(--bw) solid var(--ink);
    box-shadow: var(--shadow-sm);
    padding: 12px 18px;
    cursor: pointer;
    background: var(--paper);
    color: var(--ink);
    border-radius: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 44px;
  }
  .btn:hover { background: var(--yellow); }
  .btn:active { box-shadow: none; transform: translate(4px, 4px); }
  .btn:disabled { cursor: wait; opacity: 0.65; }
  .btn--primary { background: var(--pink); color: var(--ink); }
  .btn--primary:hover { background: var(--ink); color: var(--pink); }
  .btn--secondary { background: var(--paper); }
  .btn--secondary:hover { background: var(--green); }
  .btn--danger { background: var(--red); color: var(--ink); }
  .btn--danger:hover { background: var(--ink); color: var(--red); }
  .btn--small {
    min-height: 36px;
    padding: 8px 12px;
    font-size: 11px;
    box-shadow: 3px 3px 0 var(--ink);
  }

  #login-wrap {
    position: relative;
    z-index: 1;
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 32px 16px;
  }
  .login-card {
    width: min(440px, 100%);
    background: var(--paper);
    border: var(--bw) solid var(--ink);
    box-shadow: var(--shadow);
    position: relative;
  }
  .login-head {
    background: var(--ink);
    color: var(--yellow);
    padding: 22px 28px;
    border-bottom: var(--bw) solid var(--ink);
    position: relative;
  }
  .login-head .kicker {
    font-family: var(--display);
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    font-size: 11px;
    color: var(--pink);
    margin: 0 0 6px;
  }
  .login-head h1 {
    font-family: var(--display);
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0;
    margin: 0;
    font-size: 26px;
    line-height: 0.98;
  }
  .login-stamp {
    position: absolute;
    top: -16px;
    right: -16px;
    width: 76px;
    height: 76px;
    border-radius: 50%;
    background: var(--pink);
    border: var(--bw) solid var(--ink);
    box-shadow: var(--shadow-sm);
    display: grid;
    place-items: center;
    transform: rotate(12deg);
    font-family: var(--display);
    font-weight: 900;
    text-transform: uppercase;
    font-size: 12px;
    text-align: center;
    line-height: 1;
    color: var(--ink);
  }
  .login-body { padding: 26px 28px 30px; }
  .login-body p { margin: 0 0 22px; font-size: 14px; color: var(--muted); }
  .login-actions { display: flex; justify-content: flex-end; margin-top: 22px; }
  #login-wrap #message {
    min-height: 22px;
    margin-top: 14px;
    font-family: var(--display);
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-size: 12px;
    color: var(--ink);
  }

  #dash-wrap { position: relative; z-index: 1; min-height: 100vh; }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    background: var(--ink);
    border-bottom: var(--bw) solid var(--ink);
    padding: 14px 24px;
    position: sticky;
    top: 0;
    z-index: 20;
  }
  .nav-brand {
    display: flex;
    align-items: center;
    gap: 12px;
    color: var(--yellow);
    text-decoration: none;
  }
  .nav-brand .mark {
    width: 26px;
    height: 26px;
    background: var(--pink);
    border: var(--bw) solid var(--yellow);
    box-shadow: 3px 3px 0 var(--yellow);
  }
  header h1 {
    font-family: var(--display);
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0;
    margin: 0;
    font-size: 20px;
  }
  main {
    width: min(1180px, calc(100vw - 32px));
    margin: 28px auto 92px;
    display: grid;
    gap: 18px;
  }
  .neo-tabs {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }
  .tab-link {
    background: var(--paper);
    color: var(--ink);
  }
  .tab-link.active {
    background: var(--yellow);
    transform: translate(2px, 2px);
    box-shadow: 2px 2px 0 var(--ink);
  }
  .tab-pane { display: none; }
  .tab-pane.active { display: block; }
  section.panel, .config-card {
    background: var(--paper);
    border: var(--bw) solid var(--ink);
    box-shadow: var(--shadow);
  }
  section.panel > h2, .config-card > h2 {
    margin: 0;
    border-bottom: var(--bw) solid var(--ink);
    padding: 14px 18px;
    display: flex;
    align-items: center;
    gap: 12px;
    font-family: var(--display);
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    font-size: 15px;
  }
  .panel-yellow > h2 { background: var(--yellow); }
  .panel-blue > h2 { background: var(--blue); }
  .panel-pink > h2 { background: var(--pink); }
  .panel-green > h2 { background: var(--green); }
  .body {
    padding: 18px 20px 22px;
    display: grid;
    gap: 18px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 4px 22px;
  }
  .form-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    align-items: center;
    padding-top: 8px;
  }
  .status-badge {
    display: inline-flex;
    align-items: center;
    min-height: 26px;
    padding: 3px 9px;
    border: var(--bw) solid var(--ink);
    background: var(--paper);
    box-shadow: 3px 3px 0 var(--ink);
    font-family: var(--display);
    font-size: 11px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .status-badge.enabled { background: var(--green); }
  .status-badge.disabled { background: var(--paper); }
  .notice, .alert {
    border: var(--bw) solid var(--ink);
    box-shadow: var(--shadow-sm);
    padding: 12px 14px;
    background: var(--blue);
    font-weight: 700;
    line-height: 1.45;
  }
  .alert { display: none; justify-content: space-between; align-items: center; gap: 12px; }
  .alert.visible { display: flex; }
  .alert--success { background: var(--green); }
  .alert--danger { background: var(--red); }
  .alert--warning { background: var(--yellow); }
  .alert--info { background: var(--blue); }
  .api-key-wrapper {
    position: relative;
    display: flex;
    align-items: stretch;
    gap: 8px;
  }
  .api-key-wrapper .fld { flex: 1 1 auto; min-width: 0; }
  .api-key-toggle { flex: 0 0 auto; min-width: 70px; }
  .checks {
    display: flex;
    gap: 14px;
    flex-wrap: wrap;
    margin-top: 16px;
  }
  .checks label, .checkline {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    margin: 0;
    border: var(--bw) solid var(--ink);
    box-shadow: var(--shadow-sm);
    padding: 10px 14px;
    background: var(--paper);
    font-family: var(--display);
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-size: 12px;
    cursor: pointer;
    user-select: none;
  }
  .checks input, .checkline input {
    appearance: none;
    -webkit-appearance: none;
    width: 20px;
    height: 20px;
    margin: 0;
    border: var(--bw) solid var(--ink);
    background: var(--paper);
    position: relative;
    cursor: pointer;
  }
  .checks input:checked, .checkline input:checked { background: var(--green); }
  .checks input:checked::after, .checkline input:checked::after {
    content: "\\2715";
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    font-family: var(--display);
    font-weight: 900;
    font-size: 14px;
    color: var(--ink);
  }
  .openai-endpoint {
    border: var(--bw) dashed var(--ink);
    background: #fffaf0;
    box-shadow: var(--shadow-sm);
    padding: 16px;
    display: grid;
    gap: 12px;
  }
  .endpoint-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }
  .endpoint-title {
    margin: 0;
    font-family: var(--display);
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  #openaiEndpointsContainer {
    display: grid;
    gap: 18px;
  }
  .empty-state {
    margin: 0;
    text-align: center;
    color: var(--muted);
    border: var(--bw) dashed var(--ink);
    padding: 18px;
    background: var(--paper);
  }
  footer {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 10;
    border-top: var(--bw) solid var(--ink);
    background: var(--paper);
    padding: 10px 16px;
    text-align: center;
    font-size: 12px;
    color: var(--muted);
  }
  footer a { color: var(--ink); font-weight: 800; }

  @media (max-width: 760px) {
    .grid { grid-template-columns: 1fr; }
    header { padding: 12px 16px; align-items: flex-start; }
    header h1 { font-size: 16px; }
    .neo-tabs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .tab-link { width: 100%; padding-left: 8px; padding-right: 8px; }
    .endpoint-head { align-items: flex-start; }
    .api-key-wrapper { display: grid; grid-template-columns: 1fr; }
    .api-key-toggle { width: max-content; }
    footer { position: static; }
    main { margin-bottom: 40px; }
    .login-stamp { width: 64px; height: 64px; font-size: 11px; top: -12px; right: -10px; }
  }
`;

export function serveLoginPage() {
  return new Response(
    `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>LLM Stream Optimizer - Admin Login</title>
  <style>${NEO_BRUTAL_STYLE}</style>
</head>
<body>
  <div id="login-wrap">
    <div class="login-card">
      <div class="login-stamp">ADMIN<br>ONLY</div>
      <div class="login-head">
        <p class="kicker">// Stream Optimizer</p>
        <h1>LLM Stream Optimizer</h1>
      </div>
      <div class="login-body">
        <p>Admin dashboard. Authenticate with your proxy key.</p>
        <form id="login-form">
          <label class="lbl" for="password">Password</label>
          <input id="password" name="password" class="fld" type="password" autocomplete="current-password" required>
          <div class="login-actions">
            <button type="submit" class="btn btn--primary">Login</button>
          </div>
          <div id="message" role="status"></div>
        </form>
      </div>
    </div>
  </div>
  <script>
    const form = document.getElementById('login-form');
    const message = document.getElementById('message');
    fetch('/admin/api/check-session').then(r => r.json()).then(data => {
      if (data.isLoggedIn) location.href = '/admin/dashboard';
    }).catch(() => {});
    form.addEventListener('submit', async event => {
      event.preventDefault();
      message.textContent = '';
      const response = await fetch('/admin/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: form.password.value })
      });
      const data = await response.json();
      if (data.success) location.href = '/admin/dashboard';
      else message.textContent = data.message || 'Login failed';
    });
  </script>
</body>
</html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

export function serveDashboardPage() {
  return new Response(
    `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>LLM Stream Optimizer - Admin</title>
  <style>${NEO_BRUTAL_STYLE}</style>
</head>
<body>
  <div id="dash-wrap">
    <header>
      <a href="/admin/dashboard" class="nav-brand">
        <span class="mark"></span>
        <h1>LLM Stream Optimizer</h1>
      </a>
      <button id="logoutBtn" class="btn btn--secondary" type="button">Logout</button>
    </header>
    <main>
      <div id="statusAlert" class="alert" role="alert">
        <span id="alertMessage"></span>
        <button id="alertClose" type="button" class="btn btn--small">Close</button>
      </div>

      <nav class="neo-tabs" id="configTabs" role="tablist" aria-label="Admin configuration tabs">
        <button class="btn tab-link active" id="openai-tab" data-target="openai" type="button" role="tab" aria-selected="true">OpenAI</button>
        <button class="btn tab-link" id="anthropic-tab" data-target="anthropic" type="button" role="tab" aria-selected="false">Anthropic</button>
        <button class="btn tab-link" id="gemini-tab" data-target="gemini" type="button" role="tab" aria-selected="false">Gemini</button>
        <button class="btn tab-link" id="general-tab" data-target="general" type="button" role="tab" aria-selected="false">General</button>
      </nav>

      <div id="configTabsContent">
        <section class="panel panel-yellow tab-pane active" id="openai" role="tabpanel" aria-labelledby="openai-tab">
          <h2>OpenAI 格式 API 配置 <span id="openaiStatus" class="status-badge disabled">未启用</span></h2>
          <form id="openaiForm">
            <div class="body">
              <div class="notice">本配置使用多端点模式。可以添加多个 OpenAI 格式 API 端点，并按模型名称自动路由。</div>
              <div>
                <div class="form-footer">
                  <button type="button" class="btn btn--secondary" id="addOpenAIEndpoint">Add endpoint</button>
                </div>
                <p class="hint">模型名称使用英文逗号分隔；留空表示该端点支持所有模型。</p>
              </div>
              <div id="openaiEndpointsContainer"></div>
              <div class="form-footer">
                <button type="submit" class="btn btn--primary btn-save">Save OpenAI</button>
              </div>
            </div>
          </form>
        </section>

        <section class="panel panel-blue tab-pane" id="anthropic" role="tabpanel" aria-labelledby="anthropic-tab">
          <h2>Anthropic 格式 API 配置 <span id="anthropicStatus" class="status-badge disabled">未启用</span></h2>
          <form id="anthropicForm">
            <div class="body">
              <div class="grid">
                <div>
                  <label class="lbl" for="anthropicUpstreamUrl">API endpoint URL</label>
                  <input type="url" class="fld" id="anthropicUpstreamUrl" placeholder="https://api.anthropic.com">
                  <p class="hint">请输入 Anthropic 格式 API 的基础 URL。</p>
                </div>
                <div>
                  <label class="lbl" for="anthropicApiKey">API key</label>
                  <div class="api-key-wrapper">
                    <input type="password" class="fld" id="anthropicApiKey" placeholder="sk-ant-..." autocomplete="off">
                    <button type="button" class="btn btn--small api-key-toggle" data-target="anthropicApiKey">Show</button>
                  </div>
                  <p class="hint">支持多个 API key，使用英文逗号分隔后会随机负载均衡。</p>
                </div>
              </div>
              <div class="checks">
                <label><input id="anthropicUseNativeFetch" type="checkbox"> Native fetch</label>
              </div>
              <div>
                <label class="lbl" for="anthropicStreamOptimizationModels">Stream optimization models</label>
                <input type="text" class="fld" id="anthropicStreamOptimizationModels" placeholder="claude-3-5-sonnet-20241022, gemini-2.5-flash">
                <p class="hint">Global whitelist for smooth streaming output. Use exact model names separated by commas.</p>
              </div>
              <p class="hint">启用原生 Fetch 可减少 Cloudflare 附加头，但部分 CDN 后端可能不兼容。</p>
              <div class="form-footer">
                <button type="submit" class="btn btn--primary btn-save">Save Anthropic</button>
              </div>
            </div>
          </form>
        </section>

        <section class="panel panel-pink tab-pane" id="gemini" role="tabpanel" aria-labelledby="gemini-tab">
          <h2>Gemini 格式 API 配置 <span id="geminiStatus" class="status-badge disabled">未启用</span></h2>
          <form id="geminiForm">
            <div class="body">
              <div class="grid">
                <div>
                  <label class="lbl" for="geminiUpstreamUrl">API endpoint URL</label>
                  <input type="url" class="fld" id="geminiUpstreamUrl" placeholder="https://generativelanguage.googleapis.com">
                  <p class="hint">请输入 Gemini 格式 API 的基础 URL。</p>
                </div>
                <div>
                  <label class="lbl" for="geminiApiKey">API key</label>
                  <div class="api-key-wrapper">
                    <input type="password" class="fld" id="geminiApiKey" placeholder="AIzaSy..." autocomplete="off">
                    <button type="button" class="btn btn--small api-key-toggle" data-target="geminiApiKey">Show</button>
                  </div>
                  <p class="hint">支持多个 API key，使用英文逗号分隔后会随机负载均衡。</p>
                </div>
              </div>
              <div class="checks">
                <label><input id="geminiUseNativeFetch" type="checkbox"> Native fetch</label>
              </div>
              <div>
                <label class="lbl" for="geminiStreamOptimizationModels">Stream optimization models</label>
                <input type="text" class="fld" id="geminiStreamOptimizationModels" placeholder="gemini-2.5-flash, claude-3-5-sonnet-20241022">
                <p class="hint">Global whitelist for smooth streaming output. Use exact model names separated by commas.</p>
              </div>
              <p class="hint">Gemini 通常建议开启原生 Fetch。</p>
              <div class="form-footer">
                <button type="submit" class="btn btn--primary btn-save">Save Gemini</button>
              </div>
            </div>
          </form>
        </section>

        <section class="panel panel-green tab-pane" id="general" role="tabpanel" aria-labelledby="general-tab">
          <h2>代理访问控制</h2>
          <form id="proxyForm">
            <div class="body">
              <div>
                <label class="lbl" for="proxyApiKey">Proxy/admin API key</label>
                <div class="api-key-wrapper">
                  <input type="password" class="fld" id="proxyApiKey" placeholder="留空表示无需密钥访问" autocomplete="new-password">
                  <button type="button" class="btn btn--small api-key-toggle" data-target="proxyApiKey">Show</button>
                </div>
                <p class="hint">客户端访问代理和登录后台都使用这个密钥。生产环境不要留空。</p>
              </div>
              <div class="form-footer">
                <button type="submit" class="btn btn--primary btn-save">Save proxy key</button>
              </div>
            </div>
          </form>
        </section>
      </div>
    </main>
    <footer>
      LLM Stream Optimizer &copy; 2025 by <a href="https://github.com/GeorgeXie2333/LLM-Stream-Optimizer" target="_blank" rel="noopener noreferrer">GeorgeXie2333</a>
    </footer>
  </div>
  <script>
    let alertTimer = null;
    const byId = id => document.getElementById(id);

    function setText(node, text) {
      node.textContent = text == null ? '' : String(text);
      return node;
    }

    function showAlert(type, message, duration) {
      const alertElement = byId('statusAlert');
      const messageElement = byId('alertMessage');
      if (alertTimer) clearTimeout(alertTimer);
      alertElement.className = 'alert visible alert--' + (type || 'info');
      setText(messageElement, message || '');
      if (duration !== 0) {
        alertTimer = setTimeout(() => {
          alertElement.classList.remove('visible');
        }, duration || 5000);
      }
    }

    function updateStatusBadge(elementId, isEnabled) {
      const badge = byId(elementId);
      if (!badge) return;
      setText(badge, isEnabled ? '已启用' : '未启用');
      badge.classList.toggle('enabled', !!isEnabled);
      badge.classList.toggle('disabled', !isEnabled);
    }

    function setInputValue(id, value) {
      const input = byId(id);
      if (input) input.value = value == null ? '' : String(value);
    }

    function createElement(tag, className, text) {
      const element = document.createElement(tag);
      if (className) element.className = className;
      if (text !== undefined) setText(element, text);
      return element;
    }

    function createInput({ id, type = 'text', className = 'fld', placeholder = '', value = '', autocomplete }) {
      const input = document.createElement('input');
      input.type = type;
      input.className = className;
      input.id = id;
      input.placeholder = placeholder;
      input.value = value == null ? '' : String(value);
      if (autocomplete) input.autocomplete = autocomplete;
      return input;
    }

    function createField({ label, input, hint, wrapperClass }) {
      const box = createElement('div', wrapperClass || '');
      const labelElement = createElement('label', 'lbl', label);
      if (input.id) labelElement.setAttribute('for', input.id);
      box.append(labelElement, input);
      if (hint) box.append(createElement('p', 'hint', hint));
      return box;
    }

    function createApiKeyInput(id, value, placeholder) {
      const wrapper = createElement('div', 'api-key-wrapper');
      const input = createInput({
        id,
        type: 'password',
        placeholder,
        value,
        autocomplete: 'off',
      });
      const toggle = createElement('button', 'btn btn--small api-key-toggle', 'Show');
      toggle.type = 'button';
      toggle.dataset.target = id;
      wrapper.append(input, toggle);
      return wrapper;
    }

    function generateUUID() {
      if (crypto && crypto.randomUUID) return crypto.randomUUID();
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
        const random = crypto.getRandomValues(new Uint8Array(1))[0] & 15;
        const value = char === 'x' ? random : (random & 3) | 8;
        return value.toString(16);
      });
    }

    function showOpenAIEmptyState() {
      const container = byId('openaiEndpointsContainer');
      container.replaceChildren(createElement('p', 'empty-state', '尚未配置 OpenAI 端点。点击 Add endpoint 开始配置。'));
    }

    function streamOptimizationModelsFromInput(id) {
      const value = byId(id)?.value || '';
      return value
        .split(',')
        .map(model => model.trim())
        .filter(Boolean);
    }

    function syncStreamOptimizationInputs(modelsOrSourceId) {
      const ids = ['anthropicStreamOptimizationModels', 'geminiStreamOptimizationModels'];
      const value = Array.isArray(modelsOrSourceId)
        ? modelsOrSourceId.join(', ')
        : byId(modelsOrSourceId)?.value || '';
      for (const id of ids) {
        if (id !== modelsOrSourceId) setInputValue(id, value);
      }
    }

    function getOpenAIEndpointsConfigFromUI() {
      const endpoints = [];
      byId('openaiEndpointsContainer').querySelectorAll('.openai-endpoint').forEach(element => {
        const nameInput = element.querySelector('[data-field="name"]');
        const urlInput = element.querySelector('[data-field="url"]');
        const apiKeyInput = element.querySelector('[data-field="apiKey"]');
        const modelsInput = element.querySelector('[data-field="models"]');
        const nativeFetchInput = element.querySelector('[data-field="useNativeFetch"]');
        const url = (urlInput && urlInput.value ? urlInput.value : '').trim();
        const name = (nameInput && nameInput.value ? nameInput.value : '').trim();
        const apiKey = (apiKeyInput && apiKeyInput.value ? apiKeyInput.value : '').trim();
        const models = (modelsInput && modelsInput.value ? modelsInput.value : '')
          .split(',')
          .map(model => model.trim())
          .filter(Boolean);

        if (url) {
          endpoints.push({
            id: element.dataset.id || generateUUID(),
            name,
            url,
            apiKey,
            models,
            useNativeFetch: !!(nativeFetchInput && nativeFetchInput.checked),
          });
        } else if (name || apiKey || models.length) {
          showAlert('warning', '有一个 OpenAI 端点缺少 URL，保存时已跳过。', 7000);
        }
      });
      return endpoints;
    }

    function loadOpenAIEndpointsUI(endpoints) {
      const container = byId('openaiEndpointsContainer');
      container.replaceChildren();
      if (!Array.isArray(endpoints) || endpoints.length === 0) {
        showOpenAIEmptyState();
        return;
      }
      endpoints.forEach(endpoint => addOpenAIEndpointFormUI(endpoint, false));
    }

    function addOpenAIEndpointFormUI(endpointData, isNew) {
      const container = byId('openaiEndpointsContainer');
      const emptyState = container.querySelector('.empty-state');
      if (emptyState) emptyState.remove();

      const id = endpointData && endpointData.id ? String(endpointData.id) : generateUUID();
      const endpoint = endpointData || {};
      const card = createElement('div', 'openai-endpoint');
      card.dataset.id = id;

      const head = createElement('div', 'endpoint-head');
      head.append(
        createElement('p', 'endpoint-title', 'Endpoint ID: ' + id.slice(0, 8)),
      );
      const removeButton = createElement('button', 'btn btn--danger btn--small remove-endpoint', 'Delete');
      removeButton.type = 'button';
      head.append(removeButton);

      const grid = createElement('div', 'grid');
      const nameInput = createInput({
        id: 'endpoint-name-' + id,
        placeholder: 'OpenAI 官方',
        value: endpoint.name || '',
      });
      nameInput.dataset.field = 'name';
      const urlInput = createInput({
        id: 'endpoint-url-' + id,
        type: 'url',
        placeholder: 'https://api.openai.com/v1',
        value: endpoint.url || '',
      });
      urlInput.dataset.field = 'url';
      const apiKeyWrapper = createApiKeyInput('endpoint-apikey-' + id, endpoint.apiKey || '', 'sk-...');
      const apiKeyInput = apiKeyWrapper.querySelector('input');
      apiKeyInput.dataset.field = 'apiKey';
      const modelsInput = createInput({
        id: 'endpoint-models-' + id,
        placeholder: 'gpt-4o, gpt-3.5-turbo',
        value: Array.isArray(endpoint.models) ? endpoint.models.join(', ') : '',
      });
      modelsInput.dataset.field = 'models';

      grid.append(
        createField({ label: 'Endpoint name', input: nameInput, hint: '可选，用来区分多个上游。' }),
        createField({ label: 'API endpoint URL', input: urlInput, hint: '必须包含基础路径，例如 /v1。' }),
        createField({ label: 'API key', input: apiKeyWrapper, hint: '支持多个 key，用英文逗号分隔。' }),
        createField({ label: 'Supported models', input: modelsInput, hint: '留空表示支持所有模型。' }),
      );

      const checkLabel = createElement('label', 'checkline');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = 'useNativeFetch-' + id;
      checkbox.checked = endpoint.useNativeFetch === true;
      checkbox.dataset.field = 'useNativeFetch';
      checkLabel.append(checkbox, document.createTextNode(' Native fetch'));

      card.append(head, grid, checkLabel);
      container.append(card);

      removeButton.addEventListener('click', () => {
        card.remove();
        if (!container.querySelector('.openai-endpoint')) showOpenAIEmptyState();
        showAlert('info', '端点已从界面移除，请点击保存按钮确认。');
      });

      if (isNew) {
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        card.style.backgroundColor = 'var(--yellow)';
        setTimeout(() => {
          card.style.backgroundColor = '';
        }, 900);
      }
    }

    async function loadConfig() {
      try {
        const response = await fetch('/admin/api/config');
        if (response.status === 401) {
          location.href = '/admin';
          return;
        }
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const data = await response.json();
        const config = data.config || {};

        loadOpenAIEndpointsUI(config.openaiEndpoints || []);
        updateStatusBadge('openaiStatus', Array.isArray(config.openaiEndpoints) && config.openaiEndpoints.length > 0);

        setInputValue('anthropicUpstreamUrl', config.anthropicUpstreamUrl);
        setInputValue('anthropicApiKey', config.anthropicApiKey);
        byId('anthropicUseNativeFetch').checked = config.anthropicUseNativeFetch === true;
        updateStatusBadge('anthropicStatus', config.anthropicEnabled === true);

        setInputValue('geminiUpstreamUrl', config.geminiUpstreamUrl);
        setInputValue('geminiApiKey', config.geminiApiKey);
        byId('geminiUseNativeFetch').checked = config.geminiUseNativeFetch === true;
        updateStatusBadge('geminiStatus', config.geminiEnabled === true);

        syncStreamOptimizationInputs(config.streamOptimizationModels || []);
        setInputValue('proxyApiKey', config.proxyApiKey);
      } catch (error) {
        showAlert('danger', '加载配置失败: ' + error.message, 0);
      }
    }

    async function saveConfig(formData, buttonElement) {
      const originalText = buttonElement.textContent;
      buttonElement.textContent = 'Saving...';
      buttonElement.disabled = true;
      try {
        const response = await fetch('/admin/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        const data = await response.json();
        if (data.success) {
          showAlert('success', data.message || '配置保存成功。');
          await loadConfig();
        } else {
          showAlert('danger', data.message || '配置保存失败。', 0);
        }
      } catch (error) {
        showAlert('danger', '保存配置失败: ' + error.message, 0);
      } finally {
        buttonElement.textContent = originalText;
        buttonElement.disabled = false;
      }
    }

    byId('configTabs').addEventListener('click', event => {
      const button = event.target.closest('.tab-link');
      if (!button) return;
      const target = button.dataset.target;
      document.querySelectorAll('.tab-link').forEach(tab => {
        const isActive = tab === button;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });
      document.querySelectorAll('.tab-pane').forEach(panel => {
        panel.classList.toggle('active', panel.id === target);
      });
    });

    document.addEventListener('click', event => {
      const button = event.target.closest('.api-key-toggle');
      if (!button) return;
      const input = byId(button.dataset.target);
      if (!input) return;
      const shouldShow = input.type === 'password';
      input.type = shouldShow ? 'text' : 'password';
      button.textContent = shouldShow ? 'Hide' : 'Show';
    });

    byId('alertClose').addEventListener('click', () => {
      byId('statusAlert').classList.remove('visible');
    });

    byId('addOpenAIEndpoint').addEventListener('click', () => {
      addOpenAIEndpointFormUI(null, true);
    });

    byId('openaiForm').addEventListener('submit', event => {
      event.preventDefault();
      saveConfig({ openaiEndpoints: getOpenAIEndpointsConfigFromUI() }, event.currentTarget.querySelector('.btn-save'));
    });

    byId('anthropicForm').addEventListener('submit', event => {
      event.preventDefault();
      saveConfig({
        anthropicUpstreamUrl: byId('anthropicUpstreamUrl').value.trim(),
        anthropicApiKey: byId('anthropicApiKey').value.trim(),
        anthropicUseNativeFetch: byId('anthropicUseNativeFetch').checked,
        streamOptimizationModels: streamOptimizationModelsFromInput('anthropicStreamOptimizationModels')
      }, event.currentTarget.querySelector('.btn-save'));
    });

    byId('geminiForm').addEventListener('submit', event => {
      event.preventDefault();
      saveConfig({
        geminiUpstreamUrl: byId('geminiUpstreamUrl').value.trim(),
        geminiApiKey: byId('geminiApiKey').value.trim(),
        geminiUseNativeFetch: byId('geminiUseNativeFetch').checked,
        streamOptimizationModels: streamOptimizationModelsFromInput('geminiStreamOptimizationModels')
      }, event.currentTarget.querySelector('.btn-save'));
    });

    byId('proxyForm').addEventListener('submit', event => {
      event.preventDefault();
      saveConfig({
        proxyApiKey: byId('proxyApiKey').value.trim()
      }, event.currentTarget.querySelector('.btn-save'));
    });

    byId('logoutBtn').addEventListener('click', async () => {
      const button = byId('logoutBtn');
      button.textContent = 'Logging out...';
      button.disabled = true;
      try {
        await fetch('/admin/api/logout', { method: 'POST' });
      } finally {
        location.href = '/admin';
      }
    });

    byId('anthropicStreamOptimizationModels').addEventListener('input', () => {
      syncStreamOptimizationInputs('anthropicStreamOptimizationModels');
    });

    byId('geminiStreamOptimizationModels').addEventListener('input', () => {
      syncStreamOptimizationInputs('geminiStreamOptimizationModels');
    });

    loadConfig();
  </script>
</body>
</html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}
