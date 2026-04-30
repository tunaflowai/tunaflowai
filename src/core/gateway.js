import http from 'node:http';

export function createGateway({ runtime, eventStore, stateEngine, auditLog, modelRouter, toolRegistry, host = '127.0.0.1', port = 8787 }) {
  const server = http.createServer(async (req, res) => {
    try {
      setCors(res);
      if (req.method === 'OPTIONS') return sendJson(res, 204, {});

      const url = new URL(req.url, `http://${req.headers.host || `${host}:${port}`}`);

      if (req.method === 'GET' && url.pathname === '/health') {
        return sendJson(res, 200, { ok: true, name: 'TunaFlow', models: modelRouter.getHealth() });
      }

      if (req.method === 'GET' && url.pathname === '/state') {
        return sendJson(res, 200, stateEngine.getState());
      }

      if (req.method === 'GET' && url.pathname === '/events') {
        const limit = Number(url.searchParams.get('limit') || 100);
        return sendJson(res, 200, await eventStore.recent(limit));
      }

      if (req.method === 'GET' && url.pathname === '/audit') {
        const limit = Number(url.searchParams.get('limit') || 100);
        return sendJson(res, 200, await auditLog.recent(limit));
      }

      if (req.method === 'GET' && url.pathname === '/models') {
        return sendJson(res, 200, modelRouter.getHealth());
      }

      if (req.method === 'GET' && url.pathname === '/tools') {
        return sendJson(res, 200, toolRegistry.list());
      }

      if (req.method === 'POST' && url.pathname === '/events') {
        const body = await readBody(req);
        const result = await runtime.handleEvent(body);
        return sendJson(res, 200, result);
      }

      if (req.method === 'POST' && url.pathname === '/chat') {
        const body = await readBody(req);
        const result = await runtime.handleEvent({ type: 'user.message', text: body.text || body.message || '', payload: body });
        return sendJson(res, 200, result);
      }

      return sendJson(res, 404, { error: 'Not found' });
    } catch (error) {
      return sendJson(res, 500, { error: error.message, stack: process.env.NODE_ENV === 'production' ? undefined : error.stack });
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

function setCors(res) {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS');
  res.setHeader('access-control-allow-headers', 'content-type');
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  return JSON.parse(raw);
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(status === 204 ? '' : JSON.stringify(body, null, 2));
}
