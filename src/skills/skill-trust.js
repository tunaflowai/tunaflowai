import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { ensureDir, now, readJson, sha256, writeJsonAtomic } from '../core/utils.js';

export class SkillTrustRegistry {
  constructor({ workspace = process.cwd(), dataDir = '.tunaflow', config = {}, auditLog = null } = {}) {
    this.workspace = path.resolve(workspace);
    this.dataDir = path.resolve(dataDir);
    this.config = config || {};
    this.auditLog = auditLog;
    this.file = path.join(this.dataDir, 'trusted-skills.json');
    this.state = { version: 1, trusted: {}, updatedAt: null };
    this.keyEnv = this.config.signingKeyEnv || 'TUNAFLOW_SKILL_SIGNING_KEY';
  }

  async init() {
    await ensureDir(this.dataDir);
    this.state = await readJson(this.file, null) || { version: 1, trusted: {}, updatedAt: now() };
    this.state.trusted ||= {};
    await this.save(false);
  }

  async save(audit = true) {
    this.state.updatedAt = now();
    await writeJsonAtomic(this.file, this.state);
    if (audit && this.auditLog) await this.auditLog.record('skill_trust.saved', { count: Object.keys(this.state.trusted).length });
  }

  list() {
    return Object.values(this.state.trusted || {}).sort((a, b) => a.name.localeCompare(b.name));
  }

  async signSkill(skillOrPath, metadata = {}) {
    const source = await resolveSkillSource(skillOrPath, this.workspace);
    const raw = await fs.readFile(source.path, 'utf8');
    const hash = sha256(raw);
    const signature = this.sign(hash);
    const record = {
      name: metadata.name || source.name,
      path: source.path,
      hash,
      signature,
      signedAt: now(),
      trustLevel: metadata.trustLevel || 'trusted-local',
      signer: metadata.signer || 'local-user'
    };
    this.state.trusted[record.name] = record;
    await this.save();
    if (this.auditLog) await this.auditLog.record('skill_trust.signed', { name: record.name, hash, trustLevel: record.trustLevel });
    return record;
  }

  async verifySkill(skillOrPath) {
    const source = await resolveSkillSource(skillOrPath, this.workspace);
    const raw = await fs.readFile(source.path, 'utf8');
    const hash = sha256(raw);
    const record = this.state.trusted[source.name] || Object.values(this.state.trusted).find((item) => item.hash === hash);
    if (!record) return { ok: false, name: source.name, hash, reason: 'Skill is not in trusted registry' };
    if (record.hash !== hash) return { ok: false, name: source.name, hash, expectedHash: record.hash, reason: 'Skill hash changed after signing' };
    if (record.signature && !this.verify(hash, record.signature)) return { ok: false, name: source.name, hash, reason: 'Skill signature is invalid for current signing key' };
    return { ok: true, name: source.name, hash, trustLevel: record.trustLevel, signedAt: record.signedAt };
  }

  async verifyLoadedSkills(skills = []) {
    const results = [];
    for (const skill of skills) {
      const record = this.state.trusted[skill.name] || Object.values(this.state.trusted).find((item) => item.hash === skill.hash);
      results.push({
        name: skill.name,
        hash: skill.hash,
        trust: skill.trust,
        trusted: Boolean(record && record.hash === skill.hash),
        trustLevel: record?.trustLevel || null,
        signedAt: record?.signedAt || null
      });
    }
    return results;
  }

  sign(hash) {
    const key = process.env[this.keyEnv] || this.config.signingKey || 'tunaflow-local-skill-signing-key';
    return crypto.createHmac('sha256', key).update(hash).digest('hex');
  }

  verify(hash, signature) {
    return timingSafeEqual(signature, this.sign(hash));
  }
}

async function resolveSkillSource(skillOrPath, workspace) {
  if (typeof skillOrPath === 'object' && skillOrPath?.path) return { name: skillOrPath.name || path.basename(path.dirname(skillOrPath.path)), path: skillOrPath.path };
  const raw = String(skillOrPath || '').trim();
  const resolved = path.isAbsolute(raw) ? raw : path.resolve(workspace, raw);
  const stat = await fs.stat(resolved).catch(() => null);
  if (!stat) throw new Error(`Skill not found: ${skillOrPath}`);
  const file = stat.isDirectory() ? path.join(resolved, 'SKILL.md') : resolved;
  return { name: path.basename(path.dirname(file)), path: file };
}

function timingSafeEqual(a, b) {
  const aa = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}
