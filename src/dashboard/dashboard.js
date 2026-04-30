export function renderDashboardHtml() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>TunaFlowAI Local Dashboard</title>
<style>
:root { color-scheme: dark; --bg:#0b1020; --panel:#121a2e; --panel2:#17213a; --text:#eef4ff; --muted:#94a3b8; --accent:#63e6be; --warn:#fbbf24; --bad:#fb7185; --line:#26324d; }
* { box-sizing: border-box; }
body { margin:0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif; background: radial-gradient(circle at top left, #172554, var(--bg) 38rem); color:var(--text); }
header { padding:24px 28px 12px; display:flex; gap:16px; align-items:center; justify-content:space-between; flex-wrap:wrap; }
h1 { margin:0; font-size:26px; letter-spacing:-0.03em; }
.subtitle { color:var(--muted); margin-top:4px; font-size:14px; }
main { padding:12px 28px 32px; display:grid; gap:16px; grid-template-columns: repeat(12, 1fr); }
.card { background: rgba(18, 26, 46, .88); border:1px solid var(--line); border-radius:16px; padding:16px; box-shadow: 0 18px 60px rgba(0,0,0,.25); }
.card h2 { margin:0 0 12px; font-size:15px; text-transform:uppercase; letter-spacing:.08em; color:#cbd5e1; }
.span-3 { grid-column: span 3; } .span-4 { grid-column: span 4; } .span-5 { grid-column: span 5; } .span-6 { grid-column: span 6; } .span-7 { grid-column: span 7; } .span-8 { grid-column: span 8; } .span-12 { grid-column: span 12; }
.kpi { display:flex; flex-direction:column; gap:2px; }
.kpi strong { font-size:28px; }
.kpi span { color:var(--muted); font-size:13px; }
.row { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
input, select, textarea, button { border-radius:10px; border:1px solid var(--line); background:#0f172a; color:var(--text); padding:10px 12px; font:inherit; }
input, select, textarea { min-width:0; flex:1; }
button { cursor:pointer; background:linear-gradient(180deg,#1e293b,#111827); }
button.primary { border-color:#2dd4bf; color:#a7f3d0; }
button.danger { border-color:#fb7185; color:#fecdd3; }
button:hover { filter:brightness(1.1); }
pre, code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
pre { max-height:340px; overflow:auto; margin:0; white-space:pre-wrap; background:#0a1020; border:1px solid var(--line); border-radius:12px; padding:12px; font-size:12px; color:#dbeafe; }
.list { display:flex; flex-direction:column; gap:10px; }
.item { border:1px solid var(--line); background:rgba(15,23,42,.68); border-radius:12px; padding:10px; }
.item .meta { color:var(--muted); font-size:12px; margin-bottom:6px; }
.badge { display:inline-flex; gap:4px; align-items:center; border:1px solid var(--line); border-radius:999px; padding:4px 8px; font-size:12px; color:#cbd5e1; background:rgba(15,23,42,.7); }
.good { color:var(--accent); } .warn { color:var(--warn); } .bad { color:var(--bad); }
footer { color:var(--muted); padding:0 28px 28px; font-size:12px; }
@media (max-width: 1000px) { .span-3,.span-4,.span-5,.span-6,.span-7,.span-8 { grid-column: span 12; } main { padding:8px 14px 24px; } header { padding:18px 14px 8px; } }
</style>
</head>
<body>
<header>
  <div><h1>TunaFlowAI Local Dashboard</h1><!-- TunaFlowAI Dashboard --><div class="subtitle">Localhost GUI for personas, job skills, approvals, models, logs, and work state.</div></div>
  <div class="row"><input id="token" type="password" placeholder="API token if enabled" /><button id="saveToken">Save token</button><button id="refresh" class="primary">Refresh</button></div>
</header>
<main>
  <section class="card span-3"><h2>Status</h2><div class="kpi"><strong id="health">...</strong><span id="healthMeta">gateway</span></div></section>
  <section class="card span-3"><h2>Active Persona</h2><div class="kpi"><strong id="activePersona">...</strong><span id="activePersonaMeta">persona</span></div></section>
  <section class="card span-3"><h2>Pending Approvals</h2><div class="kpi"><strong id="approvalCount">0</strong><span>approval queue</span></div></section>
  <section class="card span-3"><h2>Model Attempts</h2><div class="kpi"><strong id="modelAttempts">0</strong><span>total attempts</span></div></section>

  <section class="card span-7"><h2>Chat / Event</h2><div class="row"><input id="chatText" placeholder="Ask TunaFlowAI something..." /><button class="primary" id="sendChat">Send chat</button></div><br/><div class="row"><input id="eventType" value="terminal.output" /><input id="eventText" placeholder="Event text, log, or signal..." /><button id="sendEvent">Emit event</button></div><br/><pre id="lastResult">No action yet.</pre></section>

  <section class="card span-5"><h2>Persona Switcher</h2><div class="row"><select id="personaSelect"></select><button class="primary" id="switchPersona">Switch persona</button></div><br/><div id="personaList" class="list"></div></section>

  <section class="card span-6"><h2>Job Skills</h2><div class="row"><input id="skillSource" placeholder="Skill name or local path to SKILL.md/folder" /><button id="acquireSkill">Acquire</button></div><br/><div id="skillList" class="list"></div></section>

  <section class="card span-6"><h2>Approvals</h2><div id="approvals" class="list"></div></section>

  <section class="card span-6"><h2>Model Health</h2><pre id="models">{}</pre></section>
  <section class="card span-6"><h2>Current State</h2><pre id="state">{}</pre></section>
  <section class="card span-6"><h2>Recent Runs</h2><pre id="runs">[]</pre></section>
  <section class="card span-6"><h2>Recent Events</h2><pre id="events">[]</pre></section>
  <section class="card span-12"><h2>Audit Log</h2><pre id="audit">[]</pre></section>
</main>
<footer>Run locally with <code>npm run dev</code> and open <code>http://127.0.0.1:8787/dashboard</code>. If <code>TUNAFLOW_API_TOKEN</code> is set, paste it above.</footer>
<script>
const $ = (id) => document.getElementById(id);
const tokenInput = $('token');
tokenInput.value = localStorage.getItem('tunaflow.token') || '';
$('saveToken').onclick = () => { localStorage.setItem('tunaflow.token', tokenInput.value); refresh(); };
$('refresh').onclick = refresh;
$('sendChat').onclick = async () => { const text = $('chatText').value; const result = await api('/chat', { method:'POST', body:{ text } }); $('lastResult').textContent = JSON.stringify(result, null, 2); await refresh(); };
$('sendEvent').onclick = async () => { const result = await api('/events', { method:'POST', body:{ type:$('eventType').value, text:$('eventText').value, priority:'high' } }); $('lastResult').textContent = JSON.stringify(result, null, 2); await refresh(); };
$('switchPersona').onclick = async () => { const name = $('personaSelect').value; const result = await api('/personas/' + encodeURIComponent(name) + '/activate', { method:'POST', body:{ source:'dashboard' } }); $('lastResult').textContent = JSON.stringify(result, null, 2); await refresh(); };
$('acquireSkill').onclick = async () => { const source = $('skillSource').value; const result = await api('/skills/acquire', { method:'POST', body:{ source } }); $('lastResult').textContent = JSON.stringify(result, null, 2); await refresh(); };

async function api(path, opts = {}) {
  const headers = { 'content-type':'application/json' };
  const token = tokenInput.value || localStorage.getItem('tunaflow.token') || '';
  if (token) headers.authorization = 'Bearer ' + token;
  const res = await fetch(path, { method: opts.method || 'GET', headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw:text }; }
  if (!res.ok) throw new Error(json.error || res.statusText);
  return json;
}

async function refresh() {
  try {
    const [health,state,runs,events,audit,models,skills,personas,active,approvals] = await Promise.all([
      api('/health'), api('/state'), api('/runs?limit=10'), api('/events?limit=10'), api('/audit?limit=20'), api('/models'), api('/skills'), api('/personas'), api('/personas/active'), api('/approvals?status=pending')
    ]);
    $('health').textContent = health.ok ? 'OK' : 'WARN';
    $('health').className = health.ok ? 'good' : 'warn';
    $('healthMeta').textContent = 'models: ' + Object.keys(health.models || {}).length;
    $('activePersona').textContent = active?.name || 'none';
    $('activePersonaMeta').textContent = active?.role || 'persona';
    $('approvalCount').textContent = approvals.length || 0;
    $('modelAttempts').textContent = Object.values(models || {}).reduce((n, m) => n + (m.totalAttempts || 0), 0);
    $('models').textContent = JSON.stringify(models, null, 2);
    $('state').textContent = JSON.stringify(state, null, 2);
    $('runs').textContent = JSON.stringify(runs, null, 2);
    $('events').textContent = JSON.stringify(events, null, 2);
    $('audit').textContent = JSON.stringify(audit, null, 2);
    renderPersonas(personas, active);
    renderSkills(skills);
    renderApprovals(approvals);
  } catch (err) {
    $('lastResult').textContent = 'Dashboard error: ' + err.message;
  }
}

function renderPersonas(personas, active) {
  $('personaSelect').innerHTML = personas.map((p) => '<option value="' + esc(p.name) + '" ' + (p.name === active?.name ? 'selected' : '') + '>' + esc(p.name) + ' - ' + esc(p.title || '') + '</option>').join('');
  $('personaList').innerHTML = personas.map((p) => '<div class="item"><div><span class="badge">' + esc(p.name) + '</span> ' + (p.active ? '<span class="badge good">active</span>' : '') + '</div><div class="meta">' + esc(p.role || '') + ' | ' + esc(p.riskPosture || '') + ' | ' + esc(p.autonomy || '') + '</div><div>' + esc(p.description || '') + '</div></div>').join('');
}
function renderSkills(skills) {
  $('skillList').innerHTML = skills.map((s) => '<div class="item"><div><span class="badge">' + esc(s.name) + '</span> <span class="badge">' + esc(s.trust || '') + '</span> <span class="badge">' + esc(s.risk || '') + '</span></div><div class="meta">tools: ' + esc((s.tools || []).join(', ')) + '</div><div>' + esc(s.description || '') + '</div></div>').join('');
}
function renderApprovals(approvals) {
  if (!approvals.length) { $('approvals').innerHTML = '<div class="item"><div class="meta">No pending approvals.</div></div>'; return; }
  $('approvals').innerHTML = approvals.map((a) => '<div class="item"><div><span class="badge warn">' + esc(a.tool || 'tool') + '</span> <span class="badge">' + esc(a.id) + '</span></div><div class="meta">' + esc(a.reason || '') + '</div><pre>' + esc(JSON.stringify(a.action, null, 2)) + '</pre><br/><div class="row"><button class="primary" onclick="approve(\'' + esc(a.id) + '\')">Approve</button><button class="danger" onclick="rejectApproval(\'' + esc(a.id) + '\')">Reject</button></div></div>').join('');
}
async function approve(id) { $('lastResult').textContent = JSON.stringify(await api('/approvals/' + id + '/approve', { method:'POST', body:{ source:'dashboard' } }), null, 2); await refresh(); }
async function rejectApproval(id) { $('lastResult').textContent = JSON.stringify(await api('/approvals/' + id + '/reject', { method:'POST', body:{ source:'dashboard' } }), null, 2); await refresh(); }
function esc(value) { return String(value ?? '').replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
refresh();
</script>
</body>
</html>`;
}
