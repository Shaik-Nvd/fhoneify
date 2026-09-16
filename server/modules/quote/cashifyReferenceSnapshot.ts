/**
 * Reference-price mode for the team's existing Cashify scraper.
 *
 * This is NOT a second scraper. It imports and reuses the existing one's
 * session rotation and shared Chromium instance from ./cashifyScraper, and
 * only implements the one thing that module does not
 * already do: read a variant's LISTED BASE PRICE instead of walking the
 * diagnostics questionnaire.
 *
 * Why a different read at all: scrapeCashifyPrice() answers "what would
 * Cashify pay for THIS user's phone in THIS condition" - it completes the
 * whole questionnaire and returns a condition-adjusted number. The
 * reference-price pipeline needs the input to that adjustment, not its
 * output: calculateFhoneifyPrice(brand, model, baseMarketPrice, answers) in
 * lib/pricingCalculator.ts takes the listed base price and applies
 * Fhoneify's own age/defect/accessory/bill rules to it. Feeding it an
 * already-condition-adjusted price would double-apply those penalties and
 * silently change every quote - so this stops right after variant selection.
 *
 * This module deliberately returns RAW page text and performs no matching or
 * validation. Every identity and price rule lives in
 * lib/referencePricing/sources/cashifyIdentity.ts so those rules have exactly
 * one home and cannot drift between the browser path and the tests.
 */
import type { BrowserContext, Page } from 'playwright';
import path from 'path';
import logger from '../../lib/logger';
import { getCashifySessionFiles, getCashifyBrowser } from './cashifyScraper';
import type { CashifyPageSnapshot } from '../../../lib/referencePricing/sources/cashifyIdentity';
import { parseVariant } from '../../../lib/referencePricing/sources/cashifyIdentity';

const NAV_TIMEOUT_MS = Number(process.env.CASHIFY_NAV_TIMEOUT_MS ?? 45000);
const SETTLE_MS = Number(process.env.CASHIFY_SETTLE_MS ?? 1500);
const PRICE_SETTLE_MS = Number(process.env.CASHIFY_PRICE_SETTLE_MS ?? 2000);

/** The DOM query used to locate variant chips. Defined once and reused for
 * both reading and clicking, so the index returned by the read is guaranteed
 * to address the same element on the click. */
const CHIP_SELECTOR =
  'button, [role="button"], li, label, div[class*="variant"], div[class*="storage"]';

async function readVariantChips(page: Page, selector: string): Promise<{ text: string; index: number }[]> {
  return page.evaluate((sel: string) => {
    const candidates = Array.from(document.querySelectorAll(sel));
    const out: { text: string; index: number }[] = [];
    candidates.forEach((el, index) => {
      const text = (el.textContent || '').trim();
      // A variant chip is short and contains a capacity token. Anything
      // longer is a container that merely includes a chip.
      if (text.length > 0 && text.length <= 24 && /\d+\s*(GB|TB|MB)/i.test(text)) {
        out.push({ text, index });
      }
    });
    return out;
  }, selector);
}

async function readDeviceName(page: Page): Promise<string> {
  return page.evaluate(() => {
    const h1 = document.querySelector('h1');
    const fromH1 = (h1?.textContent || '').trim();
    if (fromH1) return fromH1;
    return (document.title || '').trim();
  });
}

/**
 * The listed price for the currently-selected variant, as raw text
 * (e.g. "₹15,140"). Parsing and the currency check belong to
 * parsePriceText(), not here.
 */
async function readListedPriceText(page: Page): Promise<string> {
  return page.evaluate(() => {
    const priceIn = (t: string) => (t.match(/₹\s*[\d,]{2,}/) || [])[0] || '';

    // Prefer a rupee amount sitting in an element explicitly labelled as the
    // device's value, rather than any rupee amount anywhere on the page
    // (offers, EMI banners and voucher blurbs are all rupee amounts too).
    const labels = ['Get upto', 'Get Upto', 'Sell at', 'Best Price', 'Selling price', 'Up to', 'Upto'];
    for (const label of labels) {
      const labelEl = Array.from(document.querySelectorAll('*')).find((el) => {
        const text = (el.textContent || '').trim();
        return text.startsWith(label) && text.length < 60;
      });
      if (labelEl) {
        const found = priceIn((labelEl.textContent || '').trim());
        if (found) return found;
      }
    }

    // Otherwise the most prominent rupee amount: the largest-rendered leaf
    // element whose entire text is a price.
    const candidates = Array.from(document.querySelectorAll('span, div, h1, h2, h3, h4, p, strong'))
      .map((el) => ({ el, text: (el.textContent || '').trim() }))
      .filter(({ el, text }) => el.children.length === 0 && /₹\s*[\d,]{2,}/.test(text) && text.length < 24);

    if (candidates.length === 0) return '';

    let best = candidates[0];
    let bestSize = -1;
    for (const candidate of candidates) {
      const size = parseFloat(getComputedStyle(candidate.el as Element).fontSize || '0');
      if (size > bestSize) {
        bestSize = size;
        best = candidate;
      }
    }
    return priceIn(best.text);
  });
}

