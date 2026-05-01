import fs from 'node:fs/promises';
import path from 'node:path';
import { createId, ensureDir, normalizeBool, now, readJson, writeJsonAtomic } from './utils.js';

export class PermissionEngine {
  constructor({ dataDir, config = {}, auditLog = null, policyEngine = null }) {
    this.dataDir = dataDir;
    this.approvalsDir = path.join(dataDir, 'approvals');
    this._decidingIds = new Set();
    this.config = {
      autoApproveMedium: normalizeBool(process.env.TUNAFLOW_AUTO_APPROVE_MEDIUM, config.autoApproveMedium || false),
      autoApproveHigh: normalizeBool(process.env.TUNAFLOW_AUTO_APPROVE_HIGH, config.autoApproveHigh || false),
      blockedTools: config.blockedTools || []
    };
    this.auditLog = auditLog;
    this.policyEngine = policyEngine;
  }

  async init() {
    await ensureDir(this.approvalsDir);
  }

  async evaluate({ tool, action, event, runId, persona = null, task = null }) {
    if (!tool) return { allowed: false, requiresApproval: false, reason: 'Unknown tool' };
    if (this.config.blockedTools.includes(tool.name)) {
      return { allowed: false, requiresApproval: false, reason: `Tool is blocked by policy: ${tool.name}` };
    }

    const policyDecision = this.policyEngine?.evaluateAction?.({ tool, action, event, persona, task });
    if (policyDecision?.decision === 'deny') {
      return { allowed: false, requiresApproval: false, reason: policyDecision.reason, policyRuleId: policyDecision.ruleId || null };
    }
    if (policyDecision?.decision === 'allow') {
      return { allowed: true, requiresApproval: false, reason: policyDecision.reason, policyRuleId: policyDecision.ruleId || null };
    }

    if (tool.risk === 'low') return { allowed: true, requiresApproval: false, reason: 'Low risk tool' };
    if (tool.risk === 'medium' && this.config.autoApproveMedium) return { allowed: true, requiresApproval: false, reason: 'Medium risk auto-approved by config' };
    if (tool.risk === 'high' && this.config.autoApproveHigh) return { allowed: true, requiresApproval: false, reason: 'High risk auto-approved by config' };
    if (tool.risk === 'critical') return { allowed: false, requiresApproval: false, reason: 'Critical risk tools are blocked by default' };

    const approval = await this.requestApproval({ tool, action, event, runId, reason: policyDecision?.reason || `${tool.risk} risk tool requires approval`, policy: policyDecision || null });
    return { allowed: false, requiresApproval: true, reason: approval.reason, approvalId: approval.id, approvalFile: approval.file, policyRuleId: policyDecision?.ruleId || null };
  }

  async requestApproval({ tool, action, event, runId, reason, policy = null }) {
    const approval = {
      id: createId('appr'),
      status: 'pending',
      runId,
      tool: tool.name,
      risk: tool.risk,
      reason,
      policy,
      action,
      sourceEventId: event?.id,
      createdAt: now(),
      decidedAt: null,
      decision: null
    };
    const file = this.approvalFile(approval.id);
    await writeJsonAtomic(file, approval);
    if (this.auditLog) await this.auditLog.record('approval.requested', { ...approval, file });
    return { ...approval, file };
  }

  approvalFile(id) {
    return path.join(this.approvalsDir, `${id}.json`);
  }

  async getApproval(id) {
    return readJson(this.approvalFile(id), null);
  }

  async listApprovals({ status = null, limit = 100 } = {}) {
    await ensureDir(this.approvalsDir);
    const entries = await fs.readdir(this.approvalsDir, { withFileTypes: true });
    const approvals = [];
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
      const approval = await readJson(path.join(this.approvalsDir, entry.name), null);
      if (!approval) continue;
      if (status && approval.status !== status) continue;
      approvals.push(approval);
    }
    approvals.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
    return approvals.slice(-limit);
  }

  async decide(id, decision, metadata = {}) {
    if (!['approved', 'rejected'].includes(decision)) throw new Error('Decision must be approved or rejected');
    if (this._decidingIds.has(id)) throw new Error(`Approval ${id} is already being decided`);
    this._decidingIds.add(id);
    try {
      return await this._doDecide(id, decision, metadata);
    } finally {
      this._decidingIds.delete(id);
    }
  }

  async _doDecide(id, decision, metadata = {}) {
    const approval = await this.getApproval(id);
    if (!approval) throw new Error(`Approval not found: ${id}`);
    if (approval.status !== 'pending') throw new Error(`Approval is already ${approval.status}`);

    const updated = {
      ...approval,
      status: decision,
      decision: {
        by: metadata.by || 'local-user',
        note: metadata.note || null
      },
      decidedAt: now()
    };
    await writeJsonAtomic(this.approvalFile(id), updated);
    if (this.auditLog) await this.auditLog.record(`approval.${decision}`, { id, tool: approval.tool, runId: approval.runId, metadata });
    return updated;
  }
}
