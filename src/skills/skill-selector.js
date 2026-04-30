export class SkillSelector {
  constructor({ skillLoader, config = {}, auditLog = null } = {}) {
    this.skillLoader = skillLoader;
    this.config = {
      maxSkills: config.maxSkills || 3,
      maxSkillChars: config.maxSkillChars || 3500
    };
    this.auditLog = auditLog;
  }

  select({ event = {}, state = {}, persona = null } = {}) {
    const skills = this.skillLoader?.skills || [];
    const scored = skills.map((skill) => ({ skill, score: scoreSkill(skill, event, state, persona) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || trustBoost(b.skill) - trustBoost(a.skill) || a.skill.name.localeCompare(b.skill.name))
      .slice(0, this.config.maxSkills)
      .map((item) => ({ ...item.skill, score: item.score }));
    return scored;
  }

  buildPrompt(skills = []) {
    if (!skills.length) return 'No selected skills.';
    return skills.map((skill) => `Skill: ${skill.name}\nVersion: ${skill.version}\nTrust: ${skill.trust}\nRisk: ${skill.risk}\nExpected tools: ${(skill.tools || []).join(', ') || 'none'}\nHash: ${skill.hash}\nInstructions:\n${skill.content}`).join('\n\n---\n\n');
  }
}

function scoreSkill(skill, event, state, persona) {
  let score = 0;
  const haystack = [event.type, event.text, event.path, event.url, event.title, state.activeTask?.title, state.lastUserInstruction, persona?.role, persona?.title, persona?.description]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if ((persona?.defaultSkills || []).includes(skill.name) || (persona?.effectiveSkills || []).includes(skill.name)) score += 25;
  if ((persona?.acquiredSkills || []).includes(skill.name)) score += 30;

  for (const trigger of skill.triggers || []) {
    const normalized = String(trigger).toLowerCase();
    if (!normalized) continue;
    if (event.type === trigger) score += 10;
    if (haystack.includes(normalized)) score += 5;
    if (normalized.includes('*') && globish(normalized, event.type || '')) score += 8;
  }

  if (/error|failed|exception|traceback|cannot|not found/i.test(event.text || '') && /debug|terminal|error/i.test(`${skill.name} ${skill.description}`)) score += 8;
  if (/review|pull request|diff|pr/i.test(haystack) && /review/i.test(`${skill.name} ${skill.description}`)) score += 8;
  if (/daily|report|summary|standup/i.test(haystack) && /report/i.test(`${skill.name} ${skill.description}`)) score += 8;
  if (/customer|support|reply|email|client/i.test(haystack) && /support|draft/i.test(`${skill.name} ${skill.description}`)) score += 8;
  if (/browser|url|web|page|research/i.test(haystack) && /browser|research/i.test(`${skill.name} ${skill.description}`)) score += 8;
  if (/engineer|coding|developer|debug/i.test(`${persona?.role || ''} ${persona?.title || ''}`) && /debug|review|code/i.test(`${skill.name} ${skill.description}`)) score += 4;
  if (/support|customer/i.test(`${persona?.role || ''} ${persona?.title || ''}`) && /support|draft|customer/i.test(`${skill.name} ${skill.description}`)) score += 4;
  if (/research|analyst/i.test(`${persona?.role || ''} ${persona?.title || ''}`) && /research|browser|report/i.test(`${skill.name} ${skill.description}`)) score += 4;

  return score;
}

function globish(pattern, value) {
  const regex = new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`, 'i');
  return regex.test(value);
}

function trustBoost(skill) {
  return { bundled: 4, acquired: 3, workspace: 2, custom: 1, user: 1 }[skill.trust] || 0;
}
