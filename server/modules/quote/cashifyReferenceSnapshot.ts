/**
 * Reference-price mode for the team's existing Cashify scraper.
 *
 * This is NOT a second scraper. It imports and reuses the existing one's
 * session rotation and shared Chromium instance from ./cashifyScraper, and
 * only implements the one thing that module does not already do: read a
 * variant's LISTED BASE PRICE instead of walking the diagnostics questionnaire.
 *
 * Why a different read at all: scrapeCashifyPrice() answers "what would
 * Cashify pay for THIS user's phone in THIS condition" - it completes the
 * whole questionnaire and returns a condition-adjusted number. The
 * reference-price pipeline needs the input to that adjustment, not its
 * output: calculateFhoneifyPrice(brand, model, baseMarketPrice, answers) in
 * lib/pricingCalculator.ts takes the listed base price and applies
 * Fhoneify's own age/defect/accessory/bill rules to it. Feeding it an
 * already-condition-adjusted price would double-apply those penalties and
 * silently change every quote - so this never enters the questionnaire.
 *
 * Cashify serves two kinds of device page (observed live, Sep 2026):
 *
 *  - VARIANT page, e.g. /used-oppo-find-x9s-12-gb-512-gb
 *      h1 "Sell Old OPPO Find X9s (12 GB/512 GB)", one "Get Upto ₹44,060",
 *      no variant chips.
 *  - MODEL page, e.g. /used-apple-iphone-14
 *      h1 "Sell Old Apple iPhone 14", storage-only chips ("128 GB", ...), no
 *      price. Clicking a chip loads that variant's page.
 *
 * Both pages also carry a "Top Models" carousel of OTHER devices with
 * near-identical labels ("Apple iPhone 13 (4 GB/128 GB)"). Nothing here reads
 * from it: the name comes from the h1, and chips must be bare capacities.
 *
 * This module returns RAW page text and performs no matching or validation.
 * Every identity and price rule lives in
 * lib/referencePricing/sources/cashifyIdentity.ts so those rules have exactly
 * one home and cannot drift between the browser path and the tests.
 */
import type { BrowserContext, Page } from 'playwright';
import path from 'path';
import logger from '../../lib/logger';
import { getCashifySessionFiles, getCashifyBrowser } from './cashifyScraper';
import type { CashifyPageSnapshot } from '../../../lib/referencePricing/sources/cashifyIdentity';
import { parseVariant, splitHeading } from '../../../lib/referencePricing/sources/cashifyIdentity';

const NAV_TIMEOUT_MS = Number(process.env.CASHIFY_NAV_TIMEOUT_MS ?? 45000);
const SETTLE_MS = Number(process.env.CASHIFY_SETTLE_MS ?? 2500);
const PRICE_SETTLE_MS = Number(process.env.CASHIFY_PRICE_SETTLE_MS ?? 2500);

/** A variant chip's text is ONLY a capacity - "128 GB" or "8 GB/256 GB". The
 * anchors are what exclude "Top Models" labels like "Apple iPhone 13 (4 GB/128
 * GB)", which contain a capacity but are other devices. */
const CHIP_TEXT_RE = /^\s*\d+(?:\.\d+)?\s*(?:GB|TB|MB)(?:\s*\/\s*\d+(?:\.\d+)?\s*(?:GB|TB|MB))?\s*$/i;

async function readHeading(page: Page): Promise<string> {
  return page.evaluate(() => (document.querySelector('h1')?.textContent || '').replace(/\s+/g, ' ').trim());
}

/** Leaf elements whose entire text is a bare capacity, in document order. */
async function readVariantChips(page: Page): Promise<string[]> {
  return page.evaluate((source: string) => {
    const re = new RegExp(source, 'i');
    return Array.from(document.querySelectorAll('body *'))
      .filter((el) => el.children.length === 0 && re.test(el.textContent || ''))
      .map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim());
  }, CHIP_TEXT_RE.source);
}

/**
 * The listed price, as raw text. Reads the amount inside the "Get Upto"
 * block. If the page shows more than one DIFFERENT "Get Upto" amount, returns
 * '' - it is then unclear which amount belongs to this variant, and an empty
 * price is rejected upstream rather than guessed.
 */
