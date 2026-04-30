import http from 'node:http';
import { limitNumber } from './utils.js';

export function createGateway({ runtime, eventStore, stateEngine, auditLog, modelRouter, toolRegistry, permissionEngine, skillLoader = null, channelRegistry = null, host = '127.0.0.1', port = 8787, config = {} }) {
  const serverConfig = config.server || {};
  const apiToken = serverConfig.apiToken || process.env[serverConfig.apiTokenEnv || 'TUNAFLOW_API_TOKEN'];
  const bodyLimitBytes = serverConfig.bodyLimitBytes || 1024 * 1024;
  const corsOrigin = serverConfig.corsOrigin || 'http://127.0.0.1:8787';

  const server = http.createServer(async (req, res) => {
    try {
      setCors(res, corsOrigin);
      if (req.method === 'OPTIONS') return sendJson(res, 204, {});
      const url = new URL(req.url, `http://${req.headers.host || `${host}:${port}`}`);

      if (apiToken && !isPublicEndpoint(req.method, url.pathname) && !isAuthorized(req, apiToken)) {
        return sendJson(res, 401, { error: 'Unauthorized' });
      }

      if (req.method === 'GET' && url.pathname === '/health') {
        return sendJson(res, 200, { ok: true, name: 'TunaFlowAI', models: modelRouter.getHealth() });
      }
      if (req.method === 'GET' && url.pathname === '/state') {
        return sendJson(res, 200, stateEngine.getState());
      }
      if (req.method === 'GET' && url.pathname === '/runs') {
        const limit = limitNumber(url.searchParams.get('limit'), 50, { min: 1, max: 500 });
        return sendJson(res, 200, stateEngine.getRuns(limit));
      }
      if (req.method === 'GET' && url.pathname === '/events') {
        const limit = limitNumber(url.searchParams.get('limit'), 100, { min: 1, max: 500 });
        return sendJson(res, 200, await eventStore.recent(limit));
      }
      if (req.method === 'GET' && url.pathname === '/audit') {
        const limit = limitNumber(url.searchParams.get('limit'), 100, { min: 1, max: 500 });
        return sendJson(res, 200, await auditLog.recent(limit));
      }
      if (req.method === 'GET' && url.pathname === '/audit/verify') {
        return sendJson(res, 200, await auditLog.verify());
      }
      if (req.method === 'GET' && url.pathname === '/models') {
        return sendJson(res, 200, modelRouter.getHealth());
      }
      if (req.method === 'GET' && url.pathname === '/models/catalog') {
        return sendJson(res, 200, modelRouter.getCatalog());
      }
      if (req.method === 'GET' && url.pathname === '/tools') {
        return sendJson(res, 200, toolRegistry.list());
      }
      if (req.method === 'GET' && url.pathname === '/skills') {
        return sendJson(res, 200, skillLoader?.list?.() || []);
      }
      if (req.method === 'GET' && url.pathname === '/channels') {
        return sendJson(res, 200, channelRegistry?.list?.() || []);
      }
      if (req.method === 'GET' && url.pathname === '/approvals') {
        const status = url.searchParams.get('status');
        const limit = limitNumber(url.searchParams.get('limit'), 100, { min: 1, max: 500 });
        return sendJson(res, 200, await permissionEngine.listApprovals({ status, limit }));
      }

      const approvalMatch = url.pathname.match(/^\/approvals\/([^/]+)\/(approve|reject)$/);
      if (req.method === 'POST' && approvalMatch) {
        const [, approvalId, action] = approvalMatch;
        const body = await readBody(req, bodyLimitBytes);
        const result = await runtime.resolveApproval(approvalId, action === 'approve' ? 'approved' : 'rejected', body || {});
        return sendJson(res, 200, result);
      }

      if (req.method === 'POST' && url.pathname === '/events') {
        const body = await readBody(req, bodyLimitBytes);
        const result = await runtime.handleEvent(body);
        return sendJson(res, 200, result);
      }
      if (req.method === 'POST' && url.pathname === '/chat') {
        const body = await readBody(req, bodyLimitBytes);
        const result = await runtime.handleEvent({ type: 'user.message', text: body.text || body.message || '', payload: body });
        return sendJson(res, 200, result);
      }

      const channelWebhookMatch = url.pathname.match(/^\/channels\/([^/]+)\/webhook$/);
      if (req.method === 'GET' && channelWebhookMatch) {
        const channelId = channelWebhookMatch[1];
        const channel = channelRegistry?.get?.(channelId);
        if (channelId.includes('whatsapp') && channel?.config?.verifyToken) {
          const token = url.searchParams.get('hub.verify_token');
          const challenge = url.searchParams.get('hub.challenge');
          const expected = channel.config.verifyToken || process.env[channel.config.verifyTokenEnv || 'WHATSAPP_VERIFY_TOKEN'];
          if (token === expected) return sendText(res, 200, challenge || '');
          return sendJson(res, 403, { error: 'Invalid verify token' });
        }
        return sendJson(res, 200, { ok: true, channel: channelId });
      }
      if (req.method === 'POST' && channelWebhookMatch) {
        const channelId = channelWebhookMatch[1];
        const channel = channelRegistry?.get?.(channelId);
        if (!channel) return sendJson(res, 404, { error: `Unknown channel: ${channelId}` });
        const body = await readBody(req, bodyLimitBytes);
        const event = channel.normalizeInbound ? channel.normalizeInbound(body) : { type: 'channel.message', channel: channelId, payload: body };
        const result = await runtime.handleEvent(event);
        return sendJson(res, 200, result);
      }

      return sendJson(res, 404, { error: 'Not found' });
    } catch (error) {
      const status = /JSON|body|Event requires|Event body|exceeds limit/.test(error.message) ? 400 : 500;
      return sendJson(res, status, { error: error.message, stack: process.env.NODE_ENV === 'production' ? undefined : error.stack });
    }
  });

  return {
    server,
    async listen() {
      await new Promise((resolve) => server.listen(port, host, resolve));
      return { host, port };
    },
    async close() {
      await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    }
  };
}

function isPublicEndpoint(method, pathname) {
  return method === 'GET' && pathname === '/health';
}

function isAuthorized(req, token) {
  const auth = req.headers.authorization || '';
  return auth === `Bearer ${token}`;
}

function setCors(res, origin) {
  res.setHeader('access-control-allow-origin', origin);
  res.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS');
  res.setHeader('access-control-allow-headers', 'content-type,authorization');
}

async function readBody(req, limitBytes) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limitBytes) throw new Error(`Request body exceeds limit of ${limitBytes} bytes`);
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  return JSON.parse(raw);
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(status === 204 ? '' : JSON.stringify(body, null, 2));
}

function sendText(res, status, text) {
  res.writeHead(status, { 'content-type': 'text/plain; charset=utf-8' });
  res.end(text);
}
