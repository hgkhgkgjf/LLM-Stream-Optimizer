export function serveLoginPage() {
  return new Response(
    `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>LLM Stream Optimizer - Admin Login</title>
  <style>
    :root { color-scheme: light dark; font-family: Inter, system-ui, sans-serif; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f4f6f8; color: #16202a; }
    main { width: min(420px, calc(100vw - 32px)); background: white; border: 1px solid #d9e0e7; border-radius: 8px; padding: 28px; box-shadow: 0 20px 60px rgba(10, 31, 68, .12); }
    h1 { margin: 0 0 8px; font-size: 24px; }
    p { margin: 0 0 20px; color: #52616f; }
    label { display: block; font-weight: 650; margin-bottom: 8px; }
    input, button { width: 100%; box-sizing: border-box; font: inherit; border-radius: 6px; }
    input { border: 1px solid #cbd5df; padding: 12px; }
    button { margin-top: 14px; border: 0; padding: 12px; background: #1261a6; color: white; cursor: pointer; }
    #message { min-height: 22px; margin-top: 14px; color: #a83232; }
  </style>
</head>
<body>
  <main>
    <h1>LLM Stream Optimizer</h1>
    <p>Admin dashboard</p>
    <form id="login-form">
      <label for="password">Password</label>
      <input id="password" name="password" type="password" autocomplete="current-password" required>
      <button type="submit">Login</button>
      <div id="message" role="status"></div>
    </form>
  </main>
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
  <style>
    :root { color-scheme: light dark; font-family: Inter, system-ui, sans-serif; }
    body { margin: 0; background: #f5f7fa; color: #17212b; }
    header { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; background: white; border-bottom: 1px solid #d9e0e7; }
    h1 { margin: 0; font-size: 20px; }
    main { width: min(1080px, calc(100vw - 32px)); margin: 24px auto 48px; display: grid; gap: 16px; }
    section { background: white; border: 1px solid #d9e0e7; border-radius: 8px; padding: 18px; }
    h2 { margin: 0 0 14px; font-size: 17px; }
    label { display: block; font-weight: 650; margin: 10px 0 6px; }
    input, textarea, button { font: inherit; border-radius: 6px; box-sizing: border-box; }
    input, textarea { width: 100%; border: 1px solid #cbd5df; padding: 10px; }
    textarea { min-height: 150px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .checks { display: flex; gap: 18px; flex-wrap: wrap; margin-top: 10px; }
    .checks label { display: inline-flex; align-items: center; gap: 8px; margin: 0; }
    .checks input { width: auto; }
    .actions { display: flex; gap: 10px; justify-content: flex-end; }
    button { border: 0; padding: 10px 14px; background: #1261a6; color: white; cursor: pointer; }
    button.secondary { background: #5f6f7d; }
    #message { min-height: 24px; }
    @media (max-width: 760px) { .grid { grid-template-columns: 1fr; } header { padding: 14px 16px; } }
  </style>
</head>
<body>
  <header>
    <h1>LLM Stream Optimizer</h1>
    <button id="logout" class="secondary" type="button">Logout</button>
  </header>
  <main>
    <form id="config-form">
      <section>
        <h2>OpenAI-compatible upstreams</h2>
        <div class="grid">
          <div>
            <label for="defaultUpstreamUrl">Default upstream URL</label>
            <input id="defaultUpstreamUrl" type="url">
          </div>
          <div>
            <label for="defaultOutgoingApiKey">Default outgoing API key</label>
            <input id="defaultOutgoingApiKey" type="password" autocomplete="off">
          </div>
        </div>
        <label for="openaiEndpoints">OpenAI endpoints JSON</label>
        <textarea id="openaiEndpoints" spellcheck="false"></textarea>
      </section>
      <section>
        <h2>Provider keys</h2>
        <div class="grid">
          <div>
            <label for="geminiUpstreamUrl">Gemini URL</label>
            <input id="geminiUpstreamUrl" type="url">
          </div>
          <div>
            <label for="geminiApiKey">Gemini API key</label>
            <input id="geminiApiKey" type="password" autocomplete="off">
          </div>
          <div>
            <label for="anthropicUpstreamUrl">Anthropic URL</label>
            <input id="anthropicUpstreamUrl" type="url">
          </div>
          <div>
            <label for="anthropicApiKey">Anthropic API key</label>
            <input id="anthropicApiKey" type="password" autocomplete="off">
          </div>
          <div>
            <label for="proxyApiKey">Proxy/admin API key</label>
            <input id="proxyApiKey" type="password" autocomplete="new-password">
          </div>
        </div>
        <div class="checks">
          <label><input id="geminiUseNativeFetch" type="checkbox"> Gemini native fetch</label>
          <label><input id="anthropicUseNativeFetch" type="checkbox"> Anthropic native fetch</label>
        </div>
      </section>
      <section>
        <h2>Stream optimizer</h2>
        <div class="grid">
          <div><label for="minDelay">Min delay</label><input id="minDelay" type="number" min="0"></div>
          <div><label for="maxDelay">Max delay</label><input id="maxDelay" type="number" min="0"></div>
          <div><label for="adaptiveDelayFactor">Adaptive delay factor</label><input id="adaptiveDelayFactor" type="number" step="0.1" min="0"></div>
          <div><label for="chunkBufferSize">Chunk buffer size</label><input id="chunkBufferSize" type="number" min="1"></div>
          <div><label for="minContentLengthForFastOutput">Fast output threshold</label><input id="minContentLengthForFastOutput" type="number" min="0"></div>
          <div><label for="fastOutputDelay">Fast output delay</label><input id="fastOutputDelay" type="number" min="0"></div>
          <div><label for="finalLowDelay">Final low delay</label><input id="finalLowDelay" type="number" min="0"></div>
          <div><label for="disableOptimizationModels">Disable optimization models</label><input id="disableOptimizationModels" placeholder="gpt-4o, claude-3"></div>
        </div>
      </section>
      <div class="actions">
        <span id="message" role="status"></span>
        <button type="submit">Save</button>
      </div>
    </form>
  </main>
  <script>
    const ids = [
      'defaultUpstreamUrl','defaultOutgoingApiKey','geminiUpstreamUrl','geminiApiKey',
      'anthropicUpstreamUrl','anthropicApiKey','proxyApiKey','minDelay','maxDelay',
      'adaptiveDelayFactor','chunkBufferSize','minContentLengthForFastOutput','fastOutputDelay',
      'finalLowDelay','disableOptimizationModels'
    ];
    const byId = id => document.getElementById(id);
    const message = byId('message');
    function setValue(id, value) { byId(id).value = value ?? ''; }
    async function loadConfig() {
      const response = await fetch('/admin/api/config');
      if (response.status === 401) { location.href = '/admin'; return; }
      const data = await response.json();
      const config = data.config || {};
      for (const id of ids) {
        if (id === 'disableOptimizationModels') setValue(id, (config.disableOptimizationModels || []).join(', '));
        else setValue(id, config[id]);
      }
      byId('geminiUseNativeFetch').checked = config.geminiUseNativeFetch === true;
      byId('anthropicUseNativeFetch').checked = config.anthropicUseNativeFetch === true;
      byId('openaiEndpoints').value = JSON.stringify(config.openaiEndpoints || [], null, 2);
    }
    function formData() {
      let endpoints = [];
      try { endpoints = JSON.parse(byId('openaiEndpoints').value || '[]'); }
      catch { throw new Error('OpenAI endpoints JSON is invalid'); }
      return {
        defaultUpstreamUrl: byId('defaultUpstreamUrl').value.trim(),
        defaultOutgoingApiKey: byId('defaultOutgoingApiKey').value.trim(),
        openaiEndpoints: endpoints,
        geminiUpstreamUrl: byId('geminiUpstreamUrl').value.trim(),
        geminiApiKey: byId('geminiApiKey').value.trim(),
        geminiUseNativeFetch: byId('geminiUseNativeFetch').checked,
        anthropicUpstreamUrl: byId('anthropicUpstreamUrl').value.trim(),
        anthropicApiKey: byId('anthropicApiKey').value.trim(),
        anthropicUseNativeFetch: byId('anthropicUseNativeFetch').checked,
        proxyApiKey: byId('proxyApiKey').value.trim(),
        minDelay: byId('minDelay').value,
        maxDelay: byId('maxDelay').value,
        adaptiveDelayFactor: byId('adaptiveDelayFactor').value,
        chunkBufferSize: byId('chunkBufferSize').value,
        minContentLengthForFastOutput: byId('minContentLengthForFastOutput').value,
        fastOutputDelay: byId('fastOutputDelay').value,
        finalLowDelay: byId('finalLowDelay').value,
        disableOptimizationModels: byId('disableOptimizationModels').value.split(',').map(x => x.trim()).filter(Boolean)
      };
    }
    byId('config-form').addEventListener('submit', async event => {
      event.preventDefault();
      message.textContent = '';
      try {
        const response = await fetch('/admin/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData())
        });
        const data = await response.json();
        message.textContent = data.message || (data.success ? 'Saved' : 'Save failed');
        if (data.success) await loadConfig();
      } catch (error) {
        message.textContent = error.message;
      }
    });
    byId('logout').addEventListener('click', async () => {
      await fetch('/admin/api/logout', { method: 'POST' });
      location.href = '/admin';
    });
    loadConfig();
  </script>
</body>
</html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}
