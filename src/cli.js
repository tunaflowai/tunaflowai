#!/usr/bin/env node
import { createTunaFlowRuntime, loadConfig, startGateway } from './index.js';

const command = process.argv[2] || 'help';

try {
  if (command === 'dev' || command === 'start') {
    const { config } = await startGateway();
    console.log(`TunaFlow gateway running on http://${config.server.host}:${config.server.port}`);
    console.log(`Workspace: ${config.runtime.workspace}`);
    console.log(`Data dir: ${config.runtime.dataDir}`);
  } else if (command === 'emit') {
    const type = process.argv[3] || 'user.message';
    const text = process.argv.slice(4).join(' ');
    const app = await createTunaFlowRuntime(await loadConfig());
    const result = await app.runtime.handleEvent({ type, text });
    console.log(JSON.stringify(result, null, 2));
  } else if (command === 'status') {
    const app = await createTunaFlowRuntime(await loadConfig());
    console.log(JSON.stringify({ state: app.stateEngine.getState(), models: app.modelRouter.getHealth() }, null, 2));
  } else if (command === 'check') {
    const app = await createTunaFlowRuntime(await loadConfig());
    console.log(JSON.stringify({ ok: true, tools: app.toolRegistry.list().length, models: app.modelRouter.getHealth() }, null, 2));
  } else {
    printHelp();
  }
} catch (error) {
  console.error(`[TunaFlow] ${error.message}`);
  if (process.env.DEBUG) console.error(error.stack);
  process.exitCode = 1;
}

function printHelp() {
  console.log(`TunaFlow commands:\n\n  tunaflow dev                  Start local gateway\n  tunaflow emit <type> <text>   Emit one event into the runtime\n  tunaflow status               Print state and model health\n  tunaflow check                Validate config/runtime\n\nExamples:\n  node src/cli.js dev\n  node src/cli.js emit user.message "Pantau pekerjaan saya"\n  node src/cli.js emit terminal.output "Error: cannot find variable plans"\n`);
}
