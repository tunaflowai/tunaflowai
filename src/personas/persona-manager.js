import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureDir, pathExists, safeJoin, sha256, trimToChars, readJson, writeJsonAtomic, now } from '../core/utils.js';
import { parseSkill } from '../skills/skill-loader.js';

export class PersonaManager {
  constructor({ workspace = process.cwd(), dataDir = '.tunaflow', config = {}, auditLog = null } = {}) {
    this.workspace = path.resolve(workspace);
    this.dataDir = path.resolve(dataDir || path.join(this.workspace, '.tunaflow'));
    this.auditLog = auditLog;
    this.stateFile = path.join(this.dataDir, 'persona-state.json');
    this.config = {
      enabled: config.enabled !== false,
      default: config.default || config.defaultPersona || config.active || 'operator',
      allowWorkspacePersonas: config.allowWorkspacePersonas === true,
      allowUserPersonas: config.allowUserPersonas === true,
      bundled: config.bundled !== false,
      paths: config.paths || [],
      maxPersonaChars: config.maxPersonaChars || 5000
    };
    this.personas = [];
    this.state = { active: this.config.default, history: [], acquiredSkills: {} };
  }

  async init() {
    await ensureDir(this.dataDir);
    this.personas = await this.loadAll();
    this.state = await readJson(this.stateFile, null) || { active: this.config.default, history: [], acquiredSkills: {} };
    this.state.acquiredSkills ||= {};
    this.state.history ||= [];
    if (!this.get(this.state.active)) {
      this.state.active = this.get(this.config.default)?.name || this.personas[0]?.name || null;
    }
    await this.saveState();
    if (this.auditLog) await this.auditLog.record('personas.loaded', { count: this.personas.length, active: this.state.active });
    return this.personas;
  }

  async saveState() {
    this.state.updatedAt = now();
    await writeJsonAtomic(this.stateFile, this.state);
  }

  list() {
    return this.personas.map((persona) => publicPersona(this.withAcquiredSkills(persona), persona.name === this.state.active));
  }

  get(name) {
    if (!name) return null;
    return this.personas.find((persona) => persona.name === name || persona.aliases?.includes?.(name)) || null;
  }

  getActive() {
    const persona = this.get(this.state.active) || this.personas[0] || null;
    return persona ? publicPersona(this.withAcquiredSkills(persona), true, { includePrompt: true }) : null;
  }

  getActiveInternal() {
    const persona = this.get(this.state.active) || this.personas[0] || null;
    return this.withAcquiredSkills(persona);
  }

  async activate(name, metadata = {}) {
    const persona = this.get(name);
    if (!persona) throw new Error(`Unknown persona: ${name}`);
    const previous = this.state.active || null;
    this.state.active = persona.name;
    this.state.history ||= [];
    this.state.history.push({ previous, active: persona.name, at: now(), metadata });
    this.state.history = this.state.history.slice(-100);
    await this.saveState();
    if (this.auditLog) await this.auditLog.record('persona.activated', { previous, active: persona.name, metadata });
    return this.getActive();
  }

  async switch(name, metadata = {}) {
    return this.activate(name, metadata);
  }

  async switchPersona(name, metadata = {}) {
    return this.activate(name, metadata);
  }

  async acquireSkill(skillName, { skillLoader = null, personaName = this.state.active, metadata = {} } = {}) {
    const persona = this.get(personaName);
    if (!persona) throw new Error(`Unknown persona: ${personaName}`);
    if (skillLoader?.get && !skillLoader.get(skillName)) throw new Error(`Unknown skill: ${skillName}`);
    this.state.acquiredSkills ||= {};
    const current = new Set(this.state.acquiredSkills[persona.name] || []);
    current.add(skillName);
    this.state.acquiredSkills[persona.name] = [...current].sort();
    this.state.history ||= [];
    this.state.history.push({ active: persona.name, acquiredSkill: skillName, at: now(), metadata });
    this.state.history = this.state.history.slice(-100);
    await this.saveState();
    if (this.auditLog) await this.auditLog.record('persona.skill_acquired', { persona: persona.name, skill: skillName, metadata });
    return publicPersona(this.withAcquiredSkills(persona), persona.name === this.state.active, { includePrompt: true });
  }

  async releaseSkill(skillName, { personaName = this.state.active, metadata = {} } = {}) {
    const persona = this.get(personaName);
    if (!persona) throw new Error(`Unknown persona: ${personaName}`);
    this.state.acquiredSkills ||= {};
    this.state.acquiredSkills[persona.name] = (this.state.acquiredSkills[persona.name] || []).filter((item) => item !== skillName);
    this.state.history ||= [];
    this.state.history.push({ active: persona.name, releasedSkill: skillName, at: now(), metadata });
    this.state.history = this.state.history.slice(-100);
    await this.saveState();
    if (this.auditLog) await this.auditLog.record('persona.skill_released', { persona: persona.name, skill: skillName, metadata });
    return publicPersona(this.withAcquiredSkills(persona), persona.name === this.state.active, { includePrompt: true });
  }

