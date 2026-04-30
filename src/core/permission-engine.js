import path from 'node:path';
import { createId, ensureDir, normalizeBool, now, writeJsonAtomic } from './utils.js';

export class PermissionEngine {
  constructor({ dataDir, config = {}, auditLog = null }) {
    this.dataDir = dataDir;
    this.config = {
      autoApproveMedium: normalizeBool(process.env.TUNAFLOW_AUTO_APPROVE_MEDIUM, config.autoApproveMedium || false),
      autoApproveHigh: normalizeBool(process.env.TUNAFLOW_AUTO_APPROVE_HIGH, config.autoApproveHigh || false),
      blockedTools: config.blockedTools || []
    };
    this.auditLog = auditLog;
  }

  async init() {
    await ensureDir(path.join(this.dataDir, 'approvals'));
  }

  async evaluate({ tool, action, event, runId }) {
    if (!tool) return { allowed: false, requiresApproval: false, reason: 'Unknown tool' };
    if (this.config.blockedTools.includes(tool.name)) {
      return { allowed: false, requiresApproval: false, reason: `Tool is blocked by policy: ${tool.name}` };
    }

    if (tool.risk === 'low') return { allowed: true, requiresApproval: false, reason: 'Low risk tool' };
    if (tool.risk === 'medium' && this.config.autoApproveMedium) return { allowed: true, requiresApproval: false, reason: 'Medium risk auto-approved by config' };
    if (tool.risk === 'high' && this.config.autoApproveHigh) return { allowed: true, requiresApproval: false, reason: 'High risk auto-approved by config' };

    const approval = await this.requestApproval({ tool, action, event, runId, reason: `${tool.risk} risk tool requires approval` });
    return { allowed: false, requiresApproval: true, reason: approval.reason, approvalId: approval.id, approvalFile: approval.file };
  }

  async requestApproval({ tool, action, event, runId, reason }) {
    const approval = {
      id: createId('appr'),
      status: 'pending',
      runId,
      tool: tool.name,
      risk: tool.risk,
      reason,
      action,
      sourceEventId: event?.id,
      createdAt: now()
    };
    const file = path.join(this.dataDir, 'approvals', `${approval.id}.json`);
    await writeJsonAtomic(file, approval);
    if (this.auditLog) await this.auditLog.record('approval.requested', { ...approval, file });
    return { ...approval, file };
  }
}
