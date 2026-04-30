import http from 'node:http';
import { limitNumber } from './utils.js';
import { renderDashboardHtml } from '../dashboard/dashboard.js';

export function createGateway({ runtime, eventStore, stateEngine, auditLog, modelRouter, toolRegistry, permissionEngine, personaManager = null, identityManager = null, skillLoader = null, channelRegistry = null, authManager = null, secretVault = null, policyEngine = null, taskManager = null, host = '127.0.0.1', port = 8787, config = {} }) {
  const serverConfig = config.server || {};
  const apiToken = serverConfig.apiToken || process.env[serverConfig.apiTokenEnv || 'TUNAFLOW_API_TOKEN'];
  const bodyLimitBytes = serverConfig.bodyLimitBytes || 1024 * 1024;
  const corsOrigin = serverConfig.corsOrigin || 'http://127.0.0.1:8787';

  const server = http.createServer(async (req, res) => {
    try {
      setCors(res, corsOrigin);
      if (req.method === 'OPTIONS') return sendJson(res, 204, {});
      const url = new URL(req.url, `http://${req.headers.host || `${host}:${port}`}`);

      if (req.method === 'GET' && url.pathname === '/login') return sendHtml(res, 200, renderLoginHtml(authManager?.status?.() || { enabled: false }));
      if (req.method === 'GET' && url.pathname === '/auth/status') return sendJson(res, 200, { ...(authManager?.status?.() || { enabled: false }), authenticated: isAuthorized(req, apiToken, authManager) });
      if (req.method === 'POST' && url.pathname === '/auth/login') {
        const body = await readBody(req, bodyLimitBytes);
        const result = await authManager.login(body.password, { ip: req.socket.remoteAddress });
        res.setHeader('set-cookie', authManager.cookieHeader(result.cookie, result.expiresAt));
        return sendJson(res, 200, { ok: true, expiresAt: result.expiresAt });
      }
      if (req.method === 'POST' && url.pathname === '/auth/logout') {
        if (authManager) res.setHeader('set-cookie', authManager.clearCookieHeader());
        return sendJson(res, 200, { ok: true });
      }

      const dashboardPath = url.pathname === '/' || url.pathname === '/dashboard' || url.pathname === '/dashboard/';
      if (req.method === 'GET' && dashboardPath) {
        if (authManager?.enabled?.() && !authManager.verifyCookie(req.headers.cookie || '') && !isBearerAuthorized(req, apiToken)) {
          return sendHtml(res, 200, renderLoginHtml(authManager.status()));
        }
        return sendHtml(res, 200, renderDashboardHtml());
      }

      if (apiToken || authManager?.enabled?.()) {
        if (!isPublicEndpoint(req.method, url.pathname) && !isAuthorized(req, apiToken, authManager)) return sendJson(res, 401, { error: 'Tidak terotorisasi' });
      }

      if (req.method === 'GET' && url.pathname === '/health') return sendJson(res, 200, { ok: true, name: 'TunaFlowAI', models: modelRouter.getHealth() });
      if (req.method === 'GET' && url.pathname === '/state') return sendJson(res, 200, stateEngine.getState());
      if (req.method === 'GET' && url.pathname === '/runs') return sendJson(res, 200, stateEngine.getRuns(limitNumber(url.searchParams.get('limit'), 50, { min: 1, max: 500 })));
      if (req.method === 'GET' && url.pathname === '/events') return sendJson(res, 200, await eventStore.recent(limitNumber(url.searchParams.get('limit'), 100, { min: 1, max: 500 })));
      if (req.method === 'GET' && url.pathname === '/audit') return sendJson(res, 200, await auditLog.recent(limitNumber(url.searchParams.get('limit'), 100, { min: 1, max: 500 })));
      if (req.method === 'GET' && url.pathname === '/audit/verify') return sendJson(res, 200, await auditLog.verify());
      if (req.method === 'GET' && url.pathname === '/models') return sendJson(res, 200, modelRouter.getHealth());
      if (req.method === 'GET' && url.pathname === '/models/catalog') return sendJson(res, 200, modelRouter.getCatalog());
      if (req.method === 'GET' && url.pathname === '/tools') return sendJson(res, 200, toolRegistry.list());
      if (req.method === 'GET' && url.pathname === '/policy') return sendJson(res, 200, policyEngine?.list?.() || null);
      if (req.method === 'GET' && url.pathname === '/secrets') return sendJson(res, 200, { status: secretVault?.status?.() || null, secrets: await secretVault?.list?.() || [] });
      if (req.method === 'POST' && url.pathname === '/secrets') { const body = await readBody(req, bodyLimitBytes); return sendJson(res, 200, await secretVault.set(body.name, body.value, { source: 'http-api' })); }
      if (req.method === 'DELETE' && url.pathname.startsWith('/secrets/')) { const name = decodeURIComponent(url.pathname.split('/').pop()); return sendJson(res, 200, await secretVault.delete(name, { source: 'http-api' })); }

      if (req.method === 'GET' && url.pathname === '/identity') return sendJson(res, 200, identityManager?.get?.() || null);
      if (req.method === 'POST' && url.pathname === '/identity') { const body = await readBody(req, bodyLimitBytes); return sendJson(res, 200, { ok: true, identity: await identityManager.update(body, { source: 'http-api' }) }); }
      if (req.method === 'POST' && url.pathname === '/identity/name') { const body = await readBody(req, bodyLimitBytes); return sendJson(res, 200, { ok: true, identity: await identityManager.setName(body.name || body.agentName, { source: 'http-api' }) }); }
      if (req.method === 'POST' && url.pathname === '/identity/personality') { const body = await readBody(req, bodyLimitBytes); return sendJson(res, 200, { ok: true, identity: await identityManager.setPersonality(body, { source: 'http-api' }) }); }
      if (req.method === 'POST' && url.pathname === '/identity/reset') return sendJson(res, 200, { ok: true, identity: await identityManager.reset({ source: 'http-api' }) });

      if (req.method === 'GET' && url.pathname === '/tasks') return sendJson(res, 200, taskManager?.list?.({ status: url.searchParams.get('status') || null, limit: limitNumber(url.searchParams.get('limit'), 100, { min: 1, max: 500 }) }) || []);
      if (req.method === 'GET' && url.pathname === '/tasks/active') return sendJson(res, 200, taskManager?.active?.() || null);
      if (req.method === 'POST' && url.pathname === '/tasks') { const body = await readBody(req, bodyLimitBytes); return sendJson(res, 200, { ok: true, task: await taskManager.create(body, { source: 'http-api' }) }); }
      const taskActivateMatch = url.pathname.match(/^\/tasks\/([^/]+)\/activate$/);
      if (req.method === 'POST' && taskActivateMatch) return sendJson(res, 200, { ok: true, task: await taskManager.activate(decodeURIComponent(taskActivateMatch[1]), { source: 'http-api' }) });
      const taskUpdateMatch = url.pathname.match(/^\/tasks\/([^/]+)$/);
      if (req.method === 'POST' && taskUpdateMatch) { const body = await readBody(req, bodyLimitBytes); return sendJson(res, 200, { ok: true, task: await taskManager.update(decodeURIComponent(taskUpdateMatch[1]), body, { source: 'http-api' }) }); }

      if (req.method === 'GET' && url.pathname === '/skills') return sendJson(res, 200, skillLoader?.list?.() || []);
      if (req.method === 'GET' && url.pathname === '/skills/acquired') return sendJson(res, 200, await skillLoader?.listAcquired?.() || []);
      if (req.method === 'GET' && url.pathname === '/skill-jobs') return sendJson(res, 200, skillJobs(skillLoader));
      if (req.method === 'POST' && (url.pathname === '/skills/acquire' || url.pathname === '/skills/install')) { const body = await readBody(req, bodyLimitBytes); const record = await skillLoader.acquire(body.source, { name: body.name }); return sendJson(res, 200, { ok: true, acquired: record, installed: record, skills: skillLoader.list() }); }
      if (req.method === 'POST' && url.pathname === '/skills/reload') return sendJson(res, 200, { ok: true, skills: await skillLoader.reload() });

      if (req.method === 'GET' && url.pathname === '/personas') return sendJson(res, 200, personaManager?.list?.() || []);
      if (req.method === 'GET' && (url.pathname === '/personas/active' || url.pathname === '/personas/current')) return sendJson(res, 200, personaManager?.getActive?.() || null);
      if (req.method === 'POST' && url.pathname === '/personas/switch') { const body = await readBody(req, bodyLimitBytes); const persona = await personaManager.activate(body.name || body.id, body || {}); return sendJson(res, 200, { ok: true, ...persona, persona }); }
      const personaActivateMatch = url.pathname.match(/^\/personas\/([^/]+)\/activate$/);
      if (req.method === 'POST' && personaActivateMatch) { const body = await readBody(req, bodyLimitBytes); const persona = await personaManager.activate(decodeURIComponent(personaActivateMatch[1]), body || {}); return sendJson(res, 200, { ok: true, ...persona, persona }); }
      const personaSkillMatch = url.pathname.match(/^\/personas\/([^/]+)\/skills\/(acquire|release)$/);
      if (req.method === 'POST' && personaSkillMatch) { const [, encodedPersonaId, action] = personaSkillMatch; const body = await readBody(req, bodyLimitBytes); const skillName = body.skillName || body.skill || body.name; if (!skillName) return sendJson(res, 400, { error: 'skillName is required' }); const personaId = decodeURIComponent(encodedPersonaId); const result = action === 'acquire' ? await personaManager.acquireSkill(skillName, { personaId, skillLoader, metadata: { ...body, source: 'http-api' } }) : await personaManager.releaseSkill(skillName, { personaId, metadata: { ...body, source: 'http-api' } }); return sendJson(res, 200, result); }

      if (req.method === 'GET' && url.pathname === '/channels') return sendJson(res, 200, channelRegistry?.list?.() || []);
      if (req.method === 'GET' && url.pathname === '/overview') return sendJson(res, 200, await overview({ modelRouter, stateEngine, eventStore, auditLog, toolRegistry, skillLoader, personaManager, identityManager, channelRegistry, permissionEngine, taskManager }));
      if (req.method === 'GET' && url.pathname === '/approvals') return sendJson(res, 200, await permissionEngine.listApprovals({ status: url.searchParams.get('status'), limit: limitNumber(url.searchParams.get('limit'), 100, { min: 1, max: 500 }) }));
      const approvalMatch = url.pathname.match(/^\/approvals\/([^/]+)\/(approve|reject)$/);
      if (req.method === 'POST' && approvalMatch) { const [, approvalId, action] = approvalMatch; const body = await readBody(req, bodyLimitBytes); const result = await runtime.resolveApproval(approvalId, action === 'approve' ? 'approved' : 'rejected', body || {}); return sendJson(res, 200, result); }

      if (req.method === 'POST' && url.pathname === '/events') { const body = await readBody(req, bodyLimitBytes); const result = await runtime.handleEvent(body); return sendJson(res, 200, result); }
      if (req.method === 'POST' && url.pathname === '/chat') { const body = await readBody(req, bodyLimitBytes); const result = await runtime.handleEvent({ type: 'user.message', text: body.text || body.message || '', payload: body }); return sendJson(res, 200, result); }

      const channelWebhookMatch = url.pathname.match(/^\/channels\/([^/]+)\/webhook$/);
      if (req.method === 'GET' && channelWebhookMatch) {
        const channelId = channelWebhookMatch[1];
        const channel = channelRegistry?.get?.(channelId);
        if (channel?.verifyGetWebhook) {
          const verified = channel.verifyGetWebhook({ query: Object.fromEntries(url.searchParams.entries()) });
          if (verified?.challenge !== undefined) return sendText(res, 200, String(verified.challenge));
          if (verified?.ok === false) return sendJson(res, 403, { error: verified.error || 'Webhook verification failed' });
        }
        return sendJson(res, 200, { ok: true, channel: channelId });
      }
      if (req.method === 'POST' && channelWebhookMatch) {
        const channelId = channelWebhookMatch[1];
        const channel = channelRegistry?.get?.(channelId);
        if (!channel) return sendJson(res, 404, { error: `Unknown channel: ${channelId}` });
        const rawBody = await readRawBody(req, bodyLimitBytes);
        if (channel.verifyWebhook) {
          const verified = channel.verifyWebhook({ headers: req.headers, rawBody });
          if (!verified.ok) return sendJson(res, 401, { error: verified.error || 'Invalid channel signature' });
          if (verified.response) return sendJson(res, 200, verified.response);
        }
        const body = parseJsonRaw(rawBody);
        const event = channel.normalizeInbound ? channel.normalizeInbound(body) : { type: 'channel.message', channel: channelId, payload: body };
        const result = await runtime.handleEvent(event);
        return sendJson(res, 200, result);
      }

      return sendJson(res, 404, { error: 'Tidak ditemukan' });
    } catch (error) {
      const status = /JSON|body|Event requires|Event body|exceeds limit|Unauthorized|Invalid/.test(error.message) ? 400 : 500;
      return sendJson(res, status, { error: error.message, stack: process.env.NODE_ENV === 'production' ? undefined : error.stack });
    }
  });

  return { server, async listen() { await new Promise((resolve) => server.listen(port, host, resolve)); return { host, port }; }, async close() { await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve()))); } };
}

