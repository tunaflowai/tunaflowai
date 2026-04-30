import path from 'node:path';
import { createTunaFlowRuntime } from '../src/index.js';

const workspace = process.cwd();
const config = {
  runtime: {
    name: 'TunaFlowAI Demo',
    workspace,
    dataDir: path.join(workspace, '.tunaflow-demo'),
    proactive: true,
    verifyToolResults: true
  },
  server: { host: '127.0.0.1', port: 8787 },
  tokenBudget: { maxInputTokens: 8000, maxOutputTokens: 1000, maxModelCallsPerEvent: 3 },
  fallback: { timeoutMs: 1500, cooldownMs: 5000, maxFailuresBeforeCooldown: 1 },
  models: [
    { name: 'primary-model-demo', provider: 'mock', behavior: 'fail', enabled: true },
    { name: 'fallback-model-demo', provider: 'mock', behavior: 'ok', enabled: true }
  ],
  chains: {
    default: ['primary-model-demo', 'fallback-model-demo'],
    strong: ['primary-model-demo', 'fallback-model-demo'],
    cheap: ['fallback-model-demo']
  },
  permissions: { autoApproveMedium: false, autoApproveHigh: false, blockedTools: [] },
  tools: { commandAllowlist: ['node', 'npm', 'git'] }
};

const app = await createTunaFlowRuntime(config);

console.log('\n--- TunaFlowAI demo: model fallback chain ---\n');
const result = await app.runtime.handleEvent({
  type: 'terminal.output',
  priority: 'high',
  text: 'Error: cannot find variable plans in src/App.tsx at line 42'
});

console.log('\nRuntime result:\n');
console.log(JSON.stringify(result, null, 2));
console.log('\nModel health:\n');
console.log(JSON.stringify(app.modelRouter.getHealth(), null, 2));
console.log('\nAudit verification:\n');
console.log(JSON.stringify(await app.auditLog.verify(), null, 2));
console.log('\nAudit log saved in .tunaflow-demo/audit.jsonl\n');
