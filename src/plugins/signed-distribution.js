import fs from 'node:fs/promises';
import crypto from 'node:crypto';

export async function createPluginManifest({ name, version, files = [], signer = 'local' }) {
  const entries = [];
  for (const file of files) entries.push({ path: file, sha256: sha256(await fs.readFile(file)) });
  return { schema: 'tunaflow.plugin.v1', name, version, signer, files: entries, createdAt: new Date().toISOString() };
}

export function signManifest(manifest, secret) {
  const payload = stableJson({ ...manifest, signature: undefined });
  return { ...manifest, signature: crypto.createHmac('sha256', secret).update(payload).digest('hex') };
}

export function verifyManifest(manifest, secret) {
  const expected = signManifest({ ...manifest, signature: undefined }, secret).signature;
  const actual = String(manifest.signature || '');
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

function sha256(buffer) { return crypto.createHash('sha256').update(buffer).digest('hex'); }
function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().filter((key) => value[key] !== undefined).map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
