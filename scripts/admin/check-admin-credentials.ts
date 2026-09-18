/**
 * LOCAL-ONLY check: do the admin credentials you intend to use match what is
 * configured in production?
 *
 *   npm run admin:check-credentials
 *
 * Paste the two values copied from Render (ADMIN_USERNAME, ADMIN_PASSWORD_HASH)
 * and type the username and password you intend to log in with. Nothing is
 * sent anywhere, and no value is ever printed - only MATCH / NO MATCH and
 * structural findings (hidden whitespace, quotes, wrong format).
 *
 * Uses the same verifyPassword() as the server, so a MATCH here means the
 * server will accept the password.
 *
 * Non-interactive: set CHECK_ADMIN_USERNAME_CONFIGURED, CHECK_ADMIN_HASH,
 * CHECK_ADMIN_USERNAME, CHECK_ADMIN_PASSWORD.
 */
import readline from 'readline';
import { verifyPassword, parsePasswordHash } from '../../server/lib/password';

/** One readline interface for every question (Windows misbehaves when several
 * are opened and closed on the same stdin), with echo masking per question. */
function createPrompter() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  const out = rl as any;
  let masked = false;
  let currentPrompt = '';
  out._writeToOutput = (chunk: string) => {
    if (!masked) return out.output.write(chunk);
    if (chunk.includes(currentPrompt)) out.output.write(currentPrompt);
    else if (chunk === '\r\n' || chunk === '\n') out.output.write(chunk);
    else out.output.write('*');
  };
  return {
    ask(prompt: string, hide: boolean): Promise<string> {
      masked = hide;
      currentPrompt = prompt;
      return new Promise((resolve) => rl.question(prompt, (a) => resolve(a)));
    },
    close() {
      rl.close();
    },
  };
}

function describeWhitespace(label: string, value: string): string[] {
  const issues: string[] = [];
  if (value !== value.trim()) {
    const lead = value.length - value.trimStart().length;
    const trail = value.length - value.trimEnd().length;
    issues.push(`${label} has ${lead} leading and ${trail} trailing whitespace character(s)`);
  }
  if (/[\r\n\t]/.test(value.trim())) issues.push(`${label} contains a newline/tab inside it`);
  if (/^["'`]|["'`]$/.test(value.trim())) issues.push(`${label} is wrapped in quotes`);
  return issues;
}

async function main() {
  const env = process.env;
  const interactive = process.stdin.isTTY && !env.CHECK_ADMIN_HASH;
  const p = interactive ? createPrompter() : null;

  const configuredUsername = interactive
    ? await p!.ask('Paste ADMIN_USERNAME exactly as it is in Render: ', false)
    : env.CHECK_ADMIN_USERNAME_CONFIGURED ?? '';
  const configuredHash = interactive
    ? await p!.ask('Paste ADMIN_PASSWORD_HASH from Render (hidden): ', true)
    : env.CHECK_ADMIN_HASH ?? '';
  const loginUsername = interactive
    ? await p!.ask('Username you will type at login: ', false)
    : env.CHECK_ADMIN_USERNAME ?? '';
  const password = interactive
    ? await p!.ask('Password you will type at login (hidden): ', true)
    : env.CHECK_ADMIN_PASSWORD ?? '';
  p?.close();

  console.log('\n=== Result (no values are shown) ===');
  let ok = true;

  // Hash format, checked exactly as the server parses it.
  const hashIssues = describeWhitespace('ADMIN_PASSWORD_HASH', configuredHash);
  const parsed = parsePasswordHash(configuredHash);
  if (!parsed) {
    ok = false;
    console.log('HASH FORMAT: INVALID - the server would disable admin login with this value');
  } else {
    console.log(`HASH FORMAT: valid (scrypt N=${parsed.N}, r=${parsed.r}, p=${parsed.p})`);
  }
  hashIssues.forEach((i) => console.log(`  note: ${i}${i.includes('whitespace') ? ' (the server trims this, harmless)' : ''}`));

  // Username: the server compares byte-for-byte, with no trimming.
  const userIssues = [...describeWhitespace('Render ADMIN_USERNAME', configuredUsername), ...describeWhitespace('typed username', loginUsername)];
  if (configuredUsername === loginUsername) {
    console.log('USERNAME: MATCH');
  } else {
    ok = false;
    if (configuredUsername.trim() === loginUsername.trim()) console.log('USERNAME: NO MATCH - they differ only by hidden whitespace');
    else if (configuredUsername.trim().toLowerCase() === loginUsername.trim().toLowerCase()) console.log('USERNAME: NO MATCH - they differ only by upper/lower case');
    else console.log('USERNAME: NO MATCH');
  }
  userIssues.forEach((i) => console.log(`  note: ${i}`));

  // Password against the hash, using the server's own verifier.
  if (parsed) {
    const match = await verifyPassword(password, configuredHash);
    console.log(`PASSWORD: ${match ? 'MATCH' : 'NO MATCH'} (password length typed: ${password.length})`);
    if (!match) {
      ok = false;
      if (password !== password.trim() && (await verifyPassword(password.trim(), configuredHash))) {
        console.log('  note: it DOES match without the leading/trailing spaces you typed');
      }
    }
  }

  console.log(`\nOVERALL: ${ok ? 'these credentials will be accepted by production' : 'production will reject these credentials - see above'}`);
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error('check failed:', e.message);
  process.exit(1);
});
