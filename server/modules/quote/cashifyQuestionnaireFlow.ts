/**
 * Walks Cashify's public "Get Exact Value" questionnaire for one device and
 * records the questions each page shows, so the quote page can ask what
 * Cashify asks for that model (accessories, age, eSIM, defect and problem tiles).
 *
 * Deliberately limited:
 *  - a fresh, logged-out browser context (no stored Cashify session);
 *  - the first page is answered as a perfect, in-warranty phone with a valid
 *    bill, because that is the path on which Cashify shows the most questions
 *    (the age page only appears for phones under warranty);
 *  - defect, problem and accessory pages are read and left unselected;
 *  - it stops at the age page, or at whatever page follows the accessories.
 *    It never chooses an age, never opens a price summary and never sells.
 *
 * Returns raw page text per page; parsing lives in
 * lib/referencePricing/questionnaire/parser.ts.
 */
import type { BrowserContext, Page } from 'playwright';
import { getCashifyBrowser } from './cashifyScraper';
import type { QuestionnaireFlowFetch, QuestionnaireFlowPage } from '../../../lib/referencePricing/questionnaire/parser';

const NAV_TIMEOUT_MS = Number(process.env.CASHIFY_NAV_TIMEOUT_MS ?? 45000);
const STEP_TIMEOUT_MS = Number(process.env.CASHIFY_QUESTIONNAIRE_STEP_TIMEOUT_MS ?? 20000);
const MAX_PAGES = 6;

const normaliseCapacity = (text: string) => text.replace(/\s+/g, '').toUpperCase();

async function chooseVariantChip(page: Page, storage: string): Promise<void> {
  await page.evaluate((wantedCapacity: string) => {
    const re = /^\s*\d+(?:\.\d+)?\s*(?:GB|TB|MB)(?:\s*\/\s*\d+(?:\.\d+)?\s*(?:GB|TB|MB))?\s*$/i;
    const chips = Array.from(document.querySelectorAll('body *'))
      .filter((el) => el.children.length === 0 && re.test(el.textContent || '')) as HTMLElement[];
    if (chips.length === 0) return;
    const labels = chips.map((el) => (el.textContent || '').replace(/\s+/g, '').toUpperCase());
    const exact = labels.indexOf(wantedCapacity);
    const suffix = labels.findIndex((label) => wantedCapacity.endsWith(label));
    const chip = chips[exact >= 0 ? exact : suffix >= 0 ? suffix : 0];
    (chip.closest('label, button, [role=radio]') as HTMLElement | null ?? chip).click();
  }, normaliseCapacity(storage));
}

/** The questionnaire card's own text: the left-hand card that holds the page
 * heading, without the "Device Evaluation" summary beside it. */
async function readCard(page: Page): Promise<string> {
  return page.evaluate(() => {
    const continueButton = Array.from(document.querySelectorAll('button'))
      .find((b) => /^\s*continue/i.test(b.textContent || '')) as HTMLElement | undefined;
    // Climb from the Continue button to the largest container that still
    // excludes the "Device Evaluation" summary card beside the questions.
    let card: HTMLElement | null = continueButton ?? null;
    while (card && card.parentElement && !/device evaluation/i.test(card.parentElement.innerText || '')) card = card.parentElement;
    const text = (card ?? (document.querySelector('main') as HTMLElement | null) ?? document.body).innerText || '';
    return text.split(String.fromCharCode(13)).join("");
  });
}

/** Cashify numbers its questionnaire pages in the address (pageId=0, 1, ...). */
const pageIdOf = (url: string) => new URL(url).searchParams.get('pageId') ?? '';

