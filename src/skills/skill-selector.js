export class SkillSelector {
  constructor({ skillLoader, config = {}, auditLog = null } = {}) {
    this.skillLoader = skillLoader;
    this.config = { maxSkills: config.maxSkills || 3, maxSkillChars: config.maxSkillChars || 3500 };
    this.auditLog = auditLog;
  }

  select({ event = {}, state = {}, persona = null } = {}) {
    const skills = this.skillLoader?.skills || [];
    const scored = skills
      .map((skill) => ({ skill, score: scoreSkill(skill, event, state, persona) }))
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
  const haystack = [
    event.type,
    event.text,
    event.path,
    event.url,
    event.title,
    event.subject,
    event.channel,
    event.payload && JSON.stringify(event.payload),
    state.activeTask?.title,
    state.lastUserInstruction,
    persona?.role,
    persona?.title,
    persona?.description
  ].filter(Boolean).join(' ').toLowerCase();

  const skillProfile = [
    skill.name,
    skill.description,
    (skill.jobs || []).join(' '),
    (skill.tags || []).join(' '),
    (skill.tools || []).join(' '),
    (skill.personas || []).join(' ')
  ].filter(Boolean).join(' ').toLowerCase();

  if ((persona?.defaultSkills || []).includes(skill.name) || (persona?.effectiveSkills || []).includes(skill.name)) score += 25;
  if ((persona?.acquiredSkills || []).includes(skill.name)) score += 30;

  for (const trigger of skill.triggers || []) {
    const normalized = String(trigger).toLowerCase();
    if (!normalized) continue;
    const genericUser = normalized === 'user.message' || normalized === 'channel.message';
    if (event.type === trigger) score += genericUser ? 1 : 10;
    if (!genericUser && haystack.includes(normalized)) score += 5;
    if (normalized.includes('*') && globish(normalized, event.type || '')) score += 8;
  }

  score += keywordScore(haystack, skillProfile, ['debug', 'terminal', 'error', 'exception', 'traceback', 'failed'], ['debug', 'terminal', 'code-reviewer'], 8);
  score += keywordScore(haystack, skillProfile, ['review', 'pull request', 'diff', 'pr'], ['review', 'code-reviewer'], 8);
  score += keywordScore(haystack, skillProfile, ['daily', 'report', 'summary', 'standup'], ['report', 'daily-reporter'], 8);
  score += keywordScore(haystack, skillProfile, ['customer', 'support', 'reply', 'email', 'client'], ['support', 'draft', 'customer'], 8);
  score += keywordScore(haystack, skillProfile, ['browser', 'url', 'web', 'page', 'research'], ['browser', 'research'], 8);
  score += keywordScore(haystack, skillProfile, ['seo', 'ads', 'ad ', 'ctr', 'campaign', 'keyword', 'marketing', 'google trends'], ['digital', 'marketer', 'seo', 'ad', 'keyword'], 12);
  score += keywordScore(haystack, skillProfile, ['cv', 'resume', 'candidate', 'pelamar', 'lamaran', 'interview', 'recruit', 'hrd', 'talent'], ['talent', 'resume', 'candidate', 'interview', 'hr'], 12);
  score += keywordScore(haystack, skillProfile, ['csv', 'excel', 'spreadsheet', 'anomaly', 'chart', 'graph', 'grafik', 'data analyst', 'laporan data'], ['data', 'analyst', 'csv', 'anomaly', 'chart'], 12);
  score += keywordScore(haystack, skillProfile, ['calendar', 'meeting', 'schedule', 'jadwal', 'conflict', 'ticket', 'travel'], ['secretary', 'assistant', 'calendar', 'meeting', 'ticket'], 12);
  score += keywordScore(haystack, skillProfile, ['project', 'sprint', 'scrum', 'jira', 'trello', 'deadline', 'overdue', 'standup'], ['project', 'scrum', 'sprint', 'overdue'], 12);
  score += keywordScore(haystack, skillProfile, ['translate', 'translator', 'terjemah', 'proofread', 'typo', 'markdown', 'copywriter', 'blog'], ['translator', 'copywriter', 'proofread', 'markdown'], 12);

  // Nudge by matching distinctive words from skill names/jobs without letting generic words dominate.
  for (const token of distinctiveTokens(skillProfile)) {
    if (haystack.includes(token)) score += 2;
  }

  if (/engineer|coding|developer|debug/i.test(`${persona?.role || ''} ${persona?.title || ''}`) && /debug|review|code/i.test(skillProfile)) score += 4;
  if (/support|customer/i.test(`${persona?.role || ''} ${persona?.title || ''}`) && /support|draft|customer/i.test(skillProfile)) score += 4;
  if (/research|analyst/i.test(`${persona?.role || ''} ${persona?.title || ''}`) && /research|browser|report|data|analyst/i.test(skillProfile)) score += 4;
  if (/manager|scrum|project/i.test(`${persona?.role || ''} ${persona?.title || ''}`) && /project|scrum|sprint/i.test(skillProfile)) score += 4;

  return score;
}

function keywordScore(haystack, profile, hayNeedles, profileNeedles, points) {
  const hayHit = hayNeedles.some((needle) => haystack.includes(needle));
  const profileHit = profileNeedles.some((needle) => profile.includes(needle));
  return hayHit && profileHit ? points : 0;
}

function distinctiveTokens(text) {
  const stop = new Set(['skill', 'tools', 'send', 'reply', 'user', 'message', 'manager', 'admin', 'data', 'work']);
  return [...new Set(String(text).split(/[^a-z0-9]+/).filter((token) => token.length >= 5 && !stop.has(token)))].slice(0, 18);
}

function globish(pattern, value) {
  const regex = new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`, 'i');
  return regex.test(value);
}

function trustBoost(skill) {
  return { bundled: 4, acquired: 3, workspace: 2, custom: 1, user: 1 }[skill.trust] || 0;
}
