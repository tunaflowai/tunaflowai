import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderDashboardHtml } from '../src/dashboard/dashboard.js';

test('renders localhost dashboard shell', () => {
  const html = renderDashboardHtml();
  assert.ok(html.includes('Dasbor TunaFlowAI'));
  assert.ok(html.includes('Persona aktif'));
  assert.ok(html.includes('Skill dan tool'));
  assert.ok(html.includes('/overview'));
  assert.ok(html.includes('/chat'));
});
