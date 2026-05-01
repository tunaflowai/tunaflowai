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
import { SkillLoader } from './skills/skill-loader.js';
import { SkillSelector } from './skills/skill-selector.js';
import { SkillTrustRegistry } from './skills/skill-trust.js';
import { ChannelRegistry } from './channels/channel-registry.js';
import { OutboundRouter } from './channels/outbound-router.js';
import { PersonaManager } from './personas/persona-manager.js';
import { IdentityManager } from './identity/identity-manager.js';
import { AuthManager } from './auth/auth-manager.js';
import { SecretVault } from './secrets/secret-vault.js';
import { PolicyEngine } from './policies/policy-engine.js';
import { TaskManager } from './tasks/task-manager.js';
import { SandboxRunner } from './sandbox/sandbox-runner.js';
import { BrowserOperator } from './browser/browser-operator.js';

export async function loadConfig(configPath = process.env.TUNAFLOW_CONFIG || 'config/tunaflow.config.example.json') {
  const resolved = path.resolve(configPath);
  const config = await readJson(resolved, {});
  config.runtime = config.runtime || {};
  config.runtime.workspace = path.resolve(process.env.TUNAFLOW_WORKSPACE || config.runtime.workspace || '.');
  config.runtime.dataDir = path.resolve(config.runtime.workspace, config.runtime.dataDir || '.tunaflow');
  config.server = config.server || {};
  config.server.port = Number(process.env.TUNAFLOW_PORT || config.server.port || 8787);
  const codespacesHost = process.env.CODESPACES ? '0.0.0.0' : null;
  config.server.host = process.env.TUNAFLOW_HOST || codespacesHost || config.server.host || '127.0.0.1';
  config.skills = config.skills || {};
  config.personas = config.personas || {};
  config.identity = config.identity || {};
  config.auth = config.auth || config.dashboardAuth || {};
  config.secrets = config.secrets || {};
  config.policy = config.policy || {};
  config.tasks = config.tasks || config.taskBudget || {};
  config.sandbox = config.sandbox || {};
  config.browser = config.browser || {};
  config.channels = config.channels || {};
  config.audit = config.audit || {};
  return config;
}

export async function createTunaFlowRuntime(config = null) {
  const effectiveConfig = config || await loadConfig();
  effectiveConfig.runtime ||= {};
  effectiveConfig.permissions ||= {};
  effectiveConfig.tools ||= {};
  effectiveConfig.skills ||= {};
  effectiveConfig.personas ||= {};
  effectiveConfig.identity ||= {};
  effectiveConfig.auth ||= effectiveConfig.dashboardAuth || {};
  effectiveConfig.secrets ||= {};
  effectiveConfig.policy ||= {};
  effectiveConfig.tasks ||= effectiveConfig.taskBudget || {};
  effectiveConfig.sandbox ||= {};
  effectiveConfig.browser ||= {};
  effectiveConfig.channels ||= {};
  effectiveConfig.audit ||= {};

  const dataDir = effectiveConfig.runtime.dataDir;
  const workspace = effectiveConfig.runtime.workspace;

  const auditLog = new AuditLog({ dataDir, remote: effectiveConfig.audit.remote || effectiveConfig.remoteAudit || {} });
  await auditLog.init();

  const eventStore = new EventStore({ dataDir });
  const stateEngine = new StateEngine({ dataDir });
  const contextCompressor = new ContextCompressor(effectiveConfig.context || {});
  const modelRouter = new ModelRouter(effectiveConfig, auditLog);
  const identityManager = new IdentityManager({ dataDir, config: effectiveConfig.identity || {}, auditLog });
  await identityManager.init();
  const authManager = new AuthManager({ config: effectiveConfig.auth || {}, auditLog });
  const secretVault = new SecretVault({ dataDir, config: effectiveConfig.secrets || {}, auditLog });
  await secretVault.init();
  const policyEngine = new PolicyEngine({ workspace, config: effectiveConfig.policy || {}, auditLog });
  await policyEngine.init();
  const taskManager = new TaskManager({ dataDir, config: effectiveConfig.tasks || {}, auditLog });
  await taskManager.init();
  const sandboxRunner = new SandboxRunner({ workspace, config: { ...(effectiveConfig.sandbox || {}), ...(effectiveConfig.tools || {}) }, auditLog });
  const browserOperator = new BrowserOperator({ config: effectiveConfig.browser || {}, auditLog });
  const channelRegistry = new ChannelRegistry({ config: effectiveConfig.channels || {}, auditLog });
  const outboundRouter = new OutboundRouter({ channelRegistry, dataDir, auditLog });
  const toolRegistry = new ToolRegistry({ workspace, auditLog, config: effectiveConfig.tools || {}, sandboxRunner, browserOperator, secretVault });
  const permissionEngine = new PermissionEngine({ dataDir, config: effectiveConfig.permissions || {}, auditLog, policyEngine });
  const personaManager = new PersonaManager({ workspace, dataDir, config: effectiveConfig.personas || {}, auditLog });
  await personaManager.init();
  const skillTrustRegistry = new SkillTrustRegistry({ workspace, dataDir, config: effectiveConfig.skillTrust || {}, auditLog });
  await skillTrustRegistry.init();
  const skillLoader = new SkillLoader({ workspace, dataDir, config: effectiveConfig.skills || {}, auditLog });
  await skillLoader.init();
  const skillSelector = new SkillSelector({ skillLoader, config: effectiveConfig.skills || {}, auditLog });

  await channelRegistry.init();

  const runtime = new AgentRuntime({
    eventStore,
    stateEngine,
    contextCompressor,
    modelRouter,
    toolRegistry,
    permissionEngine,
    auditLog,
    skillSelector,
    personaManager,
    identityManager,
    taskManager,
    taskBudgetManager: taskManager,
    outboundRouter,
    sandboxRunner,
    browserOperator,
    secretsVault: secretVault,
    secretVault,
    policyEngine,
    config: effectiveConfig
  });

  await runtime.init();

  return {
    runtime,
    eventStore,
    stateEngine,
    auditLog,
    modelRouter,
    toolRegistry,
    permissionEngine,
    personaManager,
    identityManager,
    authManager,
    secretVault,
    secretsVault: secretVault,
    policyEngine,
    taskManager,
    taskBudgetManager: taskManager,
    sandboxRunner,
    browserOperator,
    skillLoader,
    skillSelector,
    skillTrustRegistry,
    channelRegistry,
    outboundRouter,
    config: effectiveConfig
  };
}

export async function startGateway(config = null) {
  const app = await createTunaFlowRuntime(config);
  const gateway = createGateway({
    ...app,
    host: app.config.server.host,
    port: app.config.server.port,
    config: app.config
  });
  const bound = await gateway.listen();
  app.config.server.port = bound.port;
  if (app.config.channels?.autoStart !== false) {
    await app.channelRegistry.startAll({ emit: (event) => app.runtime.handleEvent(event) });
  }
  return { ...app, gateway };
}
