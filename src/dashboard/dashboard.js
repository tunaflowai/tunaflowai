export function renderDashboardHtml({ authEnabled = false } = {}) {
  const authFlag = authEnabled ? 'true' : 'false';
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>TunaFlowAI Dashboard</title>
  <style>
    :root {
      --tuna-950: #031821;
      --tuna-900: #052c3a;
      --tuna-800: #07465b;
      --tuna-700: #08677d;
      --tuna-600: #0b829a;
      --tuna-500: #13a3b8;
      --tuna-300: #70d8df;
      --reef: #d8fbff;
      --foam: #f4fdff;
      --sand: #f7fbf7;
      --coral: #ff7f6e;
      --kelp: #19a974;
      --amber: #f59e0b;
      --danger: #e5484d;
      --ink: #102932;
      --muted: #657983;
      --border: rgba(5, 44, 58, .12);
      --shadow: 0 18px 45px rgba(5, 44, 58, .12);
      --radius: 18px;
      color-scheme: light;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: var(--ink);
      background:
        radial-gradient(circle at 15% 8%, rgba(112, 216, 223, .38), transparent 28rem),
        radial-gradient(circle at 85% 2%, rgba(255, 127, 110, .16), transparent 24rem),
        linear-gradient(180deg, #f4fdff 0%, #eef9f8 48%, #f9fcf7 100%);
    }
    a { color: var(--tuna-700); }
    .app-shell { max-width: 1440px; margin: 0 auto; padding: 22px; }
    .navbar {
      position: sticky; top: 12px; z-index: 10;
      display: flex; align-items: center; justify-content: space-between; gap: 16px;
      padding: 14px 16px; border: 1px solid rgba(255,255,255,.62); border-radius: 24px;
      background: rgba(255,255,255,.74); backdrop-filter: blur(18px); box-shadow: var(--shadow);
    }
    .brand { display: flex; align-items: center; gap: 12px; min-width: 230px; }
    .logo {
      width: 46px; height: 46px; border-radius: 16px; display: grid; place-items: center;
      background: linear-gradient(135deg, var(--tuna-800), var(--tuna-500)); color: white;
      box-shadow: inset 0 -8px 18px rgba(0,0,0,.12);
      font-weight: 900; letter-spacing: -.06em;
    }
    .brand h1 { margin: 0; font-size: 1.15rem; line-height: 1.1; letter-spacing: -.03em; }
    .brand small { color: var(--muted); display: block; margin-top: 3px; }
    .nav-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
    .hero { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(320px, .65fr); gap: 18px; margin: 22px 0; }
    .hero-card {
      border-radius: 28px; padding: 28px; overflow: hidden; position: relative;
      background: linear-gradient(135deg, rgba(5,44,58,.97), rgba(8,103,125,.94)); color: white; box-shadow: var(--shadow);
    }
    .hero-card:after {
      content: ""; position: absolute; inset: auto -70px -130px auto; width: 320px; height: 320px;
      background: radial-gradient(circle, rgba(112,216,223,.58), transparent 60%); border-radius: 50%;
    }
    .hero h2 { margin: 0; font-size: clamp(2rem, 4vw, 4.6rem); line-height: .95; letter-spacing: -.07em; }
    .hero p { max-width: 760px; color: rgba(255,255,255,.82); font-size: 1rem; line-height: 1.65; }
    .status-strip { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 18px; }
    .pill {
      display: inline-flex; align-items: center; gap: 7px; padding: 7px 10px; border-radius: 999px;
      background: rgba(255,255,255,.14); border: 1px solid rgba(255,255,255,.18); color: inherit; font-size: .85rem;
    }
    .grid { display: grid; gap: 16px; }
    .grid-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .grid-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .grid-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .layout { display: grid; grid-template-columns: minmax(0, .95fr) minmax(0, 1.35fr); gap: 16px; align-items: start; }
    .card {
      background: rgba(255,255,255,.86); border: 1px solid rgba(255,255,255,.68); border-radius: var(--radius);
      box-shadow: 0 10px 28px rgba(5,44,58,.08); padding: 16px;
    }
    .card-header { display: flex; align-items: start; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
    .card h3 { margin: 0; font-size: 1rem; letter-spacing: -.02em; }
    .card p { color: var(--muted); line-height: 1.55; }
    .metric { padding: 16px; border-radius: 18px; background: linear-gradient(180deg, rgba(216,251,255,.82), rgba(255,255,255,.72)); border: 1px solid var(--border); }
    .metric .value { font-size: 1.85rem; font-weight: 850; letter-spacing: -.06em; color: var(--tuna-800); }
    .metric .label { color: var(--muted); font-size: .84rem; margin-top: 4px; }
    .form-control, .form-select, textarea, input, select {
      width: 100%; border: 1px solid rgba(5,44,58,.16); border-radius: 13px; padding: 11px 12px;
      background: rgba(255,255,255,.94); color: var(--ink); outline: none; font: inherit;
      transition: border-color .15s ease, box-shadow .15s ease, background .15s ease;
    }
    textarea { min-height: 92px; resize: vertical; }
    input:focus, textarea:focus, select:focus { border-color: var(--tuna-500); box-shadow: 0 0 0 4px rgba(19,163,184,.13); background: white; }
    label { display: block; font-size: .82rem; color: var(--muted); margin: 10px 0 6px; }
    .btn {
      border: 1px solid transparent; border-radius: 999px; padding: 10px 14px; font: inherit; font-weight: 750; cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 38px;
      transition: transform .12s ease, box-shadow .12s ease, background .12s ease, border-color .12s ease;
    }
    .btn:hover { transform: translateY(-1px); }
    .btn-primary { color: white; background: linear-gradient(135deg, var(--tuna-700), var(--tuna-500)); box-shadow: 0 10px 22px rgba(8,103,125,.18); }
    .btn-coral { color: white; background: linear-gradient(135deg, #e96857, var(--coral)); box-shadow: 0 10px 22px rgba(255,127,110,.2); }
    .btn-light { color: var(--tuna-800); background: rgba(255,255,255,.86); border-color: rgba(5,44,58,.1); }
    .btn-outline { color: var(--tuna-800); background: transparent; border-color: rgba(8,103,125,.28); }
    .btn-danger { color: white; background: var(--danger); }
    .btn-sm { padding: 7px 10px; min-height: 31px; font-size: .82rem; }
    .badge { display: inline-flex; align-items: center; border-radius: 999px; padding: 4px 8px; font-size: .74rem; font-weight: 800; border: 1px solid rgba(5,44,58,.1); background: #edf8f9; color: var(--tuna-800); }
    .badge.ok { background: #e7f8ef; color: #087f55; }
    .badge.warn { background: #fff7e5; color: #9a5b00; }
    .badge.danger { background: #ffecec; color: #b4232a; }
    .badge.info { background: #e8f7ff; color: #076184; }
    .table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: 14px; background: white; }
    table { width: 100%; border-collapse: collapse; font-size: .88rem; }
    th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid rgba(5,44,58,.08); vertical-align: top; }
    th { color: var(--muted); font-size: .74rem; text-transform: uppercase; letter-spacing: .08em; background: rgba(244,253,255,.78); }
    tr:last-child td { border-bottom: 0; }
    pre, code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    pre { margin: 0; padding: 12px; border-radius: 14px; overflow: auto; background: #062634; color: #d7fbff; max-height: 340px; font-size: .82rem; line-height: 1.45; }
    .terminal { background: #041b25; color: #d7fbff; border-radius: 16px; padding: 14px; overflow: auto; max-height: 390px; }
    .muted { color: var(--muted); }
    .tiny { font-size: .78rem; }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
    .split { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .stack { display: grid; gap: 10px; }
    .alert {
      padding: 12px 14px; border-radius: 16px; border: 1px solid rgba(8,103,125,.16);
      background: rgba(216,251,255,.68); color: var(--tuna-900); line-height: 1.5;
    }
    .alert.coral { border-color: rgba(255,127,110,.26); background: rgba(255,127,110,.12); }
    .tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
    .tab-panel[hidden] { display: none; }
    .footer { color: var(--muted); text-align: center; padding: 26px 0 12px; }
    @media (max-width: 1100px) { .hero, .layout { grid-template-columns: 1fr; } .grid-4 { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 720px) { .app-shell { padding: 12px; } .navbar { position: static; } .grid-2, .grid-3, .grid-4, .split { grid-template-columns: 1fr; } .hero-card { padding: 20px; } .nav-actions { justify-content: stretch; } .nav-actions > * { flex: 1 1 auto; } }
  </style>
</head>
<body>
  <div class="app-shell">
    <nav class="navbar">
      <div class="brand">
        <div class="logo">TF</div>
        <div><h1>TunaFlowAI</h1><small>Lightweight work-ops dashboard</small></div>
      </div>
      <div class="nav-actions">
        <input id="apiToken" class="form-control" style="max-width:260px" placeholder="API token (optional)">
        <button id="saveToken" class="btn btn-light">Save token</button>
        <button id="refresh" class="btn btn-primary">Refresh</button>
        <button id="logout" class="btn btn-outline">Logout</button>
      </div>
    </nav>

    <section class="hero">
      <div class="hero-card">
        <span class="pill">Tuna theme • Bootstrap-like • zero dependency</span>
        <h2>Control panel untuk agent, skills, channels, approvals.</h2>
        <p>GUI ini hanya lapisan kontrol ringan. Semua perintah tetap bisa masuk lewat channel seperti Telegram, Slack, Discord, WhatsApp, webhook, atau API. Tindakan berat seperti command lokal, file write, pause ads, booking, dan Codex CLI tetap melewati approval/risk policy.</p>
        <div class="status-strip" id="heroBadges">
          <span class="pill">Loading runtime...</span>
        </div>
      </div>
      <div class="grid grid-2" id="metrics"></div>
    </section>

    <section class="layout">
      <div class="grid">
        <div class="card">
          <div class="card-header"><div><h3>Chat / Event composer</h3><div class="muted tiny">Kirim instruksi via GUI atau simulasikan event channel.</div></div><span class="badge info">control</span></div>
          <div class="split">
            <div><label>Channel</label><input id="chatChannel" placeholder="web, telegram, slack, discord..."></div>
            <div><label>Conversation / recipient</label><input id="chatConversation" placeholder="conversationId atau chatId"></div>
          </div>
          <label>Message</label>
          <textarea id="chatText" placeholder="Contoh: cek skill data analyst dan buat laporan CSV terbaru"></textarea>
          <div class="actions" style="margin-top:10px"><button id="sendChat" class="btn btn-primary">Send chat</button><button id="fillEvent" class="btn btn-outline">Fill event JSON</button></div>
          <label>Raw event JSON</label>
          <textarea id="eventJson" spellcheck="false">{"type":"user.message","text":""}</textarea>
          <div class="actions" style="margin-top:10px"><button id="emitEvent" class="btn btn-coral">Emit event</button></div>
          <div id="actionLog" class="terminal tiny" style="margin-top:12px">No action yet.</div>
        </div>

        <div class="card">
          <div class="card-header"><h3>Persona & identity</h3><span class="badge">runtime</span></div>
          <label>Switch persona</label>
          <div class="actions"><select id="personaSelect" class="form-select"></select><button id="switchPersona" class="btn btn-primary">Switch</button></div>
          <div class="split">
            <div><label>Agent name</label><input id="identityName" placeholder="Tuna"></div>
            <div><label>Personality</label><input id="identityPersonality" placeholder="calm, proactive, careful"></div>
          </div>
          <label>Raw identity patch JSON</label>
          <textarea id="identityJson" spellcheck="false">{}</textarea>
          <div class="actions" style="margin-top:10px"><button id="saveIdentity" class="btn btn-outline">Save identity</button></div>
        </div>

        <div class="card">
          <div class="card-header"><h3>Tasks & budgets</h3><span class="badge">planning</span></div>
          <label>New task title</label>
          <input id="taskTitle" placeholder="Analyze new campaign metrics">
          <div class="actions" style="margin-top:10px"><button id="createTask" class="btn btn-primary">Create task</button></div>
          <div class="table-wrap" style="margin-top:12px"><table><thead><tr><th>Task</th><th>Status</th><th>Budget</th></tr></thead><tbody id="taskRows"></tbody></table></div>
        </div>

        <div class="card">
          <div class="card-header"><h3>Channels</h3><span class="badge ok">parity</span></div>
          <div class="alert">GUI tidak mengganti channel. Channel tetap punya kontrol penuh melalui webhook/API, lalu output dapat dikirim balik lewat outbound router jika adapter mendukung.</div>
          <div id="channelRows" class="stack" style="margin-top:12px"></div>
        </div>
      </div>

      <div class="grid">
        <div class="grid grid-3">
          <div class="card"><div class="card-header"><h3>Status</h3><span id="statusBadge" class="badge warn">loading</span></div><pre id="statusPre">{}</pre></div>
          <div class="card"><div class="card-header"><h3>Models</h3><span class="badge">fallback</span></div><div id="modelRows" class="stack"></div></div>
          <div class="card"><div class="card-header"><h3>Approvals</h3><span id="approvalCount" class="badge danger">0</span></div><div id="approvalRows" class="stack"></div></div>
        </div>

        <div class="card">
          <div class="card-header"><div><h3>Job skills</h3><div class="muted tiny">Reload setelah menambah bundled/acquired skills.</div></div><div class="actions"><button id="reloadSkills" class="btn btn-outline btn-sm">Reload</button></div></div>
          <div class="split"><input id="skillSource" placeholder="loaded skill name or local path"><button id="acquireSkill" class="btn btn-primary">Acquire</button></div>
          <div class="table-wrap" style="margin-top:12px"><table><thead><tr><th>Skill</th><th>Jobs</th><th>Risk</th><th>Tools</th></tr></thead><tbody id="skillRows"></tbody></table></div>
        </div>

        <div class="card">
          <div class="tabs">
            <button class="btn btn-light btn-sm" data-tab="state">State</button>
            <button class="btn btn-light btn-sm" data-tab="runs">Runs</button>
            <button class="btn btn-light btn-sm" data-tab="events">Events</button>
            <button class="btn btn-light btn-sm" data-tab="audit">Audit</button>
            <button class="btn btn-light btn-sm" data-tab="tools">Tools</button>
            <button class="btn btn-light btn-sm" data-tab="secrets">Secrets</button>
          </div>
          <div id="tab-state" class="tab-panel"><pre id="statePre">{}</pre></div>
          <div id="tab-runs" class="tab-panel" hidden><pre id="runsPre">[]</pre></div>
          <div id="tab-events" class="tab-panel" hidden><pre id="eventsPre">[]</pre></div>
          <div id="tab-audit" class="tab-panel" hidden><pre id="auditPre">[]</pre></div>
          <div id="tab-tools" class="tab-panel" hidden><pre id="toolsPre">[]</pre></div>
          <div id="tab-secrets" class="tab-panel" hidden><pre id="secretsPre">[]</pre></div>
        </div>

        <div class="card">
          <div class="card-header"><h3>When command is required</h3><span class="badge warn">PC command</span></div>
          <div class="alert coral tiny">
            Codex OAuth, OCR/scanned PDF, real ad-platform mutation, real calendar booking, and local shell execution must run on the trusted PC/server. Use the approval queue for risky actions. For Codex OAuth: install Codex CLI, run <code>codex login</code> or <code>codex login --device-auth</code>, then enable model <code>openai-codex</code> in config.
          </div>
        </div>
      </div>
    </section>
    <div class="footer tiny">TunaFlowAI dashboard is dependency-free: no Bootstrap bundle, no icon font, no heavy client framework.</div>
  </div>

  <script>
    const AUTH_ENABLED = ${authFlag};
    const $ = function(id) { return document.getElementById(id); };
    const state = { overview: null, token: localStorage.getItem('tunaflow.apiToken') || '' };

    function headers(extra) {
      const base = Object.assign({ 'content-type': 'application/json' }, extra || {});
      if (state.token) base.authorization = 'Bearer ' + state.token;
      return base;
    }
    async function api(path, options) {
      const res = await fetch(path, Object.assign({ headers: headers() }, options || {}));
      const text = await res.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch (_err) { data = text; }
      if (!res.ok) throw new Error((data && data.error) || text || ('HTTP ' + res.status));
      return data;
    }
    function log(message, data) {
      const prefix = new Date().toLocaleTimeString() + ' ' + message;
      $('actionLog').textContent = prefix + (data === undefined ? '' : '\n' + pretty(data));
    }
    function pretty(value) { return JSON.stringify(value, null, 2); }
    function esc(value) {
      return String(value === undefined || value === null ? '' : value)
        .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
    }
    function badge(text, cls) { return '<span class="badge ' + (cls || '') + '">' + esc(text) + '</span>'; }
    function setText(id, value) { $(id).textContent = typeof value === 'string' ? value : pretty(value); }

    async function refresh() {
      try {
        const overview = await api('/overview');
        state.overview = overview;
        render(overview);
        log('Refreshed overview');
      } catch (err) {
        $('statusBadge').textContent = 'error';
        $('statusBadge').className = 'badge danger';
        log('Refresh failed', { error: err.message, authEnabled: AUTH_ENABLED });
      }
    }

    function render(data) {
      const health = data.health || {};
      $('statusBadge').textContent = health.ok ? 'ok' : 'check';
      $('statusBadge').className = 'badge ' + (health.ok ? 'ok' : 'warn');
      const approvals = data.approvals || [];
      const skills = data.skills || [];
      const channels = data.channels || [];
      const models = data.models || {};
      $('heroBadges').innerHTML = [
        '<span class="pill">Models ' + Object.keys(models).length + '</span>',
        '<span class="pill">Skills ' + skills.length + '</span>',
        '<span class="pill">Channels ' + channels.length + '</span>',
        '<span class="pill">Pending approvals ' + approvals.length + '</span>'
      ].join('');
      $('metrics').innerHTML = metric('Runs', (data.runs || []).length, 'recent runtime runs') + metric('Events', (data.events || []).length, 'recent compact events') + metric('Tools', (data.tools || []).length, 'registered tool actions') + metric('Skills', skills.length, 'loaded job skills');
      setText('statusPre', { ok: health.ok, identity: data.identity, activePersona: data.activePersona, auditVerification: data.auditVerification });
      setText('statePre', data.state || {});
      setText('runsPre', data.runs || []);
      setText('eventsPre', data.events || []);
      setText('auditPre', data.audit || []);
      setText('toolsPre', data.tools || []);
      setText('secretsPre', data.secrets || []);
      renderModels(models);
      renderApprovals(approvals);
      renderSkills(skills);
      renderPersonas(data.personas || [], data.activePersona || null);
      renderIdentity(data.identity || {});
      renderTasks(data.tasks || [], data.activeTask || null);
      renderChannels(channels);
    }
    function metric(value, label, sub) {
      return '<div class="metric"><div class="value">' + esc(value) + '</div><div class="label">' + esc(label) + '</div><div class="tiny muted">' + esc(sub) + '</div></div>';
    }
    function renderModels(models) {
      const entries = Object.entries(models || {});
      $('modelRows').innerHTML = entries.length ? entries.map(function(pair) {
        const name = pair[0]; const m = pair[1] || {};
        const cls = m.lastError ? 'danger' : (m.coolingDown ? 'warn' : 'ok');
        return '<div class="alert tiny"><div class="actions" style="justify-content:space-between"><strong>' + esc(name) + '</strong>' + badge(m.lastError ? 'error' : (m.coolingDown ? 'cooldown' : 'ready'), cls) + '</div><div class="muted">success ' + esc(m.successes || 0) + ' / failures ' + esc(m.failures || 0) + '</div>' + (m.lastError ? '<div class="tiny">' + esc(m.lastError).slice(0, 180) + '</div>' : '') + '</div>';
      }).join('') : '<div class="muted tiny">No models.</div>';
    }
    function renderApprovals(approvals) {
      $('approvalCount').textContent = String((approvals || []).length);
      $('approvalRows').innerHTML = (approvals || []).length ? approvals.map(function(a) {
        const id = a.id || a.approvalId || '';
        return '<div class="alert tiny"><div class="actions" style="justify-content:space-between"><strong>' + esc(a.tool || a.type || id) + '</strong>' + badge(a.risk || a.status || 'pending', 'danger') + '</div><div class="muted">' + esc(id) + '</div><pre style="margin-top:8px;max-height:160px">' + esc(pretty(a.args || a)) + '</pre><div class="actions" style="margin-top:8px"><button class="btn btn-primary btn-sm" data-approve="' + esc(id) + '">Approve</button><button class="btn btn-danger btn-sm" data-reject="' + esc(id) + '">Reject</button></div></div>';
      }).join('') : '<div class="muted tiny">No pending approvals.</div>';
    }
    function renderSkills(skills) {
      $('skillRows').innerHTML = (skills || []).map(function(s) {
        const riskCls = s.risk === 'high' || s.risk === 'critical' ? 'danger' : (s.risk === 'medium' ? 'warn' : 'ok');
        return '<tr><td><strong>' + esc(s.name) + '</strong><div class="tiny muted">' + esc(s.description || '') + '</div></td><td>' + esc((s.jobs || []).join(', ') || s.job || '-') + '</td><td>' + badge(s.risk || 'low', riskCls) + '</td><td class="tiny">' + esc((s.tools || []).join(', ')) + '</td></tr>';
      }).join('') || '<tr><td colspan="4" class="muted">No skills loaded.</td></tr>';
    }
    function renderPersonas(personas, active) {
      const activeId = (active && (active.id || active.name)) || '';
      $('personaSelect').innerHTML = (personas || []).map(function(p) {
        const id = p.id || p.name;
        return '<option value="' + esc(id) + '" ' + (id === activeId ? 'selected' : '') + '>' + esc(p.name || id) + '</option>';
      }).join('');
    }
    function renderIdentity(identity) {
      $('identityName').value = identity.name || '';
      $('identityPersonality').value = identity.personality || '';
      $('identityJson').value = pretty(identity || {});
    }
    function renderTasks(tasks, active) {
      const activeId = active && active.id;
      $('taskRows').innerHTML = (tasks || []).map(function(t) {
        return '<tr><td><strong>' + esc(t.title || t.id) + '</strong>' + (t.id === activeId ? ' ' + badge('active', 'ok') : '') + '<div class="tiny muted">' + esc(t.id || '') + '</div></td><td>' + esc(t.status || '-') + '</td><td class="tiny">' + esc(pretty(t.budget || t.budgets || {})) + '</td></tr>';
      }).join('') || '<tr><td colspan="3" class="muted">No tasks.</td></tr>';
    }
    function renderChannels(channels) {
      $('channelRows').innerHTML = (channels || []).length ? channels.map(function(c) {
        const id = c.id || c.name || c.channel || 'channel';
        const url = location.origin + '/channels/' + encodeURIComponent(id) + '/webhook';
        return '<div class="alert tiny"><div class="actions" style="justify-content:space-between"><strong>' + esc(id) + '</strong>' + badge(c.enabled === false ? 'disabled' : 'enabled', c.enabled === false ? 'warn' : 'ok') + '</div><div class="muted">' + esc(c.type || c.provider || '') + '</div><code>' + esc(url) + '</code></div>';
      }).join('') : '<div class="muted tiny">No configured channels.</div>';
    }

    async function sendChat() {
      const body = {
        text: $('chatText').value,
        channel: $('chatChannel').value || undefined,
        conversationId: $('chatConversation').value || undefined,
        recipientId: $('chatConversation').value || undefined
      };
      const result = await api('/chat', { method: 'POST', body: JSON.stringify(body) });
      log('Chat sent', result);
      await refresh();
    }
    function fillEvent() {
      $('eventJson').value = pretty({ type: 'user.message', text: $('chatText').value || '', channel: $('chatChannel').value || undefined, conversationId: $('chatConversation').value || undefined });
    }
    async function emitEvent() {
      let body;
      try { body = JSON.parse($('eventJson').value || '{}'); } catch (err) { throw new Error('Invalid event JSON: ' + err.message); }
      const result = await api('/events', { method: 'POST', body: JSON.stringify(body) });
      log('Event emitted', result);
      await refresh();
    }
    async function saveIdentity() {
      let patch = {};
      try { patch = JSON.parse($('identityJson').value || '{}'); } catch (err) { throw new Error('Invalid identity JSON: ' + err.message); }
      if ($('identityName').value) patch.name = $('identityName').value;
      if ($('identityPersonality').value) patch.personality = $('identityPersonality').value;
      const result = await api('/identity', { method: 'POST', body: JSON.stringify(patch) });
      log('Identity saved', result);
      await refresh();
    }
    async function switchPersona() {
      const name = $('personaSelect').value;
      if (!name) return;
      const result = await api('/personas/switch', { method: 'POST', body: JSON.stringify({ name: name, source: 'dashboard' }) });
      log('Persona switched', result);
      await refresh();
    }
    async function createTask() {
      const title = $('taskTitle').value.trim();
      if (!title) throw new Error('Task title is required');
      const result = await api('/tasks', { method: 'POST', body: JSON.stringify({ title: title }) });
      log('Task created', result);
      $('taskTitle').value = '';
      await refresh();
    }
    async function reloadSkills() {
      const result = await api('/skills/reload', { method: 'POST', body: JSON.stringify({}) });
      log('Skills reloaded', result);
      await refresh();
    }
    async function acquireSkill() {
      const source = $('skillSource').value.trim();
      if (!source) throw new Error('Skill source is required');
      const result = await api('/skills/acquire', { method: 'POST', body: JSON.stringify({ source: source }) });
      log('Skill acquired', result);
      await refresh();
    }
    async function resolveApproval(id, action) {
      const result = await api('/approvals/' + encodeURIComponent(id) + '/' + action, { method: 'POST', body: JSON.stringify({ source: 'dashboard' }) });
      log('Approval ' + action, result);
      await refresh();
    }
    function switchTab(name) {
      document.querySelectorAll('.tab-panel').forEach(function(panel) { panel.hidden = panel.id !== 'tab-' + name; });
    }

    document.addEventListener('click', function(evt) {
      const approve = evt.target.getAttribute && evt.target.getAttribute('data-approve');
      const reject = evt.target.getAttribute && evt.target.getAttribute('data-reject');
      const tab = evt.target.getAttribute && evt.target.getAttribute('data-tab');
      if (approve) resolveApproval(approve, 'approve').catch(function(err) { log('Approval failed', { error: err.message }); });
      if (reject) resolveApproval(reject, 'reject').catch(function(err) { log('Rejection failed', { error: err.message }); });
      if (tab) switchTab(tab);
    });
    function bind(id, fn) { $(id).addEventListener('click', function() { Promise.resolve(fn()).catch(function(err) { log('Action failed', { error: err.message }); }); }); }
    bind('refresh', refresh);
    bind('sendChat', sendChat);
    bind('fillEvent', fillEvent);
    bind('emitEvent', emitEvent);
    bind('saveIdentity', saveIdentity);
    bind('switchPersona', switchPersona);
    bind('createTask', createTask);
    bind('reloadSkills', reloadSkills);
    bind('acquireSkill', acquireSkill);
    $('saveToken').addEventListener('click', function() { state.token = $('apiToken').value.trim(); localStorage.setItem('tunaflow.apiToken', state.token); log('Token saved locally'); refresh(); });
    $('logout').addEventListener('click', function() { state.token = ''; localStorage.removeItem('tunaflow.apiToken'); $('apiToken').value = ''; api('/auth/logout', { method: 'POST', body: '{}' }).catch(function() {}).finally(refresh); });
    $('apiToken').value = state.token;
    switchTab('state');
    refresh();
  </script>
</body>
</html>`;
}
