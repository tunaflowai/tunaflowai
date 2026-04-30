import path from 'node:path';
import { readJson } from './core/utils.js';
import { EventStore } from './core/event-store.js';
import { AuditLog } from './core/audit-log.js';
import { StateEngine } from './core/state-engine.js';
import { ContextCompressor } from './core/context-compressor.js';
import { ModelRouter } from './core/model-router.js';
import { PermissionEngine } from './core/permission-engine.js';
import { ToolRegistry } from './core/tool-registry.js';
import { AgentRuntime } from './core/agent-runtime.js';
import { createGateway } from './core/gateway.js';

export async function loadConfig(configPath = process.env.TUNAFLOW_CONFIG || 'config/tunaflow.config.example.json') {
  const resolved = path.resolve(configPath);
  const config = await readJson(resolved, {});
  config.runtime = config.runtime || {};
  config.runtime.workspace = path.resolve(process.env.TUNAFLOW_WORKSPACE || config.runtime.workspace || '.');
  config.runtime.dataDir = path.resolve(config.runtime.workspace, config.runtime.dataDir || '.tunaflow');
  config.server = config.server || {};
  config.server.port = Number(process.env.TUNAFLOW_PORT || config.server.port || 8787);
  config.server.host = process.env.TUNAFLOW_HOST || config.server.host || '127.0.0.1';
  return config;
}

export async function createTunaFlowRuntime(config = null) {
  const effectiveConfig = config || await loadConfig();
  effectiveConfig.runtime ||= {};
  effectiveConfig.permissions ||= {};
  effectiveConfig.tools ||= {};

  const dataDir = effectiveConfig.runtime.dataDir;
  const workspace = effectiveConfig.runtime.workspace;

  const auditLog = new AuditLog({ dataDir });
  const eventStore = new EventStore({ dataDir });
  const stateEngine = new StateEngine({ dataDir });
  const contextCompressor = new ContextCompressor(effectiveConfig.context || {});
  const modelRouter = new ModelRouter(effectiveConfig, auditLog);
  const toolRegistry = new ToolRegistry({ workspace, auditLog, config: effectiveConfig.tools || {} });
  const permissionEngine = new PermissionEngine({ dataDir, config: effectiveConfig.permissions || {}, auditLog });

  const runtime = new AgentRuntime({
    eventStore,
    stateEngine,
    contextCompressor,
    modelRouter,
    toolRegistry,
    permissionEngine,
    auditLog,
    config: effectiveConfig
  });

  await runtime.init();

  return { runtime, eventStore, stateEngine, auditLog, modelRouter, toolRegistry, permissionEngine, config: effectiveConfig };
}

export async function startGateway(config = null) {
  const app = await createTunaFlowRuntime(config);
  const gateway = createGateway({
    ...app,
    host: app.config.server.host,
    port: app.config.server.port,
    config: app.config
  });
  await gateway.listen();
  return { ...app, gateway };
}
