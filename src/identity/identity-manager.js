import path from 'node:path';
import { ensureDir, now, readJson, trimToChars, writeJsonAtomic } from '../core/utils.js';

const DEFAULT_IDENTITY = {
  agentName: 'Tuna',
  name: 'Tuna',
  displayName: 'Tuna',
  pronouns: 'they/them',
  personality: {
    tone: 'calm, precise, proactive, safety-aware',
    traits: ['token-efficient', 'careful', 'helpful', 'transparent'],
    language: 'English by default; adapt to the user language when asked',
    boundaries: [
      'Never bypass approval policy',
      'Never expose secrets',
      'Never claim an action was completed without evidence',
      'Ask for approval before risky or irreversible actions'
    ]
  },
  bio: 'A local-first AI work operating agent that observes real work, keeps compact state, uses model fallback, and executes tools with approval gates.',
  createdAt: null,
  updatedAt: null
};

export class IdentityManager {
  constructor({ dataDir, config = {}, auditLog = null } = {}) {
    this.dataDir = path.resolve(dataDir || '.tunaflow');
    this.file = path.join(this.dataDir, 'identity.json');
    this.config = config || {};
    this.auditLog = auditLog;
    this.identity = null;
  }

  async init() {
    await ensureDir(this.dataDir);
    const configured = normalizeIdentity(this.config.defaults || this.config || {});
    const existing = await readJson(this.file, null);
    if (existing) {
      this.identity = normalizeIdentity(existing);
      return this.identity;
    }
    this.identity = normalizeIdentity({ ...DEFAULT_IDENTITY, ...configured, createdAt: now(), updatedAt: now() });
    await writeJsonAtomic(this.file, this.identity);
    if (this.auditLog) await this.auditLog.record('identity.created', publicIdentity(this.identity));
    return this.identity;
  }

  get() { return publicIdentity(this.identity || normalizeIdentity(DEFAULT_IDENTITY)); }
  public() { return this.get(); }
  getInternal() { return this.identity || normalizeIdentity(DEFAULT_IDENTITY); }
  internal() { return this.getInternal(); }

  promptBlock() {
    const identity = this.getInternal();
    const traits = asArray(identity.personality?.traits).join(', ') || 'helpful, careful';
    const boundaries = asArray(identity.personality?.boundaries).map((item) => `- ${item}`).join('\n') || '- Follow safety policy';
    return `Agent identity:\nName: ${identity.agentName || identity.name}\nDisplay name: ${identity.displayName}\nPronouns: ${identity.pronouns || 'not specified'}\nBio: ${identity.bio || ''}\nTone: ${identity.personality?.tone || 'calm and precise'}\nTraits: ${traits}\nLanguage: ${identity.personality?.language || 'follow the user'}\nIdentity boundaries:\n${boundaries}`;
  }

  async update(patch = {}, metadata = {}) {
    const normalizedPatch = normalizePatch(patch);
    const current = this.getInternal();
    const next = normalizeIdentity(mergeIdentity(current, normalizedPatch));
    next.updatedAt = now();
    this.identity = next;
    await writeJsonAtomic(this.file, next);
    if (this.auditLog) await this.auditLog.record('identity.updated', { identity: publicIdentity(next), metadata });
    return this.get();
  }

  async setName(agentName, metadata = {}) {
    if (!agentName || !String(agentName).trim()) throw new Error('Agent name cannot be empty');
    return this.update({ agentName: String(agentName).trim(), displayName: String(agentName).trim() }, metadata);
  }

  async setPersonality(input = {}, metadata = {}) {
    const patch = typeof input === 'string' ? { personality: { tone: input } } : { personality: { ...(this.getInternal().personality || {}), ...input } };
    return this.update(patch, metadata);
  }

  async reset(metadata = {}) {
    this.identity = normalizeIdentity({ ...DEFAULT_IDENTITY, createdAt: now(), updatedAt: now() });
    await writeJsonAtomic(this.file, this.identity);
    if (this.auditLog) await this.auditLog.record('identity.reset', { metadata });
    return this.get();
  }
}

function normalizePatch(patch = {}) {
  const out = { ...patch };
  if (out.name && !out.agentName) out.agentName = out.name;
  if (out.displayName && !out.agentName) out.agentName = out.displayName;
  if (typeof out.personality === 'string') out.personality = { tone: out.personality };
  if (out.voice) out.personality = { ...(out.personality || {}), tone: out.voice };
  if (out.language) out.personality = { ...(out.personality || {}), language: out.language };
  if (out.boundaries) out.personality = { ...(out.personality || {}), boundaries: out.boundaries };
  if (out.traits) out.personality = { ...(out.personality || {}), traits: out.traits };
  return out;
}

function mergeIdentity(current, patch) {
  return { ...current, ...patch, personality: { ...(current.personality || {}), ...(patch.personality || {}) } };
}

function normalizeIdentity(value = {}) {
  const normalizedInput = normalizePatch(value || {});
  const merged = mergeIdentity(DEFAULT_IDENTITY, normalizedInput);
  const agentName = trimToChars(String(merged.agentName || merged.name || DEFAULT_IDENTITY.agentName).trim(), 80);
  return {
    ...merged,
    agentName,
    name: agentName,
    displayName: trimToChars(String(merged.displayName || agentName || DEFAULT_IDENTITY.displayName).trim(), 80),
    pronouns: trimToChars(String(merged.pronouns || DEFAULT_IDENTITY.pronouns), 80),
    bio: trimToChars(String(merged.bio || DEFAULT_IDENTITY.bio), 1600),
    personality: {
      tone: trimToChars(String(merged.personality?.tone || DEFAULT_IDENTITY.personality.tone), 1200),
      traits: asArray(merged.personality?.traits || DEFAULT_IDENTITY.personality.traits),
      language: trimToChars(String(merged.personality?.language || DEFAULT_IDENTITY.personality.language), 160),
      boundaries: asArray(merged.personality?.boundaries || DEFAULT_IDENTITY.personality.boundaries)
    },
    createdAt: merged.createdAt || null,
    updatedAt: merged.updatedAt || null
  };
}

function publicIdentity(identity) { return JSON.parse(JSON.stringify(identity || DEFAULT_IDENTITY)); }
function asArray(value) { if (Array.isArray(value)) return value.map(String).filter(Boolean); if (value === undefined || value === null || value === '') return []; return String(value).split(',').map((item) => item.trim()).filter(Boolean); }