/**
 * Loads one Cashify device page, selects the requested variant, and reports
 * what was actually on screen.
 *
 * Returns null ONLY for a genuine "Cashify has no page for this device".
 * Every other problem either throws (transport-level, so the ingestion
 * layer's retry/backoff applies and a final failure preserves the previous
 * price) or comes back as a snapshot that fails verification upstream.
 *
 * This NEVER falls back to Cashify's search results the way
 * scrapeCashifyPrice does. For an interactive "what's my phone worth" lookup,
 * landing on a near-miss device is a mild annoyance the user can see and
 * ignore. For a stored reference price that silently feeds every future
 * quote, it is the exact failure this system exists to prevent.
 */
export async function scrapeCashifyReferenceSnapshot(
  device: { brand: string; model: string; storage: string },
  url: string
): Promise<CashifyPageSnapshot | null> {
  const sessionFiles = getCashifySessionFiles();
  if (sessionFiles.length === 0) {
    throw new Error(
      'No Cashify session found. Provide one via the CASHIFY_SESSION_STATE secret (CI) or run the setup-cashify script (local).'
    );
  }
  sessionFiles.sort(() => Math.random() - 0.5);

  // Headless: this runs unattended on a CI runner with no display.
  const browser = await getCashifyBrowser({ headless: true });
  let lastError: Error | null = null;

  for (const sessionFile of sessionFiles) {
    let context: BrowserContext | null = null;
    try {
      context = await browser.newContext({ storageState: sessionFile });
      const page = await context.newPage();
      page.setDefaultTimeout(NAV_TIMEOUT_MS);

      // Drop heavy assets: this run touches thousands of pages and needs none
      // of them. (The interactive scraper keeps images on purpose, so a human
      // can solve a CAPTCHA - which does not apply to an unattended job.)
      await page.route('**/*', (route) => {
        const type = route.request().resourceType();
        if (['image', 'media', 'font'].includes(type)) route.abort();
        else route.continue();
      });

      const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
      const status = response?.status() ?? 0;
      if (status === 404 || status === 410) {
        return null; // genuine "Cashify does not list this device"
      }
      if (status >= 500) {
        throw new Error(`Cashify returned HTTP ${status} for ${url}`);
      }

      await page.waitForTimeout(SETTLE_MS);

      const deviceName = await readDeviceName(page);
      const chips = await readVariantChips(page, CHIP_SELECTOR);
      const wanted = parseVariant(device.storage);

      const matching = chips.filter((chip) => {
        const parsed = parseVariant(chip.text);
        return parsed.storage !== null && parsed.storage === wanted.storage && parsed.ram === wanted.ram;
      });

      if (matching.length === 0) {
        // The requested variant is not offered. Report that honestly instead
        // of reading whichever variant happened to be selected by default -
        // that is how a 256GB price ends up stored against a 512GB device.
        return {
          url: page.url(),
          deviceName,
          selectedVariant: '',
          priceText: '',
          availableVariants: chips.map((c) => c.text),
        };
      }

      // Every entry in `matching` parses to an identical RAM+storage pair, so
      // these are the same variant rendered more than once (e.g. a mobile and
      // a desktop copy of the chip list). Clicking the first is not a choice
      // between different devices.
      const chosen = matching[0];
      await page.evaluate(
        ({ sel, chipIndex }: { sel: string; chipIndex: number }) => {
          const candidates = Array.from(document.querySelectorAll(sel));
          (candidates[chipIndex] as HTMLElement | undefined)?.click();
        },
        { sel: CHIP_SELECTOR, chipIndex: chosen.index }
      );

      await page.waitForTimeout(PRICE_SETTLE_MS);

      return {
        url: page.url(),
        deviceName,
        selectedVariant: chosen.text,
        priceText: await readListedPriceText(page),
        availableVariants: chips.map((c) => c.text),
      };
    } catch (error: any) {
      lastError = error;
      logger.warn(
        { err: error.message, session: path.basename(sessionFile) },
        'Cashify reference snapshot failed with this session; trying the next one'
      );
    } finally {
      if (context) await context.close();
    }
  }

  // Every session failed at transport level. Throwing (rather than returning
  // null) is deliberate: it routes into the ingestion layer's retry/backoff,
  // and a final failure preserves the stored price instead of recording a
  // "device not found".
  throw lastError ?? new Error(`Failed to load ${url} with every available Cashify session`);
}
