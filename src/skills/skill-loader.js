import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureDir, pathExists, safeJoin, sha256, trimToChars, now, writeJsonAtomic, readJson } from '../core/utils.js';

export class SkillLoader {
  constructor({ workspace = process.cwd(), dataDir = null, config = {}, auditLog = null } = {}) {
    this.workspace = path.resolve(workspace);
    this.dataDir = path.resolve(dataDir || path.join(this.workspace, '.tunaflow'));
    this.config = {
      enabled: config.enabled !== false,
      maxSkills: config.maxSkills || 3,
      maxSkillChars: config.maxSkillChars || 3500,
      allowWorkspaceSkills: config.allowWorkspaceSkills === true,
      allowUserSkills: config.allowUserSkills === true,
      bundled: config.bundled !== false,
      paths: config.paths || [],
      acquired: config.acquired !== false,
      acquiredDir: resolveSkillPath(this.workspace, this.dataDir, config.acquiredDir)
    };
    this.auditLog = auditLog;
    this.skills = [];
  }

  async init() {
    this.skills = await this.loadAll();
    if (this.auditLog) await this.auditLog.record('skills.loaded', { count: this.skills.length, skills: this.skills.map((skill) => skill.name) });
    return this.skills;
  }

  async reload() {
    this.skills = await this.loadAll();
    if (this.auditLog) await this.auditLog.record('skills.reloaded', { count: this.skills.length });
    return this.list();
  }

  list() {
    return this.skills.map((skill) => publicSkill(skill));
  }

  get(name) {
    return this.skills.find((skill) => skill.name === name) || null;
  }

  async listAcquired() {
    const file = path.join(this.config.acquiredDir, 'acquired.json');
    return await readJson(file, []);
  }

  async acquire(source, options = {}) {
    if (!source || typeof source !== 'string') throw new Error('skills acquire requires a source path or loaded skill name');
    if (/^https?:\/\//i.test(source)) throw new Error('Remote skill acquisition is intentionally disabled in this dependency-free alpha. Download and review the skill locally, then acquire its path.');
    await ensureDir(this.config.acquiredDir);

    let raw = null;
    let originPath = null;
    let sourceSkill = this.get(source);
    if (sourceSkill?.path) {
      originPath = sourceSkill.path;
      raw = await fs.readFile(originPath, 'utf8');
    } else {
      const resolved = path.resolve(this.workspace, source);
      const stat = await fs.stat(resolved).catch(() => null);
      if (!stat) throw new Error(`Skill source not found: ${source}`);
      originPath = stat.isDirectory() ? path.join(resolved, 'SKILL.md') : resolved;
      raw = await fs.readFile(originPath, 'utf8');
      sourceSkill = null;
    }

    const parsed = parseSkill(raw);
    const name = sanitizeSkillName(options.name || parsed.meta.name || sourceSkill?.name || path.basename(path.dirname(originPath)));
    const targetDir = path.join(this.config.acquiredDir, name);
    await ensureDir(targetDir);
    const targetFile = path.join(targetDir, 'SKILL.md');
    await fs.writeFile(targetFile, raw, 'utf8');

    const registryFile = path.join(this.config.acquiredDir, 'acquired.json');
    const registry = await readJson(registryFile, []);
    const record = { name, source, originPath, targetFile, hash: sha256(raw), acquiredAt: now(), trust: 'acquired' };
    const next = registry.filter((item) => item.name !== name);
    next.push(record);
    await writeJsonAtomic(registryFile, next);
    await this.reload();
    if (this.auditLog) await this.auditLog.record('skills.acquired', record);
    return record;
  }

  async createSkeleton(name, options = {}) {
    const safeName = sanitizeSkillName(name);
    await ensureDir(this.config.acquiredDir);
    const targetDir = path.join(this.config.acquiredDir, safeName);
    await ensureDir(targetDir);
    const targetFile = path.join(targetDir, 'SKILL.md');
    const content = skillSkeleton(safeName, options);
    await fs.writeFile(targetFile, content, 'utf8');
    await this.acquire(targetFile, { name: safeName });
    return { name: safeName, path: targetFile };
  }

  async loadAll() {
    if (!this.config.enabled) return [];
    const dirs = [];
    if (this.config.bundled) dirs.push({ root: path.join(path.dirname(fileURLToPath(import.meta.url)), 'bundled'), trust: 'bundled' });
    if (this.config.acquired) dirs.push({ root: this.config.acquiredDir, trust: 'acquired' });
    if (this.config.allowWorkspaceSkills) dirs.push({ root: safeJoin(this.workspace, 'skills'), trust: 'workspace' });
    if (this.config.allowWorkspaceSkills) dirs.push({ root: safeJoin(this.workspace, '.tunaflow/skills'), trust: 'workspace' });
    if (this.config.allowUserSkills && process.env.HOME) dirs.push({ root: path.join(process.env.HOME, '.tunaflow/skills'), trust: 'user' });
    for (const customPath of this.config.paths) {
      dirs.push({ root: path.resolve(this.workspace, customPath), trust: 'custom' });
    }

    const skills = [];
    for (const dir of dirs) {
      if (!(await pathExists(dir.root))) continue;
      const loaded = await loadSkillDir(dir.root, dir.trust, this.config.maxSkillChars);
      skills.push(...loaded);
    }

    const unique = new Map();
    for (const skill of skills) {
      const existing = unique.get(skill.name);
      if (!existing || priority(skill.trust) > priority(existing.trust)) unique.set(skill.name, skill);
    }
    return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name));
  }
}

