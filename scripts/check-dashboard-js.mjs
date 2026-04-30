import vm from 'node:vm';
import { renderDashboardHtml } from '../src/dashboard/dashboard.js';
const html = renderDashboardHtml();
const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1];
if (!script) throw new Error('missing dashboard script');
const elements = new Map();
function el(id = '') {
  if (!elements.has(id)) elements.set(id, { id, value: '', textContent: '', innerHTML: '', className: '', dataset: { panel: id }, classList: { toggle() {} }, addEventListener() {}, onclick: null });
  return elements.get(id);
}
const sandbox = {
  console,
  setTimeout() { return 0; },
  setInterval() { return 0; },
  localStorage: { getItem() { return ''; }, setItem() {} },
  fetch: async (path) => ({ ok: true, text: async () => JSON.stringify(mock(path)) }),
  document: {
    getElementById: el,
    querySelectorAll(selector) {
      if (selector === '#nav button') return [el('navbtn')];
      if (selector === '.panel') return [el('panel')];
      return [];
    }
  }
};
function mock(path) {
  if (path === '/models/catalog') return { configuredModels: [{ name: 'local-mock-fallback', provider: 'mock', model: 'mock', capabilities: [] }], chains: { default: ['local-mock-fallback'] } };
  if (path === '/models') return { models: [{ name: 'local-mock-fallback', status: 'ready' }] };
  if (path === '/overview') return { overview: { status: 'ready' }, approvals: [], skills: [], tools: [], catalog: { configuredModels: [] } };
  return [];
}
vm.createContext(sandbox);
vm.runInContext(script, sandbox, { timeout: 1000 });
console.log('dashboard script ok');
