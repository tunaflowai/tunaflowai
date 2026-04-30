import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderDashboardHtml } from '../src/dashboard/dashboard.js';

test('renders localhost dashboard shell', () => {
  const html = renderDashboardHtml();
  assert.ok(html.includes('TunaFlowAI Dashboard'));
  assert.ok(html.includes('Active persona'));
  assert.ok(html.includes('Skills and tools'));
  assert.ok(html.includes('/overview'));
  assert.ok(html.includes('/chat'));
});
