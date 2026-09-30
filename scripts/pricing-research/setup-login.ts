/** Visible, user-driven login. Saves storageState only after a real final quote gate. */
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { chromium } from 'playwright';
import { validateFinalQuote } from './quoteEvidence';

const model = 'POCO C3';
const storage = '4 GB/64 GB';
const sessionsDir = path.resolve(__dirname, '../../cashify-sessions');

async function main() {
  const browser = await chromium.launch({ headless: false });
  const input = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('https://www.cashify.in/', { waitUntil: 'domcontentloaded' });
    console.log('Visible Cashify browser is open. Sign in yourself; do not enter credentials or OTP in chat.');
    console.log(`In that browser, finish a quotation for ${model} (${storage}) and stop on its Selling price details screen. Do not schedule pickup.`);
    await input.question('Press Enter here only after that final quotation screen is visible...');
    // Cashify may open the questionnaire in a second tab. Only accept a stable
    // final quotation from a currently open page in this fresh browser context.
    const candidates = await Promise.all(context.pages().filter((candidate) => !candidate.isClosed()).map(async (candidate) => {
      const first = validateFinalQuote(candidate.url(), await candidate.locator('body').innerText(), { model, storage });
      await candidate.waitForTimeout(1200);
      const second = validateFinalQuote(candidate.url(), await candidate.locator('body').innerText(), { model, storage });
      const safeSegments = new Set(['sell', 'quote', 'details', 'sell-old-mobile-phone', 'used']);
      const pathname = new URL(candidate.url()).pathname
        .split('/')
        .map((segment) => safeSegments.has(segment.toLowerCase()) ? segment : segment ? ':redacted' : '')
        .join('/');
      return { first, second, pathname };
    }));
    const verified = candidates.find(({ first, second }) => first.ok && second.ok && first.price === second.price);
    if (!verified) {
      // No page text, query string, account data, or session material is logged.
      const diagnostics = candidates.map(({ second, pathname }) => `${pathname}: ${second.reason ?? 'unstable price'}`).join('; ');
      console.error(`Login was not saved: final-price gate failed across ${candidates.length} tab(s) (${diagnostics}).`);
      process.exitCode = 2;
      return;
    }
    fs.mkdirSync(sessionsDir, { recursive: true });
    const sessionPath = path.join(sessionsDir, `session-${Date.now()}.json`);
    await context.storageState({ path: sessionPath });
    fs.chmodSync(sessionPath, 0o600);
    console.log('Final-price gate passed. An ignored local session file was saved; its contents were not logged.');
  } finally {
    input.close();
    await browser.close();
  }
}

main().catch(() => {
  console.error('Login setup failed. No session is considered verified.');
  process.exitCode = 1;
});
