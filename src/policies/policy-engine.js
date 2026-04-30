import path from 'node:path';
import { pathExists, readJson } from '../core/utils.js';

export class PolicyEngine {
  constructor({ workspace = process.cwd(), config = {}, auditLog = null } = {}) {
    this.workspace = path.resolve(workspace);
    this.config = config || {};
    this.auditLog = auditLog;
    this.policy = defaultPolicy();
  }

  async init() {
    const file = this.config.file ? path.resolve(this.workspace, this.config.file) : null;
    if (file && await pathExists(file)) {
      this.policy = await readJson(file, defaultPolicy());
    } else if (this.config.rules || this.config.defaultAction) {
      this.policy = { ...defaultPolicy(), ...this.config };
    }
    return this.policy;
  }

  evaluate({ tool, action = {}, event = {}, persona = null, channel = null } = {}) {
    const ctx = { tool: tool?.name || action.tool, risk: tool?.risk || 'unknown', action, event, persona, channel };
    for (const rule of this.policy.rules || []) {
      if (!matches(rule.when || {}, ctx)) continue;
      return normalizeDecision(rule, ctx);
    }
    const riskAction = this.policy.riskDefaults?.[ctx.risk];
    if (riskAction) return normalizeDecision({ action: riskAction, reason: `Default policy for ${ctx.risk} risk` }, ctx);
    return normalizeDecision({ action: this.policy.defaultAction || 'require_approval', reason: 'Default policy action' }, ctx);
  }

  evaluateAction(input = {}) {
    const decision = this.evaluate(input);
    return {
      ...decision,
      decision: decision.allowed ? 'allow' : (decision.requiresApproval ? 'require_approval' : 'deny')
    };
  }

  list() {
    return this.policy;
  }
}

function defaultPolicy() {
  return {
    version: 1,
    defaultAction: 'require_approval',
    riskDefaults: {
      low: 'allow',
      medium: 'require_approval',
      high: 'require_approval',
      critical: 'deny'
    },
    rules: [
      { id: 'block-secret-access', when: { tool: ['read_file', 'browser_fetch'], argsContains: ['.env', 'id_rsa', 'vault.key', 'secrets.enc.json'] }, action: 'deny', reason: 'Secret-looking paths are blocked by default' },
      { id: 'block-dangerous-shell', when: { tool: 'run_command', argsContains: ['rm -rf', 'git push', 'npm publish', 'curl | sh', 'wget | sh'] }, action: 'deny', reason: 'Dangerous command pattern' },
      { id: 'approve-shell', when: { tool: 'run_command' }, action: 'require_approval', reason: 'Shell execution requires approval' },
      { id: 'approve-browser-mutation', when: { tool: ['browser_http_request', 'browser_submit_form'] }, action: 'require_approval', reason: 'Browser or HTTP mutation requires approval' }
    ]
  };
}

function normalizeDecision(rule, ctx) {
  const action = rule.action || 'require_approval';
  return {
    action,
    allowed: action === 'allow',
    requiresApproval: action === 'require_approval',
    reason: rule.reason || `Policy ${action}`,
    ruleId: rule.id || null,
    context: { tool: ctx.tool, risk: ctx.risk, eventType: ctx.event?.type, persona: ctx.persona?.name || null }
  };
}

function matches(when, ctx) {
  if (when.tool && !includes(when.tool, ctx.tool)) return false;
  if (when.risk && !includes(when.risk, ctx.risk)) return false;
  if (when.eventType && !includes(when.eventType, ctx.event?.type)) return false;
  if (when.persona && !includes(when.persona, ctx.persona?.name)) return false;
  if (when.channel && !includes(when.channel, ctx.event?.channel || ctx.channel)) return false;
  if (when.argsContains) {
    const args = ctx.action?.args || {};
    const commandLine = [args.command, ...(Array.isArray(args.args) ? args.args : [])].filter(Boolean).join(' ');
    const haystack = `${JSON.stringify(args)} ${commandLine}`.toLowerCase();
    if (!asArray(when.argsContains).some((needle) => haystack.includes(String(needle).toLowerCase()))) return false;
  }
  return true;
}

function includes(expected, actual) {
  return asArray(expected).includes(actual);
}

function asArray(value) {
  return Array.isArray(value) ? value : [value];
}