async function loadSkillDir(root, trust, maxSkillChars) {
  const skills = [];
  const entries = await fs.readdir(root, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    const maybeSkillFile = entry.isDirectory() ? path.join(root, entry.name, 'SKILL.md') : (entry.isFile() && entry.name.endsWith('.md') ? path.join(root, entry.name) : null);
    if (!maybeSkillFile) continue;
    const raw = await fs.readFile(maybeSkillFile, 'utf8').catch(() => null);
    if (!raw) continue;
    const parsed = parseSkill(raw);
    const name = parsed.meta.name || path.basename(path.dirname(maybeSkillFile));
    skills.push({
      ...parsed.meta,
      name,
      version: parsed.meta.version || '0.1.0',
      description: parsed.meta.description || firstLine(parsed.body),
      triggers: asArray(parsed.meta.triggers),
      tools: asArray(parsed.meta.tools),
      personas: asArray(parsed.meta.personas),
      tags: asArray(parsed.meta.tags),
      jobs: asArray(parsed.meta.jobs),
      job: parsed.meta.job || (asArray(parsed.meta.jobs)[0] || null),
      acquirable: parsed.meta.acquirable !== false,
      risk: parsed.meta.risk || 'low',
      trust,
      path: maybeSkillFile,
      hash: sha256(raw),
      content: trimToChars(parsed.body, Number(parsed.meta.maxContextChars || maxSkillChars || 3500))
    });
  }
  return skills;
}

export function parseSkill(raw) {
  if (!raw.startsWith('---')) return { meta: {}, body: raw.trim() };
  const end = raw.indexOf('\n---', 3);
  if (end === -1) return { meta: {}, body: raw.trim() };
  const yaml = raw.slice(3, end).trim();
  const body = raw.slice(end + 4).trim();
  return { meta: parseLooseYaml(yaml), body };
}

function parseLooseYaml(text) {
  const meta = {};
  let currentKey = null;
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trimEnd();
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const listMatch = line.match(/^\s*-\s+(.+)$/);
    if (listMatch && currentKey) {
      if (!Array.isArray(meta[currentKey])) meta[currentKey] = [];
      meta[currentKey].push(cleanScalar(listMatch[1]));
      continue;
    }
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;
    currentKey = match[1];
    const value = match[2];
    if (value === '') meta[currentKey] = [];
    else if (value.startsWith('[') && value.endsWith(']')) meta[currentKey] = value.slice(1, -1).split(',').map((item) => cleanScalar(item)).filter(Boolean);
    else meta[currentKey] = cleanScalar(value);
  }
  return meta;
}

function cleanScalar(value) {
  const trimmed = String(value).trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) return trimmed.slice(1, -1);
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  return trimmed;
}

function asArray(value) {
  if (Array.isArray(value)) return value.map(String);
  if (value === undefined || value === null || value === '') return [];
  return [String(value)];
}

function firstLine(text) {
  return text.split('\n').map((line) => line.trim()).find(Boolean) || '';
}

function resolveSkillPath(workspace, dataDir, configured) {
  if (!configured) return path.join(dataDir, 'skills', 'acquired');
  return path.isAbsolute(configured) ? configured : path.resolve(workspace, configured);
}

function priority(trust) {
  return { bundled: 1, user: 2, acquired: 3, custom: 4, workspace: 5 }[trust] || 0;
}

function sanitizeSkillName(name) {
  const cleaned = String(name || '').trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  if (!cleaned) throw new Error('Skill name cannot be empty');
  return cleaned;
}

function skillSkeleton(name, options = {}) {
  return `---
name: ${name}
version: 0.1.0
description: ${options.description || `Custom job skill for ${name}`}
triggers:
  - user.message
tools:
  - send_reply
risk: low
maxContextChars: 2500
---
# ${name}

Use this skill when the active persona or event indicates this job workflow is relevant.

Workflow:
1. Understand the current event and goal.
2. Use the smallest safe tool set.
3. Ask for approval before risky actions.
4. Verify the result.
5. Report a concise summary.
`;
}

function publicSkill(skill) {
  const { content, ...rest } = skill;
  return rest;
}
