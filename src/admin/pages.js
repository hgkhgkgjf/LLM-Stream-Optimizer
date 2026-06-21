const NEO_BRUTAL_STYLE = `
  :root {
    --bg: #fef6e4;
    --ink: #0a0a0a;
    --paper: #ffffff;
    --yellow: #ffd23f;
    --pink: #ff5c8a;
    --blue: #4d9de0;
    --green: #7ae582;
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
  .display { font-family: var(--display); font-weight: 900; text-transform: uppercase; letter-spacing: -0.01em; }

  /* ===== shared form primitives ===== */
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
  input.fld:focus, textarea.fld:focus { background: var(--yellow); box-shadow: 2px 2px 0 var(--ink); transform: translate(2px, 2px); }
  textarea.fld { min-height: 150px; resize: vertical; }

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
    gap: 8px;
  }
  .btn:hover { background: var(--yellow); }
  .btn:active { box-shadow: none; transform: translate(4px, 4px); }
  .btn--primary { background: var(--pink); color: var(--ink); }
  .btn--primary:hover { background: var(--ink); color: var(--pink); }
  .btn--secondary { background: var(--paper); }
  .btn--secondary:hover { background: var(--green); }

  /* ===== login ===== */
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
    letter-spacing: -0.01em;
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

  /* ===== dashboard ===== */
  #dash-wrap { position: relative; z-index: 1; }
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
  .nav-brand { display: flex; align-items: center; gap: 12px; color: var(--yellow); }
  .nav-brand .mark {
    width: 26px; height: 26px;
    background: var(--pink);
    border: var(--bw) solid var(--yellow);
    box-shadow: 3px 3px 0 var(--yellow);
  }
  header h1 {
    font-family: var(--display);
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: -0.01em;
    margin: 0;
    font-size: 20px;
  }
  main {
    width: min(1080px, calc(100vw - 32px));
    margin: 28px auto 80px;
    display: grid;
    gap: 26px;
  }
  section {
    background: var(--paper);
    border: var(--bw) solid var(--ink);
    box-shadow: var(--shadow);
  }
  section h2 {
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
  section h2 .num {
    background: var(--ink);
    color: var(--paper);
    padding: 2px 9px;
    font-size: 13px;
  }
  section.is-yellow > h2 { background: var(--yellow); }
  section.is-blue > h2 { background: var(--blue); }
  section.is-pink > h2 { background: var(--pink); }
  section > div.body, section > form > .body { padding: 8px 20px 22px; }

  .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 22px; }
  .checks {
    display: flex;
    gap: 14px;
    flex-wrap: wrap;
    margin-top: 16px;
  }
  .checks label {
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
  .checks input {
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
  .checks input:checked { background: var(--green); }
  .checks input:checked::after {
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
  .checks label:has(input:checked) { background: var(--yellow); }

  .actions {
    display: flex;
    align-items: center;
    gap: 16px;
    justify-content: flex-end;
    margin-top: 8px;
  }
  #dash-wrap #message {
    min-height: 24px;
    font-family: var(--display);
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-size: 12px;
    padding: 8px 12px;
    background: var(--green);
    border: var(--bw) solid var(--ink);
    box-shadow: var(--shadow-sm);
    display: inline-block;
  }

  @media (max-width: 760px) {
    .grid { grid-template-columns: 1fr; }
    header { padding: 12px 16px; }
    header h1 { font-size: 16px; }
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
      <div class="nav-brand">
        <span class="mark"></span>
        <h1>LLM Stream Optimizer</h1>
      </div>
      <button id="logout" class="btn btn--secondary" type="button">Logout</button>
    </header>
    <main>
      <form id="config-form">
        <section class="is-yellow">
          <h2><span class="num">01</span> OpenAI-compatible upstreams</h2>
          <div class="body">
            <div class="grid">
              <div>
                <label class="lbl" for="defaultUpstreamUrl">Default upstream URL</label>
                <input id="defaultUpstreamUrl" class="fld" type="url">
              </div>
              <div>
                <label class="lbl" for="defaultOutgoingApiKey">Default outgoing API key</label>
                <input id="defaultOutgoingApiKey" class="fld" type="password" autocomplete="off">
              </div>
            </div>
            <label class="lbl" for="openaiEndpoints">OpenAI endpoints JSON</label>
            <textarea id="openaiEndpoints" class="fld" spellcheck="false"></textarea>
          </div>
        </section>
        <section class="is-blue">
          <h2><span class="num">02</span> Provider keys</h2>
          <div class="body">
            <div class="grid">
              <div>
                <label class="lbl" for="geminiUpstreamUrl">Gemini URL</label>
                <input id="geminiUpstreamUrl" class="fld" type="url">
              </div>
              <div>
                <label class="lbl" for="geminiApiKey">Gemini API key</label>
                <input id="geminiApiKey" class="fld" type="password" autocomplete="off">
              </div>
              <div>
                <label class="lbl" for="anthropicUpstreamUrl">Anthropic URL</label>
                <input id="anthropicUpstreamUrl" class="fld" type="url">
              </div>
              <div>
                <label class="lbl" for="anthropicApiKey">Anthropic API key</label>
                <input id="anthropicApiKey" class="fld" type="password" autocomplete="off">
              </div>
              <div>
                <label class="lbl" for="proxyApiKey">Proxy/admin API key</label>
                <input id="proxyApiKey" class="fld" type="password" autocomplete="new-password">
              </div>
            </div>
            <div class="checks">
              <label><input id="geminiUseNativeFetch" type="checkbox"> Gemini native fetch</label>
              <label><input id="anthropicUseNativeFetch" type="checkbox"> Anthropic native fetch</label>
            </div>
          </div>
        </section>
        <section class="is-pink">
          <h2><span class="num">03</span> Stream optimizer</h2>
          <div class="body">
            <label class="lbl" for="streamOptimizationModels">Optimized model whitelist</label>
            <input id="streamOptimizationModels" class="fld" placeholder="gpt-4o, claude-3-5-sonnet-20241022">
          </div>
        </section>
        <div class="actions">
          <span id="message" role="status"></span>
          <button type="submit" class="btn btn--primary">Save</button>
        </div>
      </form>
    </main>
  </div>
  <script>
    const ids = [
      'defaultUpstreamUrl','defaultOutgoingApiKey','geminiUpstreamUrl','geminiApiKey',
      'anthropicUpstreamUrl','anthropicApiKey','proxyApiKey','streamOptimizationModels'
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
        if (id === 'streamOptimizationModels') setValue(id, (config.streamOptimizationModels || []).join(', '));
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
        streamOptimizationModels: byId('streamOptimizationModels').value.split(',').map(x => x.trim()).filter(Boolean)
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
