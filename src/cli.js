#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { createTunaFlowRuntime, loadConfig, startGateway } from './index.js';
import { pathExists } from './core/utils.js';

const command = process.argv[2] || 'help';

try {
  if (command === 'dev' || command === 'start' || command === 'dashboard') {
    const { config } = await startGateway();
    console.log(`TunaFlowAI gateway running on http://${config.server.host}:${config.server.port}`);
    console.log(`Dashboard: http://${config.server.host}:${config.server.port}/dashboard`);
    console.log(`Workspace: ${config.runtime.workspace}`);
    console.log(`Data dir: ${config.runtime.dataDir}`);
  } else if (command === 'init') {
    await initProject();
  } else if (command === 'emit') {
    const type = process.argv[3] || 'user.message';
    const text = process.argv.slice(4).join(' ');
    const app = await createTunaFlowRuntime(await loadConfig());
    const result = await app.runtime.handleEvent({ type, text });
    console.log(JSON.stringify(result, null, 2));
  } else if (command === 'chat') {
    const text = process.argv.slice(3).join(' ');
    const app = await createTunaFlowRuntime(await loadConfig());
    const result = await app.runtime.handleEvent({ type: 'user.message', text });
    console.log(JSON.stringify(result, null, 2));
  } else if (command === 'status') {
    const app = await createTunaFlowRuntime(await loadConfig());
    console.log(JSON.stringify({ state: app.stateEngine.getState(), activePersona: app.personaManager.getActive(), models: app.modelRouter.getHealth(), skills: app.skillLoader.list(), channels: app.channelRegistry.list() }, null, 2));
  } else if (command === 'models' && process.argv[3] === 'catalog') {
    const app = await createTunaFlowRuntime(await loadConfig());
    console.log(JSON.stringify(app.modelRouter.getCatalog(), null, 2));
  } else if (command === 'skills') {
    const sub = process.argv[3] || 'list';
    const app = await createTunaFlowRuntime(await loadConfig());
    if (sub === 'list') console.log(JSON.stringify(app.skillLoader.list(), null, 2));
    else if (sub === 'jobs') console.log(JSON.stringify(app.personaManager.skillJobs({ skillLoader: app.skillLoader }), null, 2));
    else if (sub === 'acquired') console.log(JSON.stringify(await app.skillLoader.listAcquired(), null, 2));
    else if (sub === 'acquire') {
      const source = process.argv[4];
      if (!source) throw new Error('skills acquire requires a local path or loaded skill name');
      console.log(JSON.stringify(await app.skillLoader.acquire(source, { name: process.argv[5] }), null, 2));
    } else if (sub === 'create') {
      const name = process.argv[4];
      if (!name) throw new Error('skills create requires a name');
      console.log(JSON.stringify(await app.skillLoader.createSkeleton(name), null, 2));
    } else throw new Error(`Unknown skills subcommand: ${sub}`);
  } else if (command === 'personas') {
    const app = await createTunaFlowRuntime(await loadConfig());
    console.log(JSON.stringify(app.personaManager.list(), null, 2));
  } else if (command === 'persona') {
    const sub = process.argv[3] || 'active';
    const app = await createTunaFlowRuntime(await loadConfig());
    if (sub === 'active') console.log(JSON.stringify(app.personaManager.getActive(), null, 2));
    else if (sub === 'set' || sub === 'activate' || sub === 'switch') {
      const name = process.argv[4];
      if (!name) throw new Error('persona set requires a persona name');
      console.log(JSON.stringify(await app.personaManager.activate(name, { source: 'cli' }), null, 2));
    } else if (sub === 'acquire') {
      const skillName = process.argv[4];
      const personaName = process.argv[5] || app.personaManager.getActiveId();
      if (!skillName) throw new Error('persona acquire requires a skill name');
      console.log(JSON.stringify(await app.personaManager.acquireSkill(skillName, { personaId: personaName, skillLoader: app.skillLoader, metadata: { source: 'cli' } }), null, 2));
    } else if (sub === 'release') {
      const skillName = process.argv[4];
      const personaName = process.argv[5] || app.personaManager.getActiveId();
      if (!skillName) throw new Error('persona release requires a skill name');
      console.log(JSON.stringify(await app.personaManager.releaseSkill(skillName, { personaId: personaName, metadata: { source: 'cli' } }), null, 2));
    } else throw new Error(`Unknown persona subcommand: ${sub}`);
  } else if (command === 'channels') {
    const app = await createTunaFlowRuntime(await loadConfig());
    console.log(JSON.stringify(app.channelRegistry.list(), null, 2));
  } else if (command === 'approvals') {
    const status = process.argv[3] || null;
    const app = await createTunaFlowRuntime(await loadConfig());
    console.log(JSON.stringify(await app.permissionEngine.listApprovals({ status }), null, 2));
  } else if (command === 'approve' || command === 'reject') {
    const approvalId = process.argv[3];
    if (!approvalId) throw new Error(`${command} requires an approval id`);
    const note = process.argv.slice(4).join(' ');
    const app = await createTunaFlowRuntime(await loadConfig());
    const result = await app.runtime.resolveApproval(approvalId, command === 'approve' ? 'approved' : 'rejected', { note });
    console.log(JSON.stringify(result, null, 2));
  } else if (command === 'audit' && process.argv[3] === 'verify') {
    const app = await createTunaFlowRuntime(await loadConfig());
    console.log(JSON.stringify(await app.auditLog.verify(), null, 2));
  } else if (command === 'check' || command === 'doctor') {
    const app = await createTunaFlowRuntime(await loadConfig());
    console.log(JSON.stringify({
      ok: true,
      tools: app.toolRegistry.list().length,
      activePersona: app.personaManager.getActive()?.name || null,
      personas: app.personaManager.list().length,
      skills: app.skillLoader.list().length,
      channels: app.channelRegistry.list().length,
      models: app.modelRouter.getHealth(),
      audit: await app.auditLog.verify()
    }, null, 2));
  } else {
    printHelp();
  }
} catch (error) {
  console.error(`[TunaFlowAI] ${error.message}`);
  if (process.env.DEBUG) console.error(error.stack);
  process.exitCode = 1;
}

