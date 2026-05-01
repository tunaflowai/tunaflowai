export function renderDashboardHtml({ authEnabled = false, apiToken = '' } = {}) {
  const authBadge = authEnabled ? 'Auth enabled' : 'Local token optional';
  const escapedToken = String(apiToken || '').replace(/[<>"'&]/g, '');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>TunaFlowAI Dashboard</title>
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><path d='M6 33c7-11 18-17 32-17 8 0 15 3 20 9l-7 8 7 8c-5 6-12 9-20 9C24 50 13 44 6 33Z' fill='%23dce9ef'/><path d='M12 33c6-8 15-12 26-12 6 0 12 2 16 6l-5 6 5 6c-4 4-10 6-16 6-11 0-20-4-26-12Z' fill='%231dd3c7' opacity='.9'/><path d='M45 18c-4 5-8 9-15 12 8 1 13 5 17 12 2-8 2-16-2-24Z' fill='%2383f3e7'/><circle cx='22' cy='31' r='2.6' fill='%23071b2c'/><path d='M5 33 18 26v14L5 33Z' fill='%23ff7a59'/></svg>" />
<style>
:root{
  --tf-ocean-950:#071b2c;--tf-ocean-900:#0b2942;--tf-ocean-800:#113653;--tf-ocean-700:#164b6f;
  --tf-aqua-500:#1dd3c7;--tf-aqua-300:#83f3e7;
  --tf-tuna-200:#dce9ef;--tf-tuna-300:#b6cad3;--tf-tuna-500:#6d8794;
  --tf-coral:#ff7a59;--tf-lime:#b7f36b;
  --tf-card:rgba(255,255,255,.075);--tf-card-strong:rgba(255,255,255,.12);
  --tf-border:rgba(220,233,239,.18);--tf-shadow:0 20px 70px rgba(0,0,0,.28);--tf-radius:22px;
  color-scheme:dark;
}
*{box-sizing:border-box}
html,body{margin:0;min-height:100%;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:radial-gradient(circle at 18% 8%,rgba(29,211,199,.25),transparent 27rem),radial-gradient(circle at 82% 15%,rgba(255,122,89,.16),transparent 26rem),linear-gradient(135deg,var(--tf-ocean-950),var(--tf-ocean-900) 55%,#061522);color:#f5fbff}
body{letter-spacing:.01em}
button,input,select,textarea{font:inherit}
button{cursor:pointer}
.shell{display:grid;grid-template-columns:280px 1fr;min-height:100vh}
.sidebar{position:sticky;top:0;height:100vh;padding:24px;border-right:1px solid var(--tf-border);background:linear-gradient(180deg,rgba(7,27,44,.92),rgba(7,27,44,.68));backdrop-filter:blur(16px);overflow-y:auto}
.brand{display:flex;align-items:center;gap:14px;margin-bottom:26px}
.logo-mark{width:54px;height:54px;display:grid;place-items:center;border-radius:18px;background:linear-gradient(135deg,var(--tf-aqua-500),#0b7ea2);box-shadow:0 12px 36px rgba(29,211,199,.22);flex-shrink:0}
.logo-mark svg{width:40px;height:40px;display:block;filter:drop-shadow(0 5px 10px rgba(0,0,0,.2))}
.brand h1{font-size:1.1rem;line-height:1.1;margin:0;font-weight:800;letter-spacing:.02em}
.brand small{display:block;color:var(--tf-tuna-300);font-weight:600;margin-top:3px}
.nav{display:grid;gap:6px;margin:18px 0 20px}
.nav button{border:1px solid transparent;background:transparent;color:var(--tf-tuna-200);border-radius:14px;text-align:left;padding:11px 14px;font-weight:700;font-size:.92rem}
.nav button.active,.nav button:hover{background:var(--tf-card-strong);border-color:var(--tf-border);color:#fff}
.sidebar-card{border:1px solid var(--tf-border);background:var(--tf-card);border-radius:18px;padding:15px;margin-top:14px}
.sidebar-card b{display:block;margin-bottom:5px}
.muted{color:var(--tf-tuna-300)}
.main{padding:28px 32px 44px}
.topbar{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;margin-bottom:24px}
.kicker{text-transform:uppercase;letter-spacing:.18em;color:var(--tf-aqua-300);font-size:.72rem;font-weight:800}
.title{font-size:clamp(2rem,4vw,4.2rem);line-height:.94;margin:8px 0 10px;font-weight:900}
.subtitle{max-width:860px;margin:0;color:var(--tf-tuna-200);font-size:1rem;line-height:1.55}
.status-pill{display:inline-flex;align-items:center;gap:8px;border:1px solid var(--tf-border);background:var(--tf-card);border-radius:999px;padding:9px 12px;font-weight:800;white-space:nowrap}
.dot{width:9px;height:9px;border-radius:999px;background:var(--tf-lime);box-shadow:0 0 18px var(--tf-lime)}
.grid{display:grid;grid-template-columns:repeat(12,1fr);gap:16px}
.card{grid-column:span 4;border:1px solid var(--tf-border);border-radius:var(--tf-radius);background:linear-gradient(180deg,var(--tf-card-strong),rgba(255,255,255,.055));box-shadow:var(--tf-shadow);padding:18px;min-height:120px}
.card.large{grid-column:span 8}.card.full{grid-column:1/-1}
.card h2,.card h3{margin:0 0 12px;font-size:1.05rem}
.metric{font-size:2.1rem;font-weight:900;line-height:1;margin:.2rem 0}
.label{font-size:.8rem;text-transform:uppercase;letter-spacing:.12em;color:var(--tf-tuna-300);font-weight:800}
.row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.field{display:grid;gap:7px;margin-bottom:12px}
.field label{font-size:.78rem;text-transform:uppercase;letter-spacing:.11em;color:var(--tf-tuna-300);font-weight:800}
.input,select,textarea{width:100%;border:1px solid var(--tf-border);border-radius:14px;background:rgba(3,16,27,.55);color:#fff;padding:12px 13px;outline:none}
textarea{min-height:90px;resize:vertical}
.input:focus,select:focus,textarea:focus{border-color:rgba(29,211,199,.7);box-shadow:0 0 0 3px rgba(29,211,199,.14)}
.btn{border:0;border-radius:14px;background:linear-gradient(135deg,var(--tf-aqua-500),#0ba5bd);color:#04202b;font-weight:900;padding:12px 15px;box-shadow:0 14px 26px rgba(29,211,199,.18)}
.btn.secondary{background:rgba(255,255,255,.09);color:#fff;border:1px solid var(--tf-border);box-shadow:none}
.btn.danger{background:linear-gradient(135deg,var(--tf-coral),#ffad6e);color:#281008}
.btn:disabled{opacity:.55;cursor:not-allowed}
.split{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.panel{display:none}.panel.active{display:block}
.list{display:grid;gap:9px;max-height:460px;overflow:auto}
.item{border:1px solid var(--tf-border);background:rgba(255,255,255,.055);border-radius:16px;padding:12px}
.item strong{display:block;margin-bottom:4px}
.badge{display:inline-flex;align-items:center;border:1px solid var(--tf-border);border-radius:999px;padding:4px 8px;font-size:.76rem;font-weight:800;color:var(--tf-tuna-200);background:rgba(255,255,255,.07)}
.badge.high,.badge.critical{color:#fff;background:rgba(255,122,89,.22);border-color:rgba(255,122,89,.4)}
.badge.medium{color:#fff;background:rgba(255,190,90,.18);border-color:rgba(255,190,90,.36)}
.code{white-space:pre-wrap;word-break:break-word;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.82rem;line-height:1.45;background:rgba(0,0,0,.25);border-radius:14px;padding:12px;border:1px solid var(--tf-border);max-height:360px;overflow:auto}
.toolbar{display:flex;gap:10px;align-items:center;justify-content:space-between;margin-bottom:13px}
.table{width:100%;border-collapse:separate;border-spacing:0 8px}
.table td,.table th{text-align:left;padding:10px 12px}
.table tr{background:rgba(255,255,255,.055)}
.table tr td:first-child,.table tr th:first-child{border-radius:14px 0 0 14px}
.table tr td:last-child,.table tr th:last-child{border-radius:0 14px 14px 0}
.table th{color:var(--tf-tuna-300);font-size:.75rem;text-transform:uppercase;letter-spacing:.1em}
.toast{position:fixed;right:24px;bottom:24px;max-width:420px;border:1px solid var(--tf-border);border-radius:18px;background:rgba(7,27,44,.95);box-shadow:var(--tf-shadow);padding:14px 16px;display:none}
.toast.show{display:block}
.wave{height:8px;border-radius:999px;background:linear-gradient(90deg,var(--tf-aqua-500),var(--tf-tuna-300),var(--tf-coral));opacity:.9;margin-top:18px}
/* provider cards */
.provider-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;margin:14px 0}
.provider-card{border:1px solid var(--tf-border);border-radius:18px;background:var(--tf-card);padding:16px}
.provider-card h4{margin:0;font-size:.95rem;font-weight:800}
/* toggle switch */
.switch{position:relative;display:inline-block;width:44px;height:24px;flex-shrink:0}
.switch input{opacity:0;width:0;height:0;position:absolute}
.slider{position:absolute;cursor:pointer;inset:0;background:rgba(255,255,255,.18);border-radius:999px;transition:.25s}
.slider:before{position:absolute;content:'';height:18px;width:18px;left:3px;bottom:3px;background:#fff;border-radius:50%;transition:.25s}
input:checked+.slider{background:var(--tf-aqua-500)}
input:checked+.slider:before{transform:translateX(20px)}
.switch-row{display:flex;align-items:center;gap:8px}
/* persona cards */
.persona-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px;margin:14px 0}
.persona-card{border:1px solid var(--tf-border);border-radius:18px;background:var(--tf-card);padding:16px;display:flex;flex-direction:column}
.persona-card.is-active{border-color:var(--tf-aqua-500);background:rgba(29,211,199,.07)}
@media (max-width:980px){.shell{grid-template-columns:1fr}.sidebar{position:relative;height:auto}.main{padding:22px}.card,.card.large{grid-column:1/-1}.split{grid-template-columns:1fr}.topbar{display:block}.status-pill{margin-top:16px}.provider-grid{grid-template-columns:1fr}.persona-grid{grid-template-columns:1fr}}
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
  <div class="sidebar-card"><b>Runtime</b><div class="muted" id="runtimeSummary">Loading...</div><div class="wave"></div></div>
</aside>
<main class="main">
  <div class="topbar">
    <div><div class="kicker">Tuna themed, Bootstrap-like, dependency-free</div><div class="title">Command every channel from one light GUI.</div><p class="subtitle">Choose a model, send channel events, inspect approvals, manage skills, review audit logs, and keep full command-line escape hatches for heavy local tasks.</p></div>
    <div class="status-pill"><span class="dot"></span><span id="statusText">Connecting</span></div>
  </div>

  <!-- Overview -->
  <section class="panel active" data-panel="overview"><div class="grid" id="overviewGrid"></div></section>

  <!-- Chat -->
  <section class="panel" data-panel="chat"><div class="grid"><div class="card large"><h2>Chat and channel command</h2><div class="split"><div class="field"><label>Model</label><select id="modelSelect"></select></div><div class="field"><label>Chain</label><select id="chainSelect"></select></div></div><div class="field"><label>Message</label><textarea id="chatText" placeholder="Ask TunaFlowAI to do something..."></textarea></div><div class="row"><button class="btn" id="sendChat">Send to TunaFlowAI</button><button class="btn secondary" id="refreshChatData">Refresh models</button></div></div><div class="card"><h2>Response</h2><div class="code" id="chatResult">No response yet.</div></div><div class="card full"><h2>Inject event</h2><div class="split"><div class="field"><label>Event type</label><input class="input" id="eventType" value="user.message" /></div><div class="field"><label>Priority</label><select id="eventPriority"><option>normal</option><option>high</option><option>low</option></select></div></div><div class="field"><label>Event text</label><textarea id="eventText" placeholder="Event text"></textarea></div><button class="btn secondary" id="postEvent">Post event</button></div></div></section>

  <!-- Models -->
  <section class="panel" data-panel="models">
    <div class="grid">
      <div class="card full">
        <div class="toolbar"><h2>Configure Model API Keys</h2><button class="btn secondary" id="refreshProviders">Refresh</button></div>
        <p class="muted" style="margin:0 0 4px;font-size:.85rem">Paste an API key and choose a model variant to activate a provider. Changes take effect immediately and persist across restarts.</p>
        <div id="providerCards"><div class="muted">Loading...</div></div>
      </div>
      <div class="card full">
        <div class="toolbar"><h2>Model catalog and health</h2><button class="btn secondary" id="refreshModels">Refresh</button></div>
        <div id="modelsView"></div>
      </div>
    </div>
  </section>

  <!-- Persona -->
  <section class="panel" data-panel="persona">
    <div class="grid">
      <div class="card full">
        <div class="toolbar"><h2>Personas</h2><button class="btn secondary" id="refreshPersonas">Refresh</button></div>
        <p class="muted" style="margin:0 0 4px;font-size:.85rem">Select a persona to define the agent role, skill defaults, risk posture, and autonomy level.</p>
        <div id="personaCards"><div class="muted">Loading...</div></div>
      </div>
      <div class="card large">
        <h2>Agent Identity &amp; Personality</h2>
        <div class="split">
          <div class="field"><label>Agent Name</label><input class="input" id="idName" placeholder="Tuna" /></div>
          <div class="field"><label>Display Name</label><input class="input" id="idDisplayName" placeholder="Tuna" /></div>
        </div>
        <div class="split">
          <div class="field"><label>Pronouns</label><input class="input" id="idPronouns" placeholder="they/them" /></div>
          <div class="field"><label>Language</label><input class="input" id="idLang" placeholder="English by default" /></div>
        </div>
        <div class="field"><label>Bio</label><textarea id="idBio" placeholder="Short description of this agent..."></textarea></div>
        <div class="field"><label>Personality Tone</label><input class="input" id="idTone" placeholder="calm, precise, proactive, safety-aware" /></div>
        <div class="field"><label>Traits (comma-separated)</label><input class="input" id="idTraits" placeholder="careful, helpful, transparent, token-efficient" /></div>
        <div class="row" style="margin-top:4px">
          <button class="btn" id="saveIdentityBtn">Save identity</button>
          <button class="btn secondary" id="resetIdentityBtn">Reset to defaults</button>
        </div>
      </div>
      <div class="card">
        <h2>Active Persona</h2>
        <div id="activePersonaInfo"><div class="muted">No active persona.</div></div>
      </div>
    </div>
  </section>

  <!-- Skills -->
  <section class="panel" data-panel="skills"><div class="grid"><div class="card full"><div class="toolbar"><h2>Skills and tools</h2><button class="btn secondary" id="refreshSkills">Refresh</button></div><div class="split"><div><h3>Bundled skills</h3><div class="list" id="skillsList"></div></div><div><h3>Registered tools</h3><div class="list" id="toolsList"></div></div></div></div></div></section>

  <!-- Approvals -->
  <section class="panel" data-panel="approvals"><div class="grid"><div class="card full"><div class="toolbar"><h2>Approvals</h2><button class="btn secondary" id="refreshApprovals">Refresh</button></div><div class="list" id="approvalsList"></div></div></div></section>

  <!-- Operations -->
  <section class="panel" data-panel="operations"><div class="grid"><div class="card"><h2>Tasks</h2><div class="list" id="tasksList"></div></div><div class="card"><h2>Channel</h2><div class="list" id="channelsList"></div></div><div class="card"><h2>Secrets</h2><div class="list" id="secretsList"></div></div><div class="card full"><h2>Runs</h2><div class="list" id="runsList"></div></div></div></section>

  <!-- Logs -->
  <section class="panel" data-panel="logs"><div class="grid"><div class="card large"><h2>Events</h2><div class="list" id="eventsList"></div></div><div class="card"><h2>Audit</h2><div class="list" id="auditList"></div></div></div></section>
</main>
</div>
<div class="toast" id="toast"></div>
<script>
(function(){
  var panels = ['overview','chat','models','persona','skills','approvals','operations','logs'];
  var labels = {overview:'Overview',chat:'Chat',models:'Models',persona:'Persona',skills:'Skills',approvals:'Approvals',operations:'Operations',logs:'Logs'};
  var injectedToken = ${JSON.stringify(escapedToken)};
  if (injectedToken) { localStorage.setItem('tunaflow.token', injectedToken); }
  var state = { token: localStorage.getItem('tunaflow.token') || '', catalog: null, models: null };

  var PROV = [
    {id:'openai',      label:'OpenAI',         keyEnv:'OPENAI_API_KEY',      models:['gpt-4.1','gpt-4.1-mini','gpt-4.1-nano','gpt-4o','gpt-4o-mini','o4-mini','o3-mini']},
    {id:'anthropic',   label:'Anthropic Claude',keyEnv:'ANTHROPIC_API_KEY',   models:['claude-opus-4-5','claude-sonnet-4-6','claude-haiku-4-5-20251001']},
    {id:'gemini',      label:'Google Gemini',   keyEnv:'GEMINI_API_KEY',       models:['gemini-2.5-pro','gemini-2.5-flash','gemini-2.0-flash','gemini-1.5-pro']},
    {id:'qwen',        label:'Alibaba Qwen',    keyEnv:'DASHSCOPE_API_KEY',    models:['qwen-max','qwen-plus','qwen-turbo','qwen3-235b-a22b']},
    {id:'deepseek',    label:'DeepSeek',        keyEnv:'DEEPSEEK_API_KEY',     models:['deepseek-chat','deepseek-reasoner']},
    {id:'kimi',        label:'Moonshot Kimi',   keyEnv:'MOONSHOT_API_KEY',     models:['kimi-k2-0711-preview','moonshot-v1-8k','moonshot-v1-32k']},
    {id:'minimax',     label:'MiniMax',         keyEnv:'MINIMAX_API_KEY',      models:['MiniMax-M2','MiniMax-Text-01']},
    {id:'groq',        label:'Groq',            keyEnv:'GROQ_API_KEY',         models:['llama-3.3-70b-versatile','llama-3.1-70b-versatile','mixtral-8x7b-32768']},
    {id:'openrouter',  label:'OpenRouter',      keyEnv:'OPENROUTER_API_KEY',   models:['meta-llama/llama-3.3-70b-instruct','google/gemini-2.5-flash','anthropic/claude-sonnet-4-5']},
    {id:'together',    label:'Together AI',     keyEnv:'TOGETHER_API_KEY',     models:['meta-llama/Llama-3.3-70B-Instruct-Turbo','mistralai/Mixtral-8x7B-Instruct-v0.1']},
    {id:'mistral',     label:'Mistral',         keyEnv:'MISTRAL_API_KEY',      models:['mistral-large-latest','mistral-small-latest','codestral-latest']},
    {id:'xai',         label:'xAI Grok',        keyEnv:'XAI_API_KEY',          models:['grok-3','grok-3-mini','grok-3-fast']},
    {id:'perplexity',  label:'Perplexity',      keyEnv:'PERPLEXITY_API_KEY',   models:['llama-3.1-sonar-large-128k-online','llama-3.1-sonar-small-128k-online']},
    {id:'ollama',      label:'Ollama (Local)',   keyEnv:null,                   models:['llama3.2','llama3.1','mistral','phi3','qwen2.5']},
    {id:'openai-codex',label:'OpenAI Codex',    oauth:true}
  ];

  function $(id){ return document.getElementById(id); }
  function esc(v){ return String(v==null?'':v).replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]);}); }
  function json(v){ try{return JSON.stringify(v,null,2);}catch(_e){return String(v);} }
  function toast(msg){ var el=$('toast'); el.textContent=msg; el.className='toast show'; setTimeout(function(){el.className='toast';},3600); }
  function headers(){ var h={'content-type':'application/json'}; if(state.token) h.authorization='Bearer '+state.token; return h; }
  async function api(path,opts){ var ctrl=new AbortController(); var t=setTimeout(function(){ctrl.abort();},8000); try{ var res=await fetch(path,Object.assign({headers:headers(),signal:ctrl.signal,credentials:'same-origin'},opts||{})); clearTimeout(t); var txt=await res.text(); var data; try{data=txt?JSON.parse(txt):null;}catch(_e){data=txt;} if(!res.ok) throw new Error((data&&data.error)||txt||('HTTP '+res.status)); return data; }catch(e){clearTimeout(t); throw e;} }
  function setPanel(name){ document.querySelectorAll('.panel').forEach(function(p){p.classList.toggle('active',p.dataset.panel===name);}); document.querySelectorAll('#nav button').forEach(function(b){b.classList.toggle('active',b.dataset.panel===name);}); localStorage.setItem('tunaflow.panel',name); }
  function initNav(){ $('nav').innerHTML=panels.map(function(n){return '<button data-panel="'+n+'">'+labels[n]+'</button>';}).join(''); document.querySelectorAll('#nav button').forEach(function(b){b.addEventListener('click',function(){setPanel(b.dataset.panel);});}); setPanel(localStorage.getItem('tunaflow.panel')||'overview'); }
  function renderList(id,rows,mapper){ var el=$(id); if(!el) return; var list=Array.isArray(rows)?rows:[]; if(!list.length){el.innerHTML='<div class="item muted">Nothing to show.</div>';return;} el.innerHTML=list.map(mapper).join(''); }

  function renderOverview(data){
    var ov=data.overview||{}; var approvals=data.approvals||[]; var skills=data.skills||[]; var tools=data.tools||[]; var models=(data.catalog&&data.catalog.configuredModels)||[];
    $('runtimeSummary').textContent='Skills '+skills.length+' / Tools '+tools.length+' / Models '+models.length;
    $('overviewGrid').innerHTML=[
      ['Pending approvals',approvals.length,'Approval-gated risky actions waiting for you.'],
      ['Configured models',models.length,'OpenAI, Codex OAuth, local, and compatible providers.'],
      ['Bundled skills',skills.length,'Role-based jobs and automation workflows.'],
      ['Registered tools',tools.length,'Safe local actions, dry-runs, and command hints.'],
      ['Active persona',(ov.activePersona&&(ov.activePersona.name||ov.activePersona.displayName))||'default','Persona-aware chain selection.'],
      ['Agent status',(ov.health&&ov.health.ok)?'ready':'error','Local gateway is reachable.']
    ].map(function(m){return '<div class="card"><div class="label">'+esc(m[0])+'</div><div class="metric">'+esc(m[1])+'</div><div class="muted">'+esc(m[2])+'</div></div>';}).join('');
  }

  function renderModel(catalog,health){
    state.catalog=catalog; state.models=health;
    var configured=catalog.configuredModels||catalog.models||[];
    var chains=catalog.chains||{};
    var hm={}; Object.keys(health||{}).forEach(function(n){hm[n]=health[n];});
    var rows=configured.map(function(m){
      var h=hm[m.name]||{};
      var st=h.failures>0?'degraded':(m.enabled===false?'disabled':'ready');
      var caps=Object.keys((m.capability&&m.capability.supports)||{}).filter(function(k){return m.capability.supports[k];}).join(', ');
      var isEnabled=m.enabled!==false;
      return '<tr><td><strong>'+esc(m.name)+'</strong><br><span class="muted">'+esc(m.provider)+'</span></td><td>'+esc(m.model||m.codexModel||'default')+'</td><td><span class="badge">'+esc(st)+'</span></td><td>'+esc(caps||'—')+'</td><td><button class="btn secondary" style="padding:6px 10px;font-size:.78rem" data-action="toggle-model" data-name="'+esc(m.name)+'" data-enabled="'+(isEnabled?'true':'false')+'">'+(isEnabled?'Disable':'Enable')+'</button></td></tr>';
    }).join('');
    $('modelsView').innerHTML='<h3>Configured models</h3><table class="table"><thead><tr><th>Name</th><th>Model</th><th>Status</th><th>Capabilities</th><th></th></tr></thead><tbody>'+rows+'</tbody></table><h3 style="margin-top:18px">Chains</h3><div class="list">'+Object.keys(chains).map(function(k){return '<div class="item"><strong>'+esc(k)+'</strong><span class="muted" style="margin-left:8px">'+esc(chains[k].join(' → '))+'</span></div>';}).join('')+'</div>';
    renderProviderCards(catalog);
    var mOpts=['<option value="">Use chain default</option>'].concat(configured.map(function(m){return '<option value="'+esc(m.name)+'">'+esc(m.name+' ('+(m.provider||'?')+')')+'</option>';}));
    $('modelSelect').innerHTML=mOpts.join('');
    var cOpts=Object.keys(chains).map(function(n){return '<option value="'+esc(n)+'">'+esc(n)+'</option>';});
    $('chainSelect').innerHTML=cOpts.join('');
  }

  function renderProviderCards(catalog){
    var configured=catalog.configuredModels||[];
    var byProv={};
    configured.forEach(function(m){ if(!byProv[m.provider]) byProv[m.provider]=m; });
    var html='<div class="provider-grid">';
    PROV.forEach(function(p){
      if(p.oauth){
        html+='<div class="provider-card"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px"><h4>'+esc(p.label)+'</h4><span class="badge">OAuth</span></div><div class="muted" style="font-size:.82rem">Uses ChatGPT OAuth via CODEX_BIN — no API key required.</div></div>';
        return;
      }
      var ex=byProv[p.id]||{};
      var configured=Boolean(ex.name);
      var uid='prov-'+p.id.replace(/[^a-z0-9]/gi,'-');
      var selModel=ex.model||(p.models&&p.models[0])||'';
      var opts=(p.models||[]).map(function(m){return '<option value="'+esc(m)+'"'+(m===selModel?' selected':'')+'>'+esc(m)+'</option>';}).join('');
      var isOn=!ex.name||ex.enabled!==false;
      html+='<div class="provider-card">';
      html+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px"><h4>'+esc(p.label)+'</h4>'+(configured?'<span class="badge" style="color:var(--tf-aqua-300);border-color:rgba(29,211,199,.45)">configured</span>':'<span class="badge" style="opacity:.5">not set</span>')+'</div>';
      html+='<div class="field"><label>Model variant</label><select id="'+uid+'-model">'+opts+'</select></div>';
      if(p.keyEnv){
        html+='<div class="field"><label>API Key ('+esc(p.keyEnv)+')</label><div style="display:flex;gap:6px"><input class="input" id="'+uid+'-key" type="password" placeholder="'+(configured?'Key saved — paste to update':'Paste API key here')+'" /><button class="btn secondary" style="padding:10px 13px;flex-shrink:0" data-action="toggle-key" data-keyid="'+uid+'-key" title="Show/hide key">&#128065;</button></div></div>';
      }
      html+='<div class="switch-row" style="justify-content:space-between;margin-top:6px">';
      html+='<div class="switch-row"><span class="muted" style="font-size:.82rem">Active</span><label class="switch"><input type="checkbox" id="'+uid+'-en"'+(isOn?' checked':'')+' /><span class="slider"></span></label></div>';
      html+='<button class="btn" style="padding:8px 18px" data-action="save-provider" data-provider="'+esc(p.id)+'" data-uid="'+esc(uid)+'">Save</button>';
      html+='</div></div>';
    });
    html+='</div>';
    $('providerCards').innerHTML=html;
  }

  async function saveProvider(providerId,uid){
    var modelEl=$(uid+'-model'), keyEl=$(uid+'-key'), enEl=$(uid+'-en');
    var model=modelEl?modelEl.value:'';
    var apiKey=keyEl?keyEl.value.trim():'';
    var enabled=enEl?enEl.checked:true;
    var body={provider:providerId,model:model,enabled:enabled};
    if(apiKey) body.apiKey=apiKey;
    try{
      await api('/models/configure',{method:'POST',body:JSON.stringify(body)});
      toast('Saved: '+providerId+(apiKey?' — API key updated':''));
      if(keyEl) keyEl.value='';
      await refreshCore();
    }catch(err){toast('Error: '+err.message);}
  }

  function renderPersonaCards(personas,activePersona){
    var el=$('personaCards'); if(!el) return;
    if(!personas||!personas.length){el.innerHTML='<div class="muted">No personas loaded.</div>';return;}
    var activeName=activePersona?(activePersona.name||activePersona.id):'';
    var html='<div class="persona-grid">';
    personas.forEach(function(p){
      var isActive=p.active||p.name===activeName||p.id===activeName;
      html+='<div class="persona-card'+(isActive?' is-active':'')+'">';
      html+='<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:6px">';
      html+='<div><strong style="font-weight:800">'+esc(p.name||p.id)+'</strong><div class="muted" style="font-size:.8rem;margin-top:2px">'+esc(p.title||p.role||'')+'</div></div>';
      if(isActive) html+='<span class="badge" style="color:var(--tf-aqua-300);border-color:rgba(29,211,199,.45);flex-shrink:0">active</span>';
      html+='</div>';
      if(p.description) html+='<p style="margin:0 0 8px;font-size:.82rem;color:var(--tf-tuna-200);flex:1">'+esc(p.description)+'</p>';
      if(p.riskPosture||p.autonomy) html+='<div class="muted" style="font-size:.75rem;margin-bottom:6px">'+esc(p.riskPosture||'—')+' · '+esc(p.autonomy||'—')+'</div>';
      if(p.defaultSkills&&p.defaultSkills.length) html+='<div class="muted" style="font-size:.75rem;margin-bottom:10px">Skills: '+esc(p.defaultSkills.slice(0,3).join(', '))+(p.defaultSkills.length>3?' …':'')+'</div>';
      html+='<button class="btn'+(isActive?' secondary':'')+'" style="padding:8px 14px;font-size:.85rem;margin-top:auto"'+(isActive?' disabled':'')+' data-action="switch-persona" data-name="'+esc(p.name||p.id)+'">'+(isActive?'Current':'Switch to this')+'</button>';
      html+='</div>';
    });
    html+='</div>';
    el.innerHTML=html;
  }

  function renderActivePersonaInfo(persona){
    var el=$('activePersonaInfo'); if(!el) return;
    if(!persona){el.innerHTML='<div class="muted">No active persona.</div>';return;}
    el.innerHTML='<strong style="font-size:1rem">'+esc(persona.name||persona.id)+'</strong><div class="muted" style="margin:4px 0 8px">'+esc(persona.title||persona.role||'')+'</div>'+(persona.description?'<div style="font-size:.84rem;margin-bottom:8px">'+esc(persona.description)+'</div>':'')+(persona.communicationStyle?'<div class="muted" style="font-size:.78rem">Style: '+esc(persona.communicationStyle)+'</div>':'');
  }

  function renderIdentityForm(identity){
    if(!identity) return;
    if($('idName')) $('idName').value=identity.agentName||identity.name||'';
    if($('idDisplayName')) $('idDisplayName').value=identity.displayName||'';
    if($('idPronouns')) $('idPronouns').value=identity.pronouns||'';
    if($('idBio')) $('idBio').value=identity.bio||'';
    if($('idTone')) $('idTone').value=(identity.personality&&identity.personality.tone)||'';
    if($('idTraits')) $('idTraits').value=(identity.personality&&identity.personality.traits&&identity.personality.traits.join(', '))||'';
    if($('idLang')) $('idLang').value=(identity.personality&&identity.personality.language)||'';
  }

  async function saveIdentity(){
    var body={
      agentName:$('idName').value.trim(),
      displayName:$('idDisplayName').value.trim(),
      pronouns:$('idPronouns').value.trim(),
      bio:$('idBio').value.trim(),
      personality:{
        tone:$('idTone').value.trim(),
        traits:$('idTraits').value.split(',').map(function(t){return t.trim();}).filter(Boolean),
        language:$('idLang').value.trim()
      }
    };
    try{await api('/identity',{method:'POST',body:JSON.stringify(body)});toast('Agent identity saved.');}
    catch(err){toast(err.message);}
  }

  async function resetIdentity(){
    if(!confirm('Reset agent identity to defaults?')) return;
    try{
      await api('/identity/reset',{method:'POST',body:'{}'});
      toast('Identity reset to defaults.');
      var identity=await api('/identity');
      renderIdentityForm(identity);
    }catch(err){toast(err.message);}
  }

  async function doSwitchPersona(name){
    try{
      await api('/personas/switch',{method:'POST',body:JSON.stringify({name:name})});
      toast('Switched to persona: '+name);
      await refreshCore();
    }catch(err){toast('Error: '+err.message);}
  }

  async function toggleModelEnabled(name,currentlyEnabled){
    try{
      await api('/models/'+encodeURIComponent(name)+'/toggle',{method:'POST',body:JSON.stringify({enabled:!currentlyEnabled})});
      toast((currentlyEnabled?'Disabled':'Enabled')+': '+name);
      await refreshCore();
    }catch(err){toast('Error: '+err.message);}
  }

  document.addEventListener('click',function(e){
    var btn=e.target.closest('[data-action]'); if(!btn) return;
    var action=btn.dataset.action;
    if(action==='toggle-key'){var el=document.getElementById(btn.dataset.keyid);if(el) el.type=el.type==='password'?'text':'password';}
    else if(action==='save-provider'){saveProvider(btn.dataset.provider,btn.dataset.uid);}
    else if(action==='switch-persona'){doSwitchPersona(btn.dataset.name);}
    else if(action==='toggle-model'){toggleModelEnabled(btn.dataset.name,btn.dataset.enabled==='true');}
  });

  async function refreshCore(){
    try{
      var results=await Promise.allSettled([api('/overview'),api('/approvals'),api('/skills'),api('/tools'),api('/models/catalog'),api('/models'),api('/tasks'),api('/channels'),api('/secrets'),api('/runs'),api('/events'),api('/audit'),api('/identity')]);
      var names=['overview','approvals','skills','tools','catalog','models','tasks','channels','secrets','runs','events','audit','identity'];
      var data={}; results.forEach(function(r,i){data[names[i]]=r.status==='fulfilled'?r.value:null;});
      $('statusText').textContent='Online';
      renderOverview(data);
      renderModel(data.catalog||{},data.models||{});
      var personas=(data.overview&&data.overview.personas)||[];
      var activePersona=(data.overview&&data.overview.activePersona)||null;
      renderPersonaCards(personas,activePersona);
      renderActivePersonaInfo(activePersona);
      if(data.identity) renderIdentityForm(data.identity);
      renderList('skillsList',(data.skills&&data.skills.skills)||data.skills||[],function(s){return '<div class="item"><strong>'+esc(s.name||s.id)+'</strong><div class="muted">'+esc(s.description||s.job||'')+'</div></div>';});
      renderList('toolsList',(data.tools&&data.tools.tools)||data.tools||[],function(t){return '<div class="item"><strong>'+esc(t.name)+'</strong><span class="badge '+esc(t.risk)+'">'+esc(t.risk)+'</span><div class="muted">'+esc(t.description||'')+'</div></div>';});
      renderList('approvalsList',(data.approvals&&data.approvals.pending)||data.approvals||[],function(a){return '<div class="item"><strong>'+esc(a.id||a.tool||'approval')+'</strong><span class="badge '+esc(a.risk||'medium')+'">'+esc(a.risk||'medium')+'</span><div class="code">'+esc(json(a))+'</div></div>';});
      renderList('tasksList',(data.tasks&&data.tasks.tasks)||data.tasks||[],function(t){return '<div class="item"><strong>'+esc(t.title||t.id||'task')+'</strong><div class="muted">'+esc(t.status||'')+'</div></div>';});
      renderList('channelsList',(data.channels&&data.channels.channels)||data.channels||[],function(c){return '<div class="item"><strong>'+esc(c.id||c.name||'channel')+'</strong><div class="muted">'+esc(c.type||c.kind||'')+'</div></div>';});
      renderList('secretsList',(data.secrets&&data.secrets.secrets)||data.secrets||[],function(s){return '<div class="item"><strong>'+esc(s.name||s.key||'secret')+'</strong><div class="muted">'+esc(s.status||'configured')+'</div></div>';});
      renderList('runsList',(data.runs&&data.runs.runs)||data.runs||[],function(r){return '<div class="item"><strong>'+esc(r.id||'run')+'</strong><div class="muted">'+esc(r.status||'')+'</div></div>';});
      renderList('eventsList',(data.events&&data.events.events)||data.events||[],function(e){return '<div class="item"><strong>'+esc(e.type||'event')+'</strong><div class="muted">'+esc(e.createdAt||e.timestamp||'')+'</div><div>'+esc(e.text||'')+'</div></div>';});
      renderList('auditList',(data.audit&&data.audit.entries)||data.audit||[],function(a){return '<div class="item"><strong>'+esc(a.type||a.action||'audit')+'</strong><div class="muted">'+esc(a.createdAt||a.timestamp||'')+'</div></div>';});
    }catch(err){$('statusText').textContent='Offline — '+err.message;}
  }

  async function sendChat(){ var text=$('chatText').value.trim(); if(!text){toast('Write a message first.');return;} var chain=$('chainSelect').value; var body={text:text,message:text}; if(chain) body.chain=chain; $('chatResult').textContent='Sending...'; try{var result=await api('/chat',{method:'POST',body:JSON.stringify(body)});var run=result.run||{};var out=[];if(run.status) out.push('Status: '+run.status);if(run.model&&run.model.model) out.push('Model: '+run.model.model);if(run.summary) out.push('\nSummary: '+run.summary);if(run.plan&&run.plan.length) out.push('\nPlan:\n'+run.plan.map(function(s,i){return '  '+(i+1)+'. '+s;}).join('\n'));if(run.error) out.push('\nError: '+run.error);if(!out.length) out.push(json(result));$('chatResult').textContent=out.join('\n');await refreshCore();}catch(err){$('chatResult').textContent=err.message;} }
  async function postEvent(){ var model=$('modelSelect').value; var body={type:$('eventType').value||'user.message',priority:$('eventPriority').value||'normal',text:$('eventText').value||'',payload:{source:'dashboard'}};if(model){body.payload.model=model;body.payload.chain=model;} try{var result=await api('/events',{method:'POST',body:JSON.stringify(body)});toast('Event posted: '+(result.id||'ok'));await refreshCore();}catch(err){toast(err.message);} }

  function init(){
    initNav();
    $('tokenInput').value=state.token;
    $('saveToken').onclick=function(){state.token=$('tokenInput').value.trim();localStorage.setItem('tunaflow.token',state.token);toast('Token saved locally.');refreshCore();};
    $('sendChat').onclick=sendChat;
    $('postEvent').onclick=postEvent;
    $('saveIdentityBtn').onclick=saveIdentity;
    $('resetIdentityBtn').onclick=resetIdentity;
    ['refreshModels','refreshSkills','refreshApprovals','refreshChatData','refreshProviders','refreshPersonas'].forEach(function(id){var el=$(id);if(el) el.onclick=refreshCore;});
    refreshCore();
    setInterval(refreshCore,30000);
  }
  init();
})();
</script>
</body>
</html>`;
}

export const dashboardHtml = renderDashboardHtml();