async function openQuestionnaire(page: Page): Promise<boolean> {
  const anchor = page.getByText(/make and receive calls/i).first();
  for (let attempt = 0; attempt < 3; attempt++) {
    const button = page.locator('button', { hasText: 'Get Exact Value' }).first();
    await button.waitFor({ state: 'visible', timeout: STEP_TIMEOUT_MS });
    await button.click({ timeout: 5000 }).catch(() => page.evaluate(() => {
      const target = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').includes('Get Exact Value'));
      (target as HTMLButtonElement | undefined)?.click();
    }));
    if (await anchor.waitFor({ state: 'visible', timeout: 8000 }).then(() => true, () => false)) return true;
  }
  return false;
}

/** Page one: "Yes" for every Yes/No question; for any other choice question
 * (e.g. eSIM type) the first option. Only what a customer would tap. */
async function answerFirstPage(page: Page): Promise<void> {
  const yes = page.getByText('Yes', { exact: true });
  const count = await yes.count();
  for (let i = 0; i < count; i++) {
    const option = yes.nth(i);
    if (await option.isVisible().catch(() => false)) await option.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(250);
  }
  // A question revealed by an earlier answer (the GST bill after warranty) gets its Yes too.
  const after = await yes.count();
  for (let i = count; i < after; i++) await yes.nth(i).click({ timeout: 5000 }).catch(() => {});
  // Choice questions that are not Yes/No: the first option, as a customer might tap.
  for (const label of ["Single eSIM"]) {
    const option = page.getByText(label, { exact: true }).first();
    if (await option.isVisible().catch(() => false)) await option.click({ timeout: 5000 }).catch(() => {});
  }
}

async function clickContinue(page: Page): Promise<boolean> {
  const before = pageIdOf(page.url());
  const button = page.locator('button', { hasText: /^\s*Continue/ }).first();
  if (!(await button.isVisible().catch(() => false))) return false;
  await button.scrollIntoViewIfNeeded().catch(() => {});
  await button.click({ timeout: 5000 }).catch(() => {});
  for (let waited = 0; waited < STEP_TIMEOUT_MS; waited += 500) {
    await page.waitForTimeout(500);
    if (pageIdOf(page.url()) !== before || !/\/sell\/calculator\//.test(page.url())) {
      await page.waitForTimeout(1200); // let the next page render
      return true;
    }
  }
  return false;
}

const isAgePage = (text: string) => /what is your mobile age|how old is your/i.test(text);
const isEndPage = (text: string) => /price summary|selling price|sell now|login|enter (your )?mobile number|otp/i.test(text);

export async function readCashifyQuestionnaireFlow(url: string, storage = ''): Promise<QuestionnaireFlowFetch> {
  const browser = await getCashifyBrowser({ headless: true });
  let context: BrowserContext | null = null;
  try {
    context = await browser.newContext({ locale: 'en-IN' });
    const page = await context.newPage();
    page.setDefaultNavigationTimeout(NAV_TIMEOUT_MS);
    const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
    const status = response?.status() ?? 0;
    if (status === 404 || status === 410) return { pages: null, url };

    await page.waitForLoadState('networkidle', { timeout: STEP_TIMEOUT_MS }).catch(() => {});
    await chooseVariantChip(page, storage);
    const pages: QuestionnaireFlowPage[] = [];
    if (!(await openQuestionnaire(page).catch(() => false))) {
      pages.push({ index: 0, text: await page.evaluate(() => (document.querySelector('main') ?? document.body)?.innerText ?? '') });
      return { pages, url };
    }

    pages.push({ index: 0, text: await readCard(page) });
    await answerFirstPage(page);
    for (let index = 1; index < MAX_PAGES; index++) {
      if (!(await clickContinue(page))) break;
      if (!/\/sell\/calculator\//.test(page.url())) break; // left the questionnaire: a quote or login page
      const text = await readCard(page);
      if (isEndPage(text) && !isAgePage(text)) break; // never record or act on a price page
      pages.push({ index, text });
      if (isAgePage(text)) break; // stop before choosing an age: no quote is computed
    }
    return { pages, url };
  } finally {
    if (context) await context.close().catch(() => {});
  }
}