function isPublicEndpoint(method, pathname) { return method === 'GET' && (pathname === '/health' || pathname === '/login' || pathname === '/auth/status' || pathname === '/' || pathname === '/dashboard' || pathname === '/dashboard/'); }
function isAuthorized(req, apiToken, authManager) { return isBearerAuthorized(req, apiToken) || Boolean(authManager?.verifyCookie?.(req.headers.cookie || '')); }
function isBearerAuthorized(req, token) { const auth = req.headers.authorization || ''; return Boolean(token && auth === `Bearer ${token}`); }
function setCors(res, origin) { res.setHeader('access-control-allow-origin', origin); res.setHeader('access-control-allow-methods', 'GET,POST,DELETE,OPTIONS'); res.setHeader('access-control-allow-headers', 'content-type,authorization,x-slack-signature,x-slack-request-timestamp,x-telegram-bot-api-secret-token,x-hub-signature-256,x-signature-ed25519,x-signature-timestamp,x-tunaflow-signature'); }
async function readRawBody(req, limitBytes) { const chunks = []; let size = 0; for await (const chunk of req) { size += chunk.length; if (size > limitBytes) throw new Error(`Request body exceeds limit of ${limitBytes} bytes`); chunks.push(chunk); } return Buffer.concat(chunks).toString('utf8'); }
async function readBody(req, limitBytes) { return parseJsonRaw(await readRawBody(req, limitBytes)); }
function parseJsonRaw(raw) { if (!raw) return {}; return JSON.parse(raw); }
function sendJson(res, status, body) { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' }); res.end(status === 204 ? '' : JSON.stringify(body, null, 2)); }
function sendText(res, status, text) { res.writeHead(status, { 'content-type': 'text/plain; charset=utf-8' }); res.end(text); }
function sendHtml(res, status, html) { res.writeHead(status, { 'content-type': 'text/html; charset=utf-8' }); res.end(html); }

async function overview({ modelRouter, stateEngine, eventStore, auditLog, toolRegistry, skillLoader, personaManager, identityManager, channelRegistry, permissionEngine, taskManager }) {
  const limit = 25;
  return { health: { ok: true, models: modelRouter.getHealth() }, identity: identityManager?.get?.() || null, state: stateEngine.getState(), activeTask: taskManager?.active?.() || null, tasks: taskManager?.list?.({ limit }) || [], runs: stateEngine.getRuns(limit), events: await eventStore.recent(limit), audit: await auditLog.recent(limit), auditVerification: await auditLog.verify(), models: modelRouter.getHealth(), modelCatalog: modelRouter.getCatalog(), tools: toolRegistry.list(), skills: skillLoader?.list?.() || [], acquiredSkills: await skillLoader?.listAcquired?.() || [], personas: personaManager?.list?.() || [], activePersona: personaManager?.getActive?.() || null, channels: channelRegistry?.list?.() || [], approvals: await permissionEngine.listApprovals({ status: 'pending', limit }) };
}
function skillJobs(skillLoader) { const skills = skillLoader?.list?.() || []; return skills.map((skill) => ({ skill: skill.name, job: skill.job || (skill.jobs || [])[0] || null, jobs: skill.jobs || [], risk: skill.risk, personas: skill.personas || [], tools: skill.tools || [], trust: skill.trust, description: skill.description, signature: skill.signature || null })); }
function renderLoginHtml(status) { if (!status.enabled) return '<!doctype html><html><body><p>Dashboard auth is disabled.</p><a href="/dashboard">Open dashboard</a></body></html>'; return `<!doctype html><html><head><meta charset="utf-8"><title>TunaFlowAI Login</title><style>body{font-family:system-ui;margin:40px;max-width:520px}input,button{font:inherit;padding:10px;margin:6px 0;width:100%}.card{border:1px solid #ddd;border-radius:12px;padding:24px}</style></head><body><div class="card"><h1>TunaFlowAI</h1><p>Dashboard authentication is enabled.</p><input id="password" type="password" placeholder="Dashboard password" autofocus><button onclick="login()">Login</button><pre id="out"></pre></div><script>async function login(){const r=await fetch('/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password:document.getElementById('password').value})}); if(r.ok) location.href='/dashboard'; else document.getElementById('out').textContent=await r.text();}</script></body></html>`; }
