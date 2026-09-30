/**
 * Materializes a Cashify session from the CASHIFY_SESSION_STATE secret so
 * GitHub Actions never needs a session file committed to the repository.
 *
 * Deliberately duplicated from scripts/reference-pricing/refresh-from-cashify.ts
 * rather than imported: AGENTS.md says not to touch the existing Cashify
 * refresh, and this research campaign is a fully separate module. Keep both
 * copies in sync by hand if the secret format ever changes.
 *
 * The value is a base64-encoded Playwright storageState JSON. Nothing about
 * it is ever logged - not its length, not a prefix, not a parse error that
 * might echo its contents.
 */
import fs from 'fs';
import path from 'path';

export function materializeResearchSessionFromEnv(): boolean {
  const encoded = process.env.CASHIFY_SESSION_STATE;
  if (!encoded) return false;

  let decoded: string;
  try {
    decoded = Buffer.from(encoded, 'base64').toString('utf8');
    JSON.parse(decoded); // validate shape only; never print the result
  } catch {
    throw new Error(
      'CASHIFY_SESSION_STATE is set but is not valid base64-encoded JSON. ' +
        'Re-generate it with: base64 -w0 cashify-sessions/<session>.json'
    );
  }

  const dir = path.join(process.cwd(), 'cashify-sessions');
  fs.mkdirSync(dir, { recursive: true });
  const target = path.join(dir, 'research-ci-session.json');
  fs.writeFileSync(target, decoded, { encoding: 'utf8', mode: 0o600 });
  console.log('[research] Cashify session materialized from CASHIFY_SESSION_STATE (contents not logged).');
  return true;
}
