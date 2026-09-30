/**
 * Prints each Cashify session file's local validity (auth-cookie expiry) -
 * no network call, safe to run any time.
 *
 *   npm run research:session-status
 */
import 'dotenv/config';
import { describeSessionPool } from './collector';

const pool = describeSessionPool();
if (pool.length === 0) {
  console.log('No session files found. Run "npm run research:login" first.');
  process.exit(1);
}

console.log('=== CASHIFY SESSION POOL STATUS ===');
let anyValid = false;
for (const s of pool) {
  anyValid = anyValid || s.valid;
  console.log(`${s.valid ? 'VALID  ' : 'EXPIRED'}  ${s.file}`);
  console.log(`          ${s.reason}`);
}
console.log(`\n${pool.filter((s) => s.valid).length}/${pool.length} sessions currently usable.`);
if (!anyValid) {
  console.log('No usable sessions. Run "npm run research:login" to authenticate again.');
  process.exit(1);
}