async function initProject() {
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
  return `${JSON.stringify({
    runtime: { name: 'TunaFlowAI', workspace: '.', dataDir: '.tunaflow', proactive: true, verifyToolResults: true },
    server: { host: '127.0.0.1', port: 8787, apiTokenEnv: 'TUNAFLOW_API_TOKEN' },
    models: [{ name: 'local-mock-fallback', provider: 'mock', behavior: 'ok', enabled: true }],
    chains: { default: ['local-mock-fallback'] }
  }, null, 2)}\n`;
}

function printHelp() {
  console.log(`TunaFlowAI commands:\n\n  tunaflow init                         Create config/tunaflow.config.json\n  tunaflow dev                          Start local gateway and localhost dashboard\n  tunaflow chat <text>                  Emit a user.message event\n  tunaflow emit <type> <text>           Emit one event into the runtime\n  tunaflow status                       Print state and model health\n  tunaflow models catalog               Print provider presets and configured model capabilities\n  tunaflow dashboard                    Start local gateway and print dashboard URL
  tunaflow personas                     List loaded personas
  tunaflow persona active               Print active persona
  tunaflow persona set <name>           Switch active persona
  tunaflow persona acquire <skill> [persona] Enable a skill for a persona
  tunaflow persona release <skill> [persona] Disable an acquired persona skill
  tunaflow skills [list]                List loaded job skills
  tunaflow skills jobs                  List skill jobs and persona mappings
  tunaflow skills acquired              List acquired skills
  tunaflow skills acquire <path|name>   Acquire a local job skill
  tunaflow skills create <name>         Create a starter job skill\n  tunaflow channels                     List configured channels\n  tunaflow approvals [pending|approved|rejected]\n  tunaflow approve <approval_id> [note] Execute an approved pending action\n  tunaflow reject <approval_id> [note]  Reject a pending action\n  tunaflow audit verify                 Verify tamper-evident audit chain\n  tunaflow check                        Validate config/runtime\n\nExamples:\n  node src/cli.js dev\n  node src/cli.js chat "Watch my workspace and keep model usage efficient"\n  node src/cli.js emit terminal.output "Error: cannot find variable plans"\n`);
}
