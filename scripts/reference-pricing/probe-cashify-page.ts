/** Diagnostic: dumps what a live Cashify device page actually exposes, so the
 * reference reader is fitted to the real DOM instead of guesses. No database.
 * Use it when a refresh starts rejecting devices en masse - Cashify may have
 * changed its page layout.
 *
 *   npx tsx scripts/reference-pricing/probe-cashify-page.ts <url> ["128 GB"] */
import { getCashifySessionFiles, getCashifyBrowser, closeCashifyBrowser } from '../../server/modules/quote/cashifyScraper';

const url = process.argv[2];

(async () => {
  const browser = await getCashifyBrowser({ headless: true });
  const context = await browser.newContext({ storageState: getCashifySessionFiles()[0] });
  await context.addInitScript({ content: 'window.__name = function (fn) { return fn; };' });
  const page = await context.newPage();
  const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(4000);
  const chip = process.argv[3];
  if (chip) {
    await page.locator('span', { hasText: new RegExp(`^${chip}$`) }).first().click();
    await page.waitForTimeout(4000);
    console.log('clicked chip', chip);
  }
  const data = await page.evaluate(() => {
    const text = (el: Element | null) => (el?.textContent || '').replace(/\s+/g, ' ').trim();
    const rupees = Array.from(document.querySelectorAll('body *'))
      .filter((el) => el.children.length === 0 && /₹\s*[\d,]{2,}/.test(el.textContent || ''))
      .slice(0, 25)
      .map((el) => {
        const parent = el.parentElement;
        return {
          tag: el.tagName,
          cls: (el.getAttribute('class') || '').slice(0, 60),
          text: text(el).slice(0, 40),
          parentText: text(parent).slice(0, 90),
          fontSize: getComputedStyle(el).fontSize,
        };
      });
    const capacity = Array.from(document.querySelectorAll('body *'))
      .filter((el) => el.children.length === 0 && /\d+\s*(GB|TB)/i.test(el.textContent || '') && text(el).length <= 30)
      .slice(0, 20)
      .map((el) => ({ tag: el.tagName, text: text(el), parentTag: el.parentElement?.tagName, cls: (el.getAttribute('class') || '').slice(0, 50) }));
    return {
      title: document.title,
      h1: Array.from(document.querySelectorAll('h1')).map(text),
      h2: Array.from(document.querySelectorAll('h2')).map(text).slice(0, 6),
      rupees,
      capacity,
      finalUrl: location.href,
    };
  });
  console.log('HTTP', res?.status());
  console.log(JSON.stringify(data, null, 2));
  await context.close();
  await closeCashifyBrowser();
})().catch(async (e) => {
  console.error('probe failed:', e.message);
  await closeCashifyBrowser();
  process.exit(1);
});