  withAcquiredSkills(persona) {
    if (!persona) return null;
    const acquiredSkills = this.state?.acquiredSkills?.[persona.name] || [];
    const defaultSkills = [...new Set([...(persona.defaultSkills || []), ...acquiredSkills])];
    return { ...persona, defaultSkills, acquiredSkills, effectiveSkills: defaultSkills };
  }

  async loadAll() {
    if (!this.config.enabled) return [];
    const dirs = [];
    if (this.config.bundled) dirs.push({ root: path.join(path.dirname(fileURLToPath(import.meta.url)), 'bundled'), trust: 'bundled' });
    if (this.config.allowWorkspacePersonas) dirs.push({ root: safeJoin(this.workspace, 'personas'), trust: 'workspace' });
    if (this.config.allowWorkspacePersonas) dirs.push({ root: safeJoin(this.workspace, '.tunaflow/personas'), trust: 'workspace' });
    if (this.config.allowUserPersonas && process.env.HOME) dirs.push({ root: path.join(process.env.HOME, '.tunaflow/personas'), trust: 'user' });
    for (const customPath of this.config.paths) dirs.push({ root: path.resolve(this.workspace, customPath), trust: 'custom' });

    const personas = [];
    for (const dir of dirs) {
      if (!(await pathExists(dir.root))) continue;
      personas.push(...await loadPersonaDir(dir.root, dir.trust, this.config.maxPersonaChars));
    }

    const unique = new Map();
    for (const persona of personas) {
      const existing = unique.get(persona.name);
      if (!existing || priority(persona.trust) > priority(existing.trust)) unique.set(persona.name, persona);
    }
    return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name));
  }
}

async function loadPersonaDir(root, trust, maxPersonaChars) {
  const personas = [];
  const entries = await fs.readdir(root, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    const maybePersonaFile = entry.isDirectory()
      ? path.join(root, entry.name, 'PERSONA.md')
      : (entry.isFile() && entry.name.endsWith('.md') ? path.join(root, entry.name) : null);
    if (!maybePersonaFile) continue;
    const raw = await fs.readFile(maybePersonaFile, 'utf8').catch(() => null);
    if (!raw) continue;
    const parsed = parseSkill(raw);
    const name = parsed.meta.name || path.basename(path.dirname(maybePersonaFile));
    personas.push(normalizePersona({ ...parsed.meta, name, trust, path: maybePersonaFile, hash: sha256(raw), systemPrompt: trimToChars(parsed.body, Number(parsed.meta.maxContextChars || maxPersonaChars || 5000)) }));
  }
  return personas;
}

function normalizePersona(raw) {
  return {
    name: String(raw.name),
    title: raw.title || raw.name,
    version: raw.version || '0.1.0',
    description: raw.description || firstLine(raw.systemPrompt || ''),
    role: raw.role || raw.title || raw.name,
    aliases: asArray(raw.aliases),
    defaultSkills: asArray(raw.defaultSkills),
    preferredChains: parseMapLike(raw.preferredChains),
    riskPosture: raw.riskPosture || 'balanced',
    autonomy: raw.autonomy || 'approval-first',
    communicationStyle: raw.communicationStyle || 'clear, concise, evidence-based',
    trust: raw.trust || 'custom',
    path: raw.path,
    hash: raw.hash,
    systemPrompt: raw.systemPrompt || ''
  };
}

function parseMapLike(value) {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value;
  if (Array.isArray(value)) {
    const map = {};
    for (const item of value) {
      const [key, val] = String(item).split('=').map((part) => part.trim());
      if (key && val) map[key] = val;
    }
    return map;
  }
  const map = {};
  for (const item of String(value).split(',')) {
    const [key, val] = item.split('=').map((part) => part.trim());
    if (key && val) map[key] = val;
  }
  return map;
}

function asArray(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (value === undefined || value === null || value === '') return [];
  return String(value).split(',').map((item) => item.trim()).filter(Boolean);
}

function firstLine(text) {
  return String(text).split('\n').map((line) => line.trim()).find(Boolean) || '';
}

function priority(trust) {
  return { bundled: 1, user: 2, custom: 3, workspace: 4 }[trust] || 0;
}

function publicPersona(persona, active = false, options = {}) {
  const { systemPrompt, ...rest } = persona;
  return {
    id: persona.name,
    ...rest,
    active,
    acquiredSkills: persona.acquiredSkills || [],
    effectiveSkills: persona.effectiveSkills || persona.defaultSkills || [],
    systemPrompt: options.includePrompt ? systemPrompt : undefined
  };
}
