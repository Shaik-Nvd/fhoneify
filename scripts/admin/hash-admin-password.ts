/**
 * Generates ADMIN_PASSWORD_HASH for the admin login.
 *
 *   npm run admin:hash-password
 *
 * Prompts for the password twice with input hidden, then prints ONLY the hash.
 * Paste that hash into the production environment (Render dashboard ->
 * fhoneify-api -> Environment -> ADMIN_PASSWORD_HASH). The password itself is
 * never written to disk, logged, or placed in any environment variable.
 *
 * Non-interactive use (e.g. from a password manager CLI) is supported by piping
 * the password on stdin:  <password-manager-cli> | npm run -s admin:hash-password
 */
import readline from 'readline';
import { hashPassword, verifyPassword } from '../../server/lib/password';

const MIN_LENGTH = 12;

/**
 * Asks for a secret with the prompt visible and the typed characters masked.
 *
 * Writing the prompt before suppressing echo does not work: readline redraws
 * the line when question() starts, which erased the prompt on Windows and left
 * the user staring at a blank screen with no idea it was waiting for input.
 * Masking inside _writeToOutput keeps the prompt and shows '*' per keystroke.
 */
function readHidden(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const out = rl as any;
    out._writeToOutput = (chunk: string) => {
      if (chunk.includes(prompt)) out.output.write(prompt);
      else if (chunk === '\r\n' || chunk === '\n') out.output.write(chunk);
      else out.output.write('*');
    };
    rl.question(prompt, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
  });
}

async function readPiped(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString('utf8').replace(/\r?\n$/, '');
}

async function main() {
  let password: string;
  if (process.stdin.isTTY) {
    password = await readHidden('New admin password: ');
    const confirm = await readHidden('Repeat password:    ');
    if (password !== confirm) {
      console.error('Passwords do not match. Nothing generated.');
      process.exit(1);
    }
  } else {
    password = await readPiped();
  }

  if (password.length < MIN_LENGTH) {
    console.error(`Password must be at least ${MIN_LENGTH} characters. Nothing generated.`);
    process.exit(1);
  }
  if (password.length > 256) {
    console.error('Password must be at most 256 characters. Nothing generated.');
    process.exit(1);
  }

  const hash = await hashPassword(password);
  if (!(await verifyPassword(password, hash))) {
    console.error('Self-check failed. Nothing generated.');
    process.exit(1);
  }

  if (process.stdin.isTTY) {
    console.log('\nADMIN_PASSWORD_HASH (paste this value into the production environment):\n');
  }
  console.log(hash);
}

main().catch((e) => {
  console.error('Failed:', e.message);
  process.exit(1);
});
