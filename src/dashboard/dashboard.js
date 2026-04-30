export function renderDashboardHtml({ authEnabled = false } = {}) {
  const authBadge = authEnabled ? 'Auth enabled' : 'Local token optional';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>TunaFlowAI Dashboard</title>
<style>
:root{
  --tf-ocean-950:#071b2c;
  --tf-ocean-900:#0b2942;
  --tf-ocean-800:#113653;
  --tf-ocean-700:#164b6f;
  --tf-aqua-500:#1dd3c7;
  --tf-aqua-300:#83f3e7;
  --tf-tuna-200:#dce9ef;
  --tf-tuna-300:#b6cad3;
  --tf-tuna-500:#6d8794;
  --tf-coral:#ff7a59;
  --tf-lime:#b7f36b;
  --tf-card:rgba(255,255,255,.075);
  --tf-card-strong:rgba(255,255,255,.12);
  --tf-border:rgba(220,233,239,.18);
  --tf-shadow:0 20px 70px rgba(0,0,0,.28);
  --tf-radius:22px;
  color-scheme:dark;
}
*{box-sizing:border-box}
html,body{margin:0;min-height:100%;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:radial-gradient(circle at 18% 8%,rgba(29,211,199,.25),transparent 27rem),radial-gradient(circle at 82% 15%,rgba(255,122,89,.16),transparent 26rem),linear-gradient(135deg,var(--tf-ocean-950),var(--tf-ocean-900) 55%,#061522);color:#f5fbff}
body{letter-spacing:.01em}
button,input,select,textarea{font:inherit}
button{cursor:pointer}
.shell{display:grid;grid-template-columns:280px 1fr;min-height:100vh}
.sidebar{position:sticky;top:0;height:100vh;padding:24px;border-right:1px solid var(--tf-border);background:linear-gradient(180deg,rgba(7,27,44,.92),rgba(7,27,44,.68));backdrop-filter:blur(16px)}
.brand{display:flex;align-items:center;gap:14px;margin-bottom:26px}
.logo-mark{width:54px;height:54px;display:grid;place-items:center;border-radius:18px;background:linear-gradient(135deg,var(--tf-aqua-500),#0b7ea2);box-shadow:0 12px 36px rgba(29,211,199,.22)}
.logo-mark svg{width:40px;height:40px;display:block;filter:drop-shadow(0 5px 10px rgba(0,0,0,.2))}
.brand h1{font-size:1.1rem;line-height:1.1;margin:0;font-weight:800;letter-spacing:.02em}
.brand small{display:block;color:var(--tf-tuna-300);font-weight:600;margin-top:3px}
.nav{display:grid;gap:9px;margin:18px 0 24px}
.nav button{border:1px solid transparent;background:transparent;color:var(--tf-tuna-200);border-radius:14px;text-align:left;padding:12px 14px;font-weight:700}
.nav button.active,.nav button:hover{background:var(--tf-card-strong);border-color:var(--tf-border);color:#fff}
.sidebar-card{border:1px solid var(--tf-border);background:var(--tf-card);border-radius:18px;padding:15px;margin-top:14px}
.sidebar-card b{display:block;margin-bottom:5px}.muted{color:var(--tf-tuna-300)}
.main{padding:28px 32px 44px;overflow:min(visible,auto)}
.topbar{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;margin-bottom:24px}
.kicker{text-transform:uppercase;letter-spacing:.18em;color:var(--tf-aqua-300);font-size:.72rem;font-weight:800}.title{font-size:clamp(2rem,4vw,4.2rem);line-height:.94;margin:8px 0 10px;font-weight:900}.subtitle{max-width:860px;margin:0;color:var(--tf-tuna-200);font-size:1rem;line-height:1.55}.status-pill{display:inline-flex;align-items:center;gap:8px;border:1px solid var(--tf-border);background:var(--tf-card);border-radius:999px;padding:9px 12px;font-weight:800;white-space:nowrap}.dot{width:9px;height:9px;border-radius:999px;background:var(--tf-lime);box-shadow:0 0 18px var(--tf-lime)}
.grid{display:grid;grid-template-columns:repeat(12,1fr);gap:16px}.card{grid-column:span 4;border:1px solid var(--tf-border);border-radius:var(--tf-radius);background:linear-gradient(180deg,var(--tf-card-strong),rgba(255,255,255,.055));box-shadow:var(--tf-shadow);padding:18px;min-height:120px}.card.large{grid-column:span 8}.card.full{grid-column:1/-1}.card h2,.card h3{margin:0 0 12px;font-size:1.05rem}.metric{font-size:2.1rem;font-weight:900;line-height:1;margin:.2rem 0}.label{font-size:.8rem;text-transform:uppercase;letter-spacing:.12em;color:var(--tf-tuna-300);font-weight:800}.row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.field{display:grid;gap:7px;margin-bottom:12px}.field label{font-size:.78rem;text-transform:uppercase;letter-spacing:.11em;color:var(--tf-tuna-300);font-weight:800}.input,select,textarea{width:100%;border:1px solid var(--tf-border);border-radius:14px;background:rgba(3,16,27,.55);color:#fff;padding:12px 13px;outline:none}textarea{min-height:110px;resize:vertical}.input:focus,select:focus,textarea:focus{border-color:rgba(29,211,199,.7);box-shadow:0 0 0 3px rgba(29,211,199,.14)}.btn{border:0;border-radius:14px;background:linear-gradient(135deg,var(--tf-aqua-500),#0ba5bd);color:#04202b;font-weight:900;padding:12px 15px;box-shadow:0 14px 26px rgba(29,211,199,.18)}.btn.secondary{background:rgba(255,255,255,.09);color:#fff;border:1px solid var(--tf-border);box-shadow:none}.btn.danger{background:linear-gradient(135deg,var(--tf-coral),#ffad6e);color:#281008}.btn:disabled{opacity:.55;cursor:not-allowed}.split{display:grid;grid-template-columns:1fr 1fr;gap:12px}.panel{display:none}.panel.active{display:block}.list{display:grid;gap:9px;max-height:460px;overflow:auto}.item{border:1px solid var(--tf-border);background:rgba(255,255,255,.055);border-radius:16px;padding:12px}.item strong{display:block;margin-bottom:4px}.badge{display:inline-flex;align-items:center;border:1px solid var(--tf-border);border-radius:999px;padding:4px 8px;font-size:.76rem;font-weight:800;color:var(--tf-tuna-200);background:rgba(255,255,255,.07)}.badge.high,.badge.critical{color:#fff;background:rgba(255,122,89,.22);border-color:rgba(255,122,89,.4)}.badge.medium{color:#fff;background:rgba(255,190,90,.18);border-color:rgba(255,190,90,.36)}.code{white-space:pre-wrap;word-break:break-word;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.82rem;line-height:1.45;background:rgba(0,0,0,.25);border-radius:14px;padding:12px;border:1px solid var(--tf-border);max-height:360px;overflow:auto}.toolbar{display:flex;gap:10px;align-items:center;justify-content:space-between;margin-bottom:13px}.table{width:100%;border-collapse:separate;border-spacing:0 8px}.table td,.table th{text-align:left;padding:10px 12px}.table tr{background:rgba(255,255,255,.055)}.table tr td:first-child,.table tr th:first-child{border-radius:14px 0 0 14px}.table tr td:last-child,.table tr th:last-child{border-radius:0 14px 14px 0}.table th{color:var(--tf-tuna-300);font-size:.75rem;text-transform:uppercase;letter-spacing:.1em}.toast{position:fixed;right:24px;bottom:24px;max-width:420px;border:1px solid var(--tf-border);border-radius:18px;background:rgba(7,27,44,.95);box-shadow:var(--tf-shadow);padding:14px 16px;display:none}.toast.show{display:block}.wave{height:8px;border-radius:999px;background:linear-gradient(90deg,var(--tf-aqua-500),var(--tf-tuna-300),var(--tf-coral));opacity:.9;margin-top:18px}
@media (max-width:980px){.shell{grid-template-columns:1fr}.sidebar{position:relative;height:auto}.main{padding:22px}.card,.card.large{grid-column:1/-1}.split{grid-template-columns:1fr}.topbar{display:block}.status-pill{margin-top:16px}}
</style>
</head>
<body>
<div class="shell">
<aside class="sidebar">
  <div class="brand">
    <div class="logo-mark" aria-label="TunaFlowAI fish logo">
      <svg viewBox="0 0 64 64" role="img" aria-hidden="true">
        <path d="M6 33c7-11 18-17 32-17 8 0 15 3 20 9l-7 8 7 8c-5 6-12 9-20 9C24 50 13 44 6 33Z" fill="#dce9ef"/>
        <path d="M12 33c6-8 15-12 26-12 6 0 12 2 16 6l-5 6 5 6c-4 4-10 6-16 6-11 0-20-4-26-12Z" fill="#1dd3c7" opacity=".9"/>
        <path d="M45 18c-4 5-8 9-15 12 8 1 13 5 17 12 2-8 2-16-2-24Z" fill="#83f3e7"/>
        <circle cx="22" cy="31" r="2.6" fill="#071b2c"/>
        <path d="M5 33 18 26v14L5 33Z" fill="#ff7a59"/>
      </svg>
    </div>
    <div><h1>TunaFlowAI</h1><small>Local agent control center</small></div>
  </div>
  <div class="nav" id="nav"></div>
  <div class="sidebar-card"><b>Session</b><span class="muted" id="authBadge">${authBadge}</span><div class="field" style="margin-top:10px"><label>Token Bearer</label><input class="input" id="tokenInput" type="password" placeholder="Paste local token" /></div><button class="btn secondary" id="saveToken">Save token</button></div>
  <div class="sidebar-card"><b>Runstime</b><div class="muted" id="runtimeSummary">Loading...</div><div class="wave"></div></div>
</aside>
<main class="main">
  <div class="topbar">
    <div><div class="kicker">Tuna themed, Bootstrap-like, dependency-free</div><div class="title">Command every channel from one light GUI.</div><p class="subtitle">Choose a model, send channel events, inspect approvals, manage skills, review audit logs, and keep full command-line escape hatches for heavy local tasks.</p></div>
    <div class="status-pill"><span class="dot"></span><span id="statusText">Connecting</span></div>
  </div>
  <section class="panel active" data-panel="overview"><div class="grid" id="overviewGrid"></div></section>
  <section class="panel" data-panel="chat"><div class="grid"><div class="card large"><h2>Chat and channel command</h2><div class="split"><div class="field"><label>Model</label><select id="modelSelect"></select></div><div class="field"><label>Chain</label><select id="chainSelect"></select></div></div><div class="field"><label>Message</label><textarea id="chatText" placeholder="Ask TunaFlowAI to do something..."></textarea></div><div class="row"><button class="btn" id="sendChat">Send to TunaFlowAI</button><button class="btn secondary" id="refreshChatData">Refresh models</button></div></div><div class="card"><h2>Response</h2><div class="code" id="chatResult">No response yet.</div></div><div class="card full"><h2>Inject event</h2><div class="split"><div class="field"><label>Events type</label><input class="input" id="eventType" value="user.message" /></div><div class="field"><label>Priority</label><select id="eventPriority"><option>normal</option><option>high</option><option>low</option></select></div></div><div class="field"><label>Events text</label><textarea id="eventText" placeholder="Events text"></textarea></div><button class="btn secondary" id="postEvents">Post event</button></div></div></section>
  <section class="panel" data-panel="models"><div class="grid"><div class="card full"><div class="toolbar"><h2>Model catalog and health</h2><button class="btn secondary" id="refreshModel">Refresh</button></div><div id="modelsView"></div></div></div></section>
  <section class="panel" data-panel="skills"><div class="grid"><div class="card full"><div class="toolbar"><h2>Skills and tools</h2><button class="btn secondary" id="refreshSkills">Refresh</button></div><div class="split"><div><h3>Bundled skills</h3><div class="list" id="skillsList"></div></div><div><h3>Registered tools</h3><div class="list" id="toolsList"></div></div></div></div></div></section>
  <section class="panel" data-panel="approvals"><div class="grid"><div class="card full"><div class="toolbar"><h2>Approvals</h2><button class="btn secondary" id="refreshApprovals">Refresh</button></div><div class="list" id="approvalsList"></div></div></div></section>
  <section class="panel" data-panel="operations"><div class="grid"><div class="card"><h2>Tasks</h2><div class="list" id="tasksList"></div></div><div class="card"><h2>Channel</h2><div class="list" id="channelsList"></div></div><div class="card"><h2>Secrets</h2><div class="list" id="secretsList"></div></div><div class="card full"><h2>Runs</h2><div class="list" id="runsList"></div></div></div></section>
  <section class="panel" data-panel="logs"><div class="grid"><div class="card large"><h2>Events</h2><div class="list" id="eventsList"></div></div><div class="card"><h2>Audit</h2><div class="list" id="auditList"></div></div></div></section>
</main>
</div>
<div class="toast" id="toast"></div>
<script>
(function(){
  var panels = ['overview','chat','models','skills','approvals','operations','logs'];
  var labels = {overview:'Overview',chat:'Chat and events',models:'Model',skills:'Skills and tools',approvals:'Approvals',operations:'Operations',logs:'Events and audit'};
  var state = { token: localStorage.getItem('tunaflow.token') || '', catalog: null, models: null };
  function $(id){ return document.getElementById(id); }
  function esc(value){ return String(value == null ? '' : value).replace(/[&<>"']/g, function(ch){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]); }); }
  function json(value){ try { return JSON.stringify(value, null, 2); } catch (_e) { return String(value); } }
  function toast(message){ var el=$('toast'); el.textContent=message; el.className='toast show'; setTimeout(function(){ el.className='toast'; }, 3600); }
  function headers(){ var h={'content-type':'application/json'}; if(state.token) h.authorization='Bearer '+state.token; return h; }
  async function api(path, options){ var res = await fetch(path, Object.assign({headers:headers()}, options || {})); var text = await res.text(); var data; try{ data = text ? JSON.parse(text) : null; }catch(_e){ data = text; } if(!res.ok) throw new Error((data && data.error) || text || ('HTTP '+res.status)); return data; }
  function setPanel(name){ document.querySelectorAll('.panel').forEach(function(p){ p.classList.toggle('active', p.dataset.panel===name); }); document.querySelectorAll('#nav button').forEach(function(b){ b.classList.toggle('active', b.dataset.panel===name); }); localStorage.setItem('tunaflow.panel', name); }
  function initNav(){ $('nav').innerHTML = panels.map(function(name){ return '<button data-panel="'+name+'">'+labels[name]+'</button>'; }).join(''); document.querySelectorAll('#nav button').forEach(function(b){ b.addEventListener('click', function(){ setPanel(b.dataset.panel); }); }); setPanel(localStorage.getItem('tunaflow.panel') || 'overview'); }
  function renderList(id, rows, mapper){ var el=$(id); if(!el) return; var list=Array.isArray(rows)?rows:[]; if(!list.length){ el.innerHTML='<div class="item muted">Nothing to show.</div>'; return; } el.innerHTML=list.map(mapper).join(''); }
  function renderOverview(data){ var overview=data.overview||{}; var approvals=data.approvals||[]; var skills=data.skills||[]; var tools=data.tools||[]; var models=(data.catalog&&data.catalog.configuredModels)||[]; $('runtimeSummary').textContent = 'Skills '+skills.length+' / Tools '+tools.length+' / Model '+models.length; $('overviewGrid').innerHTML = [
    ['Approvals tertunda', approvals.length, 'Approval-gated risky actions waiting for you.'],
    ['Configured models', models.length, 'OpenAI, Codex OAuth, local, and compatible providers.'],
    ['Bundled skills', skills.length, 'Role-based jobs and automation workflows.'],
    ['Registered tools', tools.length, 'Safe local actions, dry-runs, and command hints.'],
    ['Active persona', overview.activePersona || 'default', 'Persona-aware chain selection.'],
    ['Agent status', overview.status || 'ready', 'Local gateway is reachable.']
  ].map(function(m){return '<div class="card"><div class="label">'+esc(m[0])+'</div><div class="metric">'+esc(m[1])+'</div><div class="muted">'+esc(m[2])+'</div></div>';}).join(''); }
  function renderModel(catalog, health){ state.catalog=catalog; state.models=health; var configured=catalog.configuredModels || catalog.models || []; var chains=catalog.chains || {}; var healthMap={}; ((health&&health.models)||[]).forEach(function(m){ healthMap[m.name]=m; }); var rows = configured.map(function(m){ var h=healthMap[m.name]||{}; return '<tr><td><strong>'+esc(m.name)+'</strong><br><span class="muted">'+esc(m.provider)+'</span></td><td>'+esc(m.model||m.codexModel||'default')+'</td><td><span class="badge '+esc(h.status||'')+'">'+esc(h.status|| (m.enabled===false?'disabled':'ready'))+'</span></td><td>'+esc((m.capabilities||[]).join(', '))+'</td></tr>'; }).join(''); $('modelsView').innerHTML = '<h3>Configured models</h3><table class="table"><thead><tr><th>Name</th><th>Model</th><th>Status</th><th>Capabilities</th></tr></thead><tbody>'+rows+'</tbody></table><h3>Chains</h3><div class="list">'+Object.keys(chains).map(function(k){return '<div class="item"><strong>'+esc(k)+'</strong><span class="muted">'+esc(chains[k].join(' -> '))+'</span></div>';}).join('')+'</div>';
    var modelOptions = ['<option value="">Use chain default</option>'].concat(configured.map(function(m){ return '<option value="'+esc(m.name)+'">'+esc(m.name+' ('+(m.provider||'provider')+')')+'</option>'; })); $('modelSelect').innerHTML = modelOptions.join('');
    var chainOptions = Object.keys(chains).map(function(name){ return '<option value="'+esc(name)+'">'+esc(name)+'</option>'; }); $('chainSelect').innerHTML = chainOptions.join(''); }
  async function refreshCore(){ try{ var results=await Promise.allSettled([api('/overview'),api('/approvals'),api('/skills'),api('/tools'),api('/models/catalog'),api('/models'),api('/tasks'),api('/channels'),api('/secrets'),api('/runs'),api('/events'),api('/audit')]); var names=['overview','approvals','skills','tools','catalog','models','tasks','channels','secrets','runs','events','audit']; var data={}; results.forEach(function(r,i){ data[names[i]]=r.status==='fulfilled'?r.value:null; }); $('statusText').textContent='Online'; renderOverview(data); renderModel(data.catalog||{}, data.models||{}); renderList('skillsList',(data.skills&&data.skills.skills)||data.skills||[],function(s){return '<div class="item"><strong>'+esc(s.name||s.id)+'</strong><div class="muted">'+esc(s.description||s.job||'')+'</div></div>';}); renderList('toolsList',(data.tools&&data.tools.tools)||data.tools||[],function(t){return '<div class="item"><strong>'+esc(t.name)+'</strong><span class="badge '+esc(t.risk)+'">'+esc(t.risk)+'</span><div class="muted">'+esc(t.description||'')+'</div></div>';}); renderList('approvalsList',(data.approvals&&data.approvals.pending)||data.approvals||[],function(a){return '<div class="item"><strong>'+esc(a.id||a.tool||'approval')+'</strong><span class="badge '+esc(a.risk||'medium')+'">'+esc(a.risk||'medium')+'</span><div class="code">'+esc(json(a))+'</div></div>';}); renderList('tasksList',(data.tasks&&data.tasks.tasks)||data.tasks||[],function(t){return '<div class="item"><strong>'+esc(t.title||t.id||'task')+'</strong><div class="muted">'+esc(t.status||'')+'</div></div>';}); renderList('channelsList',(data.channels&&data.channels.channels)||data.channels||[],function(c){return '<div class="item"><strong>'+esc(c.id||c.name||'channel')+'</strong><div class="muted">'+esc(c.type||c.kind||'')+'</div></div>';}); renderList('secretsList',(data.secrets&&data.secrets.secrets)||data.secrets||[],function(s){return '<div class="item"><strong>'+esc(s.name||s.key||'secret')+'</strong><div class="muted">'+esc(s.status||'configured')+'</div></div>';}); renderList('runsList',(data.runs&&data.runs.runs)||data.runs||[],function(r){return '<div class="item"><strong>'+esc(r.id||'run')+'</strong><div class="muted">'+esc(r.status||'')+'</div></div>';}); renderList('eventsList',(data.events&&data.events.events)||data.events||[],function(e){return '<div class="item"><strong>'+esc(e.type||'event')+'</strong><div class="muted">'+esc(e.createdAt||e.timestamp||'')+'</div><div>'+esc(e.text||'')+'</div></div>';}); renderList('auditList',(data.audit&&data.audit.entries)||data.audit||[],function(a){return '<div class="item"><strong>'+esc(a.type||a.action||'audit')+'</strong><div class="muted">'+esc(a.createdAt||a.timestamp||'')+'</div></div>';}); }catch(err){ $('statusText').textContent='Offline'; toast(err.message); } }
  async function sendChat(){ var text=$('chatText').value.trim(); if(!text){ toast('Write a message first.'); return; } var model=$('modelSelect').value; var chain=$('chainSelect').value; var body={text:text, message:text}; if(model){ body.model=model; body.chain=model; } else if(chain){ body.chain=chain; } $('chatResult').textContent='Sending...'; try{ var result=await api('/chat',{method:'POST',body:JSON.stringify(body)}); $('chatResult').textContent=json(result); await refreshCore(); }catch(err){ $('chatResult').textContent=err.message; } }
  async function postEvents(){ var model=$('modelSelect').value; var body={type:$('eventType').value||'user.message', priority:$('eventPriority').value||'normal', text:$('eventText').value||'', payload:{source:'dashboard'}}; if(model){ body.payload.model=model; body.payload.chain=model; } try{ var result=await api('/events',{method:'POST',body:JSON.stringify(body)}); toast('Events posted: '+(result.id||'ok')); await refreshCore(); }catch(err){ toast(err.message); } }
  function init(){ initNav(); $('tokenInput').value=state.token; $('saveToken').onclick=function(){ state.token=$('tokenInput').value.trim(); localStorage.setItem('tunaflow.token',state.token); toast('Token saved locally.'); refreshCore(); }; $('sendChat').onclick=sendChat; $('postEvents').onclick=postEvents; ['refreshModel','refreshSkills','refreshApprovals','refreshChatData'].forEach(function(id){ var el=$(id); if(el) el.onclick=refreshCore; }); refreshCore(); setInterval(refreshCore, 30000); }
  init();
})();
</script>
</body>
</html>`;
}

export const dashboardHtml = renderDashboardHtml();
