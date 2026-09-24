/**
 * Reads the FIRST page of Cashify's public "Get Exact Value" questionnaire for
 * one device, so the metadata refresh can learn which questions Cashify asks.
 *
 * Deliberately limited:
 *  - a fresh, logged-out browser context (no stored Cashify session);
 *  - stops at the first questionnaire page - no answers are submitted and no
 *    quote is ever requested;
 *  - no CAPTCHA handling: a blocked or unfinished page simply returns its
 *    text, which the parser reports as UNKNOWN.
 * Parsing lives in lib/referencePricing/questionnaire/parser.ts.
 */
import type { BrowserContext, Page } from 'playwright';
import { getCashifyBrowser } from './cashifyScraper';
import type { QuestionnairePageFetch } from '../../../lib/referencePricing/questionnaire/refreshJob';

const NAV_TIMEOUT_MS = Number(process.env.CASHIFY_NAV_TIMEOUT_MS ?? 45000);
const STEP_TIMEOUT_MS = Number(process.env.CASHIFY_QUESTIONNAIRE_STEP_TIMEOUT_MS ?? 20000);
const CLICK_ATTEMPTS = 3;

const normaliseCapacity = (text: string) => text.replace(/\s+/g, '').toUpperCase();

/** Model pages (e.g. /used-apple-iphone-13) list storage chips and only show
 * "Get Exact Value" for a chosen variant. Picks the device's own storage chip,
 * else the first chip. No-op on variant pages, which have no chips. */
async function chooseVariantChip(page: Page, storage: string): Promise<void> {
  const wanted = normaliseCapacity(storage);
  await page.evaluate((wantedCapacity: string) => {
    const re = /^\s*\d+(?:\.\d+)?\s*(?:GB|TB|MB)(?:\s*\/\s*\d+(?:\.\d+)?\s*(?:GB|TB|MB))?\s*$/i;
    const chips = Array.from(document.querySelectorAll('body *'))
      .filter((el) => el.children.length === 0 && re.test(el.textContent || '')) as HTMLElement[];
    if (chips.length === 0) return;
    // No named helper functions in here: the bundler would wrap them in a
    // __name() call that does not exist inside the browser page.
    const labels = chips.map((el) => (el.textContent || '').replace(/\s+/g, '').toUpperCase());
    const exact = labels.indexOf(wantedCapacity);
    const suffix = labels.findIndex((label) => wantedCapacity.endsWith(label));
    const chip = chips[exact >= 0 ? exact : suffix >= 0 ? suffix : 0];
    (chip.closest('label, button, [role=radio]') as HTMLElement | null ?? chip).click();
  }, wanted);
}

async function openQuestionnaire(page: Page): Promise<boolean> {
  const anchor = page.getByText(/make and receive calls/i).first();
  for (let attempt = 0; attempt < CLICK_ATTEMPTS; attempt++) {
    const button = page.locator('button', { hasText: 'Get Exact Value' }).first();
    await button.waitFor({ state: 'visible', timeout: STEP_TIMEOUT_MS });
    // A pointer click first; if an overlay (app banner, WhatsApp prompt)
    // intercepts it, a DOM click on the same button - what a user's tap
    // triggers. Nothing is dismissed or bypassed.
    await button.click({ timeout: 5000 }).catch(() =>
      page.evaluate(() => {
        const target = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').includes('Get Exact Value'));
        (target as HTMLButtonElement | undefined)?.click();
      })
    );
    const opened = await anchor.waitFor({ state: 'visible', timeout: 8000 }).then(() => true, () => false);
    if (opened) return true;
  }
  return false;
}

export async function readCashifyQuestionnairePage(url: string, storage = ''): Promise<QuestionnairePageFetch> {
  const browser = await getCashifyBrowser({ headless: true });
  let context: BrowserContext | null = null;
  try {
    context = await browser.newContext({ locale: 'en-IN' });
    const page = await context.newPage();
    page.setDefaultNavigationTimeout(NAV_TIMEOUT_MS);
    const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
    const status = response?.status() ?? 0;
    if (status === 404 || status === 410) return { pageText: null, url };

    await page.waitForLoadState('networkidle', { timeout: STEP_TIMEOUT_MS }).catch(() => {});
    await chooseVariantChip(page, storage);
    await openQuestionnaire(page).catch(() => false);
    // Whatever rendered is returned; without the anchor question the parser
    // reports UNKNOWN.
    const pageText = await page.evaluate(() => (document.querySelector('main') ?? document.body)?.innerText ?? '');
    return { pageText, url };
  } finally {
    if (context) await context.close().catch(() => {});
  }
}
