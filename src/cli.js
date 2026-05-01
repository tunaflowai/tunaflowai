#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

await loadDotEnv();

const command = process.argv[2] || 'help';

async function loadDotEnv() {
  try {
    const content = await fs.readFile(path.resolve('.env'), 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      const value = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch (_) { /* no .env file — ignore */ }
}

async function runtime() {
  const { createTunaFlowRuntime, loadConfig } = await import('./index.js');
  return createTunaFlowRuntime(await loadConfig());
}

async function gateway() {
  const { startGateway } = await import('./index.js');
  return startGateway();
}

try {
  if (command === 'dev' || command === 'start' || command === 'dashboard') {
    const app = await gateway();
    const localUrl = displayUrl(app.config.server.host, app.config.server.port);
    const publicUrl = codespacesUrl(app.config.server.port);
    console.log(`TunaFlowAI gateway running on ${localUrl}`);
    console.log(`Dashboard: ${localUrl}/dashboard`);
    if (publicUrl) console.log(`Codespaces dashboard: ${publicUrl}/dashboard`);
    console.log(`Workspace: ${app.config.runtime.workspace}`);
    console.log(`Data dir: ${app.config.runtime.dataDir}`);
  } else if (command === 'init') {
    await initProject();
  } else if (command === 'token') {
    await handleToken();
  } else if (command === 'emit') {
    const type = process.argv[3] || 'user.message';
    const text = process.argv.slice(4).join(' ');
    const app = await runtime();
    console.log(JSON.stringify(await app.runtime.handleEvent({ type, text }), null, 2));
  } else if (command === 'chat') {
    const text = process.argv.slice(3).join(' ');
    const app = await runtime();
    console.log(JSON.stringify(await app.runtime.handleEvent({ type: 'user.message', text }), null, 2));
  } else if (command === 'status') {
    const app = await runtime();
    console.log(JSON.stringify({ identity: app.identityManager.public(), state: app.stateEngine.getState(), models: app.modelRouter.getHealth(), skills: app.skillLoader.list(), channels: app.channelRegistry.list(), personas: app.personaManager.list() }, null, 2));
  } else if (command === 'identity') {
    await handleIdentity();
  } else if (command === 'personas') {
    const app = await runtime();
    console.log(JSON.stringify(app.personaManager.list(), null, 2));
  } else if (command === 'persona') {
    await handlePersona();
  } else if (command === 'models' && process.argv[3] === 'catalog') {
    const app = await runtime();
    console.log(JSON.stringify(app.modelRouter.getCatalog(), null, 2));
  } else if (command === 'skills') {
    await handleSkills();
  } else if (command === 'channels') {
    const app = await runtime();
    console.log(JSON.stringify(app.channelRegistry.list(), null, 2));
  } else if (command === 'approvals') {
    const status = process.argv[3] || null;
    const app = await runtime();
    console.log(JSON.stringify(await app.permissionEngine.listApprovals({ status }), null, 2));
  } else if (command === 'approve' || command === 'reject') {
    const approvalId = process.argv[3];
    if (!approvalId) throw new Error(`${command} requires an approval id`);
    const note = process.argv.slice(4).join(' ');
    const app = await runtime();
    console.log(JSON.stringify(await app.runtime.resolveApproval(approvalId, command === 'approve' ? 'approved' : 'rejected', { note }), null, 2));
  } else if (command === 'audit' && process.argv[3] === 'verify') {
    const app = await runtime();
    console.log(JSON.stringify(await app.auditLog.verify(), null, 2));
  } else if (command === 'secrets') {
    await handleSecrets();
  } else if (command === 'policy') {
    const app = await runtime();
    console.log(JSON.stringify(app.policyEngine.list(), null, 2));
  } else if (command === 'tasks') {
    await handleTasks();
  } else if (command === 'check' || command === 'doctor') {
    const app = await runtime();
    console.log(JSON.stringify({ ok: true, identity: app.identityManager.public(), tools: app.toolRegistry.list().length, skills: app.skillLoader.list().length, channels: app.channelRegistry.list().length, personas: app.personaManager.list().length, models: app.modelRouter.getHealth(), audit: await app.auditLog.verify(), secrets: await app.secretsVault.list(), policy: app.policyEngine.list() }, null, 2));
  } else {
    printHelp();
  }
} catch (error) {
  console.error(`[TunaFlowAI] ${error.message}`);
  if (process.env.DEBUG) console.error(error.stack);
  process.exitCode = 1;
}

async function handleToken() {
  const sub = process.argv[3] || 'generate';
  if (sub !== 'generate') throw new Error('token commands: generate');

  const token = crypto.randomBytes(32).toString('hex');
  const envFile = path.resolve('.env');
  const envKey = 'TUNAFLOW_API_TOKEN';

  let content = '';
  try { content = await fs.readFile(envFile, 'utf8'); } catch (_e) { /* file does not exist yet */ }

  const line = `${envKey}=${token}`;
  const pattern = new RegExp(`^${envKey}=.*$`, 'm');
  if (pattern.test(content)) {
    content = content.replace(pattern, line);
  } else {
    content = content ? `${content.trimEnd()}\n${line}\n` : `${line}\n`;
  }

  await fs.writeFile(envFile, content, 'utf8');

  console.log(`\nToken generated and saved to .env\n`);
  console.log(`  ${envKey}=${token}`);
  console.log(`\nCopy the token above and paste it into the "Token Bearer"`);
  console.log(`field in the TunaFlowAI dashboard sidebar.\n`);
  console.log(`Restart the server for the token to take effect if it is already running.\n`);
}

async function handleIdentity() {
  const sub = process.argv[3] || 'show';
  const app = await runtime();
  if (sub === 'show') return console.log(JSON.stringify(app.identityManager.public(), null, 2));
  if (sub === 'reset') return console.log(JSON.stringify(await app.identityManager.reset({ source: 'cli' }), null, 2));
  if (sub === 'set') {
    const patch = parseKeyValues(process.argv.slice(4));
    return console.log(JSON.stringify(await app.identityManager.update(patch, { source: 'cli' }), null, 2));
  }
  throw new Error('identity commands: show | set key=value ... | reset');
}

async function handlePersona() {
  const sub = process.argv[3] || 'active';
  const app = await runtime();
  if (sub === 'active') return console.log(JSON.stringify(app.personaManager.getActive(), null, 2));
  if (sub === 'set' || sub === 'switch') return console.log(JSON.stringify(await app.personaManager.activate(process.argv[4], { source: 'cli' }), null, 2));
  if (sub === 'acquire') return console.log(JSON.stringify(await app.personaManager.acquireSkill(process.argv[4], { personaName: process.argv[5], skillLoader: app.skillLoader, metadata: { source: 'cli' } }), null, 2));
  if (sub === 'release') return console.log(JSON.stringify(await app.personaManager.releaseSkill(process.argv[4], { personaName: process.argv[5], metadata: { source: 'cli' } }), null, 2));
  throw new Error('persona commands: active | set <name> | acquire <skill> [persona] | release <skill> [persona]');
}

async function handleSkills() {
  const sub = process.argv[3] || 'list';
  const app = await runtime();
  if (sub === 'list') return console.log(JSON.stringify(app.skillLoader.list(), null, 2));
  if (sub === 'jobs') return console.log(JSON.stringify(app.skillLoader.list().map((skill) => ({ name: skill.name, jobs: skill.jobs || [], risk: skill.risk, tools: skill.tools || [], trust: skill.trust })), null, 2));
  if (sub === 'create') return console.log(JSON.stringify(await app.skillLoader.createSkeleton(process.argv[4]), null, 2));
  if (sub === 'acquire') return console.log(JSON.stringify(await app.skillLoader.acquire(process.argv[4], { name: process.argv[5] }), null, 2));
  if (sub === 'acquired') return console.log(JSON.stringify(await app.skillLoader.listAcquired(), null, 2));
  if (sub === 'trust') return console.log(JSON.stringify(app.skillTrustRegistry.list(), null, 2));
  if (sub === 'sign') return console.log(JSON.stringify(await app.skillTrustRegistry.signSkill(process.argv[4], { source: 'cli' }), null, 2));
  if (sub === 'verify') return console.log(JSON.stringify(process.argv[4] ? await app.skillTrustRegistry.verifySkill(process.argv[4]) : await app.skillTrustRegistry.verifyLoadedSkills(app.skillLoader.list()), null, 2));
  throw new Error('skills commands: list | jobs | create <name> | acquire <path/name> | acquired | trust | sign <path/name> | verify [path/name]');
}

async function handleSecrets() {
  const sub = process.argv[3] || 'list';
  const app = await runtime();
  if (sub === 'list') return console.log(JSON.stringify(await app.secretsVault.list(), null, 2));
  if (sub === 'set') return console.log(JSON.stringify(await app.secretsVault.set(process.argv[4], process.argv.slice(5).join(' '), { source: 'cli' }), null, 2));
  if (sub === 'get') return console.log(JSON.stringify(await app.secretsVault.get(process.argv[4]), null, 2));
  if (sub === 'delete') return console.log(JSON.stringify(await app.secretsVault.delete(process.argv[4]), null, 2));
  throw new Error('secrets commands: list | set <name> <value> | get <name> | delete <name>');
}

async function handleTasks() {
  const sub = process.argv[3] || 'list';
  const app = await runtime();
  if (sub === 'list') return console.log(JSON.stringify(app.stateEngine.getState().tasks || [], null, 2));
  if (sub === 'create') return console.log(JSON.stringify(await app.stateEngine.createTask({ title: process.argv.slice(4).join(' ') || 'Untitled task' }), null, 2));
  if (sub === 'budget') return console.log(JSON.stringify(await app.taskBudgetManager.setBudget(process.argv[4] || 'global', parseKeyValues(process.argv.slice(5), true)), null, 2));
  if (sub === 'budgets') return console.log(JSON.stringify(app.taskBudgetManager.list(), null, 2));
  throw new Error('tasks commands: list | create <title> | budget <taskId> key=value | budgets');
}

function parseKeyValues(args, numbers = false) {
  const patch = {};
  for (const arg of args) {
    const idx = arg.indexOf('=');
    if (idx === -1) continue;
    const key = arg.slice(0, idx);
    let value = arg.slice(idx + 1);
    if (numbers && /^-?\d+(\.\d+)?$/.test(value)) value = Number(value);
    if (key === 'boundaries' || key === 'traits') value = String(value).split(',').map((item) => item.trim()).filter(Boolean);
    patch[key] = value;
  }
  return patch;
}

async function initProject() {
  const { pathExists } = await import('./core/utils.js');
  const configDir = path.resolve('config');
  const target = path.join(configDir, 'tunaflow.config.json');
  if (await pathExists(target)) {
    console.log(`Config already exists: ${target}`);
    return;
  }
  await fs.mkdir(configDir, { recursive: true });
  const example = path.resolve('config/tunaflow.config.example.json');
  const content = await fs.readFile(example, 'utf8').catch(() => defaultConfig());
  await fs.writeFile(target, content, 'utf8');
  console.log(`Created ${target}`);
  console.log('Set TUNAFLOW_CONFIG=config/tunaflow.config.json to use it.');
}

function defaultConfig() {
  return `${JSON.stringify({ runtime: { name: 'TunaFlowAI', workspace: '.', dataDir: '.tunaflow', proactive: true, verifyToolResults: true }, identity: { name: 'Tuna' }, server: { host: '127.0.0.1', port: 8787, apiTokenEnv: 'TUNAFLOW_API_TOKEN' }, models: [{ name: 'local-mock-fallback', provider: 'mock', behavior: 'ok', enabled: true }], chains: { default: ['local-mock-fallback'] } }, null, 2)}\n`;
}

function displayUrl(host, port) {
  const shownHost = host === '0.0.0.0' || host === '::' ? '127.0.0.1' : host;
  return `http://${shownHost}:${port}`;
}

function codespacesUrl(port) {
  if (!process.env.CODESPACES || !process.env.CODESPACE_NAME || !process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN) return null;
  return `https://${process.env.CODESPACE_NAME}-${port}.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`;
}

function printHelp() {
  console.log(`TunaFlowAI commands:

 tunaflow token generate                    Generate API token and save to .env
 tunaflow init                              Create config/tunaflow.config.json
 tunaflow dev                               Start local gateway + dashboard
 tunaflow chat <text>                       Emit a user.message event
 tunaflow emit <type> <text>                Emit one event into the runtime
 tunaflow status                            Print state and runtime status
 tunaflow identity show                     Show assistant name/personality
 tunaflow identity set name=Tuna personality="calm analyst"
 tunaflow persona active|set|acquire|release
 tunaflow models catalog                    Print provider presets
 tunaflow skills list|jobs|create|acquire|acquired|trust|sign|verify
 tunaflow channels                          List configured channels
 tunaflow approvals [pending|approved|rejected]
 tunaflow approve <approval_id> [note]
 tunaflow reject <approval_id> [note]
 tunaflow secrets list|set|get|delete
 tunaflow policy                            Print policy-as-code config
 tunaflow tasks list|create|budget|budgets
 tunaflow audit verify                      Verify tamper-evident audit chain
 tunaflow check                             Validate config/runtime

Examples:
 node src/cli.js dev
 node src/cli.js identity set name=Anna personality="friendly, proactive, careful"
 node src/cli.js persona set financial-analyst
 node src/cli.js emit market.alert "BTC volume spike"
`);
}