async function readListedPriceText(page: Page): Promise<string> {
  return page.evaluate(() => {
    const amounts = new Set<string>();
    for (const el of Array.from(document.querySelectorAll('body *'))) {
      if (el.children.length !== 0) continue;
      const own = (el.textContent || '').trim();
      if (!/^₹\s*[\d,]{2,}$/.test(own)) continue;
      const context = (el.parentElement?.textContent || '').replace(/\s+/g, ' ').trim();
      if (/^get\s*up\s*to/i.test(context)) amounts.add(own.replace(/\s+/g, ''));
    }
    return amounts.size === 1 ? Array.from(amounts)[0] : '';
  });
}

/**
 * Loads one Cashify device page and reports what was actually on screen for
 * the requested variant.
 *
 * Returns null ONLY for a genuine "Cashify has no page at this URL". Every
 * other problem either throws (transport-level, so the ingestion layer's
 * retry/backoff applies and a final failure preserves the previous price) or
 * comes back as a snapshot that fails verification upstream.
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
      // This module runs under tsx (esbuild), which rewrites named function
      // expressions as `__name(fn, "name")`. Callbacks passed to
      // page.evaluate() are serialized and run INSIDE the browser, where that
      // helper does not exist - so any evaluate body that declares a named
      // inner function throws "__name is not defined". A no-op shim in the
      // page makes the serialized code run as written.
      await context.addInitScript({ content: 'window.__name = function (fn) { return fn; };' });
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
        return null; // genuine "Cashify does not list this URL"
      }
      if (status >= 500) {
        throw new Error(`Cashify returned HTTP ${status} for ${url}`);
      }

      await page.waitForTimeout(SETTLE_MS);

      const heading = await readHeading(page);
      if (!heading) {
        // A 200 with no h1 is a challenge/interstitial page, not a device
        // page. Transport-level: retry with another session or later.
        throw new Error(`Cashify page at ${url} rendered no device heading (possible bot challenge)`);
      }

      // --- VARIANT page: the heading already names the variant --------------
      if (splitHeading(heading).embeddedVariant) {
        return {
          url: page.url(),
          deviceName: heading,
          selectedVariant: '',
          priceText: await readListedPriceText(page),
          variantResolvedBy: 'url',
        };
      }

      // --- MODEL page: choose the variant from its chips --------------------
      const chips = await readVariantChips(page);
      const wanted = parseVariant(device.storage);

      const sameStorage = chips.filter((text) => parseVariant(text).storage === wanted.storage);
      const exact = sameStorage.filter((text) => {
        const p = parseVariant(text);
        return p.ram === wanted.ram || (p.ram === null && wanted.ram === null);
      });

      // Distinct options, not DOM copies (mobile + desktop render the same
      // chip twice).
      const distinct = (xs: string[]) => Array.from(new Set(xs.map((x) => x.replace(/\s+/g, '').toLowerCase())));
      const storageOnlyChips = chips.length > 0 && chips.every((t) => parseVariant(t).ram === null);

      let chosen: string | undefined;
      let resolvedBy: CashifyPageSnapshot['variantResolvedBy'];

      if (distinct(exact).length === 1) {
        chosen = exact[0];
        resolvedBy = storageOnlyChips ? 'unique-storage-chip' : 'url';
      } else if (storageOnlyChips && distinct(sameStorage).length === 1) {
        chosen = sameStorage[0];
        resolvedBy = 'unique-storage-chip';
      }

      if (!chosen) {
        // Not offered, or offered more than once in different RAM
        // configurations. Report honestly; never read the default selection.
        return {
          url: page.url(),
          deviceName: heading,
          selectedVariant: '',
          priceText: '',
          availableVariants: Array.from(new Set(chips)),
        };
      }

      await page.getByText(chosen, { exact: true }).first().click();
      await page.waitForTimeout(PRICE_SETTLE_MS);

      return {
        url: page.url(),
        // Re-read: the click navigates to the variant page, whose heading now
        // names the variant Cashify actually loaded.
        deviceName: await readHeading(page),
        selectedVariant: chosen,
        priceText: await readListedPriceText(page),
        availableVariants: Array.from(new Set(chips)),
        variantResolvedBy: resolvedBy,
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
