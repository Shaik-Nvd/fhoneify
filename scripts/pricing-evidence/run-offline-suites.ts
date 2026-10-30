/** Portable regression runner. Deliberately cannot reach the production DB.
 * Excludes the real DB-writing integration test and browser-dependent suite. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(__dirname, '../..');
const logDir = path.resolve(root, process.argv.find(a => a.startsWith('--logs='))?.slice(7) ?? 'release-test-logs/offline');
fs.mkdirSync(logDir, { recursive: true });
const skipped = new Set(['pricing.quote-integration.test.ts', 'pricing.agent-z-browser.test.ts']);
const files = fs.readdirSync(path.join(root, 'scripts/test')).filter(n => /^(pricing\..*\.test|referencePricing\..*\.test|test_iphone.*)\.ts$/.test(n) && !skipped.has(n)).sort();
const results: { file: string; code: number; durationMs: number }[] = [];
for (const file of files) {
  const started = Date.now();
  const r = spawnSync(process.execPath, ['--import', 'tsx', path.join('scripts/test', file)], {
    cwd: root, encoding: 'utf8', timeout: 180000, maxBuffer: 16 * 1024 * 1024,
    env: { ...process.env, DATABASE_URL: 'postgresql://nobody:x@127.0.0.1:1/none', DIRECT_URL: 'postgresql://nobody:x@127.0.0.1:1/none',
      SUPABASE_URL: 'http://127.0.0.1:1', SUPABASE_SERVICE_ROLE_KEY: 'offline-not-a-real-key', SUPABASE_ANON_KEY: 'offline-not-a-real-key' },
  });
  const code = r.status ?? 124;
  fs.writeFileSync(path.join(logDir, `${file}.log`), `${r.stdout ?? ''}${r.stderr ?? ''}${r.error ? '\n' + String(r.error) : ''}`);
  results.push({ file, code, durationMs: Date.now() - started });
  console.log(`${code === 0 ? 'PASS' : 'FAIL'} ${file}`);
}
fs.writeFileSync(path.join(logDir, 'summary.json'), JSON.stringify({ passed: results.filter(r => r.code === 0).length, failed: results.filter(r => r.code !== 0).length,
  skipped: [...skipped], results }, null, 2) + '\n');
console.log(`Passed ${results.filter(r => r.code === 0).length}; failed ${results.filter(r => r.code !== 0).length}; skipped ${skipped.size}`);
if (results.some(r => r.code !== 0)) process.exitCode = 1;
