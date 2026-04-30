import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderDashboardHtml } from '../src/dashboard/dashboard.js';

test('renders localhost dashboard shell', () => {
  const html = renderDashboardHtml();
  assert.ok(html.includes('TunaFlowAI Dashboard'));
  assert.ok(html.includes('Persona Switcher'));
  assert.ok(html.includes('Job Skills'));
  assert.ok(html.includes('/personas/active'));
  assert.ok(html.includes('/skills/acquire'));
});
