/**
 * Reusable Cashify questionnaire walker + price extractor for the pricing
 * research campaign.
 *
 * Generalizes scrapeCashifyPrice()'s single hardcoded walk
 * (server/modules/quote/cashifyScraper.ts) into: (device, one answers
 * profile) -> a structured, auditable outcome. Unlike the original, this
 * also captures the exact question text and exact selected answer for every
 * question actually shown - not just the final price - which is the audit
 * trail the research brief requires.
 *
 * Session/browser infrastructure (getCashifyBrowser, getCashifySessionFiles,
 * resolveHeadless) is imported and reused as-is from cashifyScraper.ts. It
 * is NOT reimplemented here.
 *
 * Safety boundary: this module never clicks anything beyond the price
 * questionnaire itself. It never submits a lead/contact form, never clicks a
 * pickup/order/checkout/"submit request" button, never attempts to solve a
 * CAPTCHA, and never rotates proxies or spoofs a fingerprint. Any of those
 * situations ends the run with AUTH_REQUIRED or UNSUPPORTED - never a
 * fabricated quote.
 */
import type { Browser, BrowserContext, ElementHandle, Page } from 'playwright';
import crypto from 'crypto';
import {
  getCashifyBrowser,
  getCashifySessionFiles,
  resolveHeadless,
} from '../../server/modules/quote/cashifyScraper';
import type { CashifyResearchAnswers } from './profiles';

/** Playwright's own $/$$ return this generic instantiation - kept as an
 * alias so the rest of the file does not repeat it. */
type ElHandle = ElementHandle<SVGElement | HTMLElement>;

export type CollectorStatus = 'COMPLETED' | 'UNSUPPORTED' | 'AUTH_REQUIRED' | 'FAILED';

export interface QuestionAnswerRecord {
  questionText: string;
  selectedAnswer: string;
}

/**
 * Matches lib/researchPricing/store.ts's recordOutcome() contract:
 * status, sourceUrl?, originalGetUptoReference?, questionsAsked?,
 * answersSelected?, finalQuote?, unsupportedReason?, errorReason?,
 * questionnaireFingerprint?.
 */
export interface CollectorResult {
  status: CollectorStatus;
  sourceUrl?: string;
  originalGetUptoReference?: number;
  questionsAsked?: QuestionAnswerRecord[];
  answersSelected?: CashifyResearchAnswers;
  finalQuote?: number;
  unsupportedReason?: string;
  errorReason?: string;
  questionnaireFingerprint?: string;
}

export interface CollectDeviceInput {
  brand: string;
  model: string;
  storage: string;
  /** Curated Cashify URL from the catalog, when known - preferred over a
   * generated slug, same precedence scrapeCashifyPrice() gives it. */
  cashifyUrl?: string;
}

export interface CollectOptions {
  /** Same default-resolution pattern as resolveHeadless(): the caller states
   * its own default, and CASHIFY_SCRAPER_HEADED=true still forces a visible
   * window for manual CAPTCHA solving. Defaults to headless=true - this is a
   * batch research tool, not the interactive quote path. */
  headless?: boolean;
  /** Per-action timeout in ms. */
  actionTimeoutMs?: number;
}

const AUTH_MARKERS = [
  /log ?in to continue/i,
  /sign in to your account/i,
  /enter otp/i,
  /verify (your )?mobile number/i,
  /session (has )?expired/i,
  /please log ?in/i,
  // Cashify's actual final-price gate for an unauthenticated/expired session:
  // a modal headed "Login/Signup" that masks the real number behind
  // "Login to unlock the best price" and a placeholder like "₹ XX,XXX" -
  // confirmed live via a direct diagnostic run. Missing this let a stale
  // session run to completion and record a garbage (unparseable) price
  // instead of AUTH_REQUIRED.
  /login\s*\/\s*signup/i,
  /login to unlock/i,
];

const CAPTCHA_MARKERS = [/i'?m not a robot/i, /verify you are human/i, /recaptcha/i, /hcaptcha/i];

const NOT_FOUND_MARKERS = [
  /page not found/i,
  /device not found/i,
  /no results found/i,
  /we (couldn'?t|could not) find/i,
];

/** Never clicked by this module - listed so a reviewer (or a future editor)
 * can see the boundary explicitly, and so recordAndClick() can assert
 * against it defensively. */
const FORBIDDEN_ANSWER_TEXT = [
  /book\s*pickup/i,
  /schedule\s*pickup/i,
  /confirm\s*order/i,
  /place\s*order/i,
  /proceed to sell/i,
  /submit request/i,
];

function assertSafeToSelect(text: string): void {
  const hit = FORBIDDEN_ANSWER_TEXT.find((re) => re.test(text));
  if (hit) {
    throw new Error(`refusing to click a forbidden action button ("${text}" matched ${hit})`);
  }
}

function stableFingerprint(questions: QuestionAnswerRecord[]): string {
  const material = questions.map((q) => q.questionText.trim().toLowerCase()).join('||');
  return crypto.createHash('sha1').update(material).digest('hex');
}

async function pageVisibleText(page: Page): Promise<string> {
  // document.body, never main-only: Cashify's login-gate modal (and likely
  // any other modal/dialog) renders as a portal appended to <body>, outside
  // <main> - scanning main missed it entirely, so detectAuthRequired() never
  // fired and a stale session ran through to a masked, unparseable price
  // instead of stopping at AUTH_REQUIRED. body always includes everything
  // main would (main is nested inside it), so this is strictly more
  // inclusive, never less.
  return page.evaluate(() => document.body?.innerText ?? '').catch(() => '');
}

async function detectAuthRequired(page: Page): Promise<boolean> {
  const text = await pageVisibleText(page);
  if (AUTH_MARKERS.some((re) => re.test(text))) return true;
  return /\/(login|signin|auth)(\/|$|\?)/i.test(page.url());
}

async function detectCaptcha(page: Page): Promise<boolean> {
  const text = await pageVisibleText(page);
  if (CAPTCHA_MARKERS.some((re) => re.test(text))) return true;
  const frame = await page.$('iframe[src*="captcha" i], iframe[title*="captcha" i]');
  return !!frame;
}

async function detectNotFound(page: Page, responseStatus?: number): Promise<string | null> {
  if (responseStatus === 404 || responseStatus === 410) return `HTTP ${responseStatus} for device page`;
  const text = await pageVisibleText(page);
  const hit = NOT_FOUND_MARKERS.find((re) => re.test(text));
  return hit ? `page text matched ${hit}` : null;
}

/**
 * Reads the question text associated with a button by walking up the DOM
 * from the button and taking the nearest leaf text node that looks like a
 * label, rather than clicking blind by position. Deliberately generic: it
 * does not hardcode any question's wording, so it works for whichever
 * questions this device's questionnaire actually shows.
 */
async function readQuestionLabel(page: Page, handle: ElHandle): Promise<string | null> {
  return page
    .evaluate((el: Element) => {
      // No nested named helper function here (e.g. a `const isLabelText = ...`
      // inside this callback): tsx/esbuild's dev transform injects an
      // `__name(fn, "...")` call to preserve Function.prototype.name, but
      // Playwright serializes only this callback's source as a standalone
      // string to run in the page - the `__name` helper itself is never
      // shipped, so the injected call throws `ReferenceError: __name is not
      // defined` inside the page and the whole evaluate rejects. Confirmed by
      // direct diagnostic against a live Playwright session - every question
      // label lookup was silently failing on this, not a DOM-shape mismatch.
      // Keep this callback's body flat (no nested const/function) if it is
      // ever extended.
      let node: Element | null = el;
      for (let hop = 0; hop < 8 && node; hop++) {
        const container: Element | null = node.parentElement;
        if (!container) break;
        const leaves = Array.from(container.querySelectorAll('*')).filter((n) => n.children.length === 0);
        for (const leaf of leaves) {
          const t = (leaf.textContent || '').trim();
          const s = t.replace(/\s+/g, ' ').trim();
          const isLabelText = s.length >= 4 && s.length <= 220 && !/^(yes|no)$/i.test(s) && /[a-zA-Z]/.test(s);
          if (isLabelText) return s;
        }
        node = container;
      }
      return null;
    }, handle)
    .catch(() => null);
}

interface WalkContext {
  page: Page;
  questions: QuestionAnswerRecord[];
  actionTimeoutMs: number;
}

/** Captures the question text for `handle` before clicking it, and refuses
 * to click anything matching FORBIDDEN_ANSWER_TEXT. */
async function recordAndClick(ctx: WalkContext, handle: ElHandle, selectedAnswer: string): Promise<void> {
  assertSafeToSelect(selectedAnswer);
  const label = (await readQuestionLabel(ctx.page, handle)) ?? '(question text not detected)';
  ctx.questions.push({ questionText: label, selectedAnswer });
  await handle.click({ timeout: ctx.actionTimeoutMs });
}

async function clickByText(page: Page, text: string, timeoutMs: number): Promise<ElHandle | null> {
  try {
    return (await page.waitForSelector(`text="${text}"`, { timeout: timeoutMs })) as ElHandle | null;
  } catch {
    return null;
  }
}

const YES_NO_FIELDS: Array<keyof CashifyResearchAnswers> = [
  'calls',
  'touch',
  'originalScreen',
  'warranty',
  'validBill',
];

const DEFECT_CHECKBOX_TEXT: Record<'broken_screen' | 'screen_spot' | 'body_scratch' | 'panel_missing', string> = {
  broken_screen: 'Broken/scratch on device screen',
  screen_spot: 'Dead Spot/Visible line and Discoloration on screen',
  body_scratch: 'Scratch/Dent on device body',
  panel_missing: 'Device panel missing/broken',
};

const SUB_PAGE_FIELDS: Array<{
  triggerId: 'broken_screen' | 'screen_spot' | 'body_scratch' | 'panel_missing';
  fields: Array<keyof CashifyResearchAnswers>;
}> = [
  { triggerId: 'broken_screen', fields: ['screenCondition'] },
  { triggerId: 'screen_spot', fields: ['screenSpots', 'screenLines', 'screenDiscoloration'] },
  { triggerId: 'body_scratch', fields: ['bodyScratches', 'bodyDents'] },
  { triggerId: 'panel_missing', fields: ['bodyPanel', 'bodyBent'] },
];

const HARDWARE_TEXT: Record<string, string> = {
  front_camera: 'Front Camera not working',
  back_camera: 'Back Camera not working',
  volume: 'Volume Button not working',
  fingerprint: 'Finger Touch not working',
  wifi: 'WiFi not working',
  speaker: 'Speaker Faulty',
  silent: 'Silent Button not working',
  face: 'Face Sensor not working',
  power: 'Power Button not working',
  charging: 'Charging Port not working',
  audio_receiver: 'Audio Receiver not working',
  camera_glass: 'Camera Glass Broken',
  microphone: 'Microphone not working',
  bluetooth: 'Bluetooth not working',
  vibrator: 'Vibrator is not working',
  proximity: 'Proximity Sensor not working',
  battery_service: 'Battery in Service (Health < 80%)',
  battery_health: 'Battery Health 80-85%',
};

const AGE_TEXT: Record<NonNullable<CashifyResearchAnswers['mobileAge']>, string> = {
  below3: 'Below 3 months',
  '3to6': '3 months - 6 months',
  '6to11': '6 months - 11 months',
  above11: 'Above 11 months',
};

/**
 * Walks Cashify's questionnaire for one device with one answers profile and
 * returns a structured, auditable outcome. Never throws on a scrapable
 * failure - callers get FAILED/UNSUPPORTED/AUTH_REQUIRED instead, matching
 * scrapeCashifyPrice()'s "never silently destroy or fabricate data" style.
 */
export async function collectCashifyQuote(
  device: CollectDeviceInput,
  answers: CashifyResearchAnswers,
  opts: CollectOptions = {}
): Promise<CollectorResult> {
  const actionTimeoutMs = opts.actionTimeoutMs ?? 8000;
  const sessionFiles = getCashifySessionFiles();
  if (sessionFiles.length === 0) {
    return { status: 'FAILED', errorReason: 'no Cashify session files available (run setup-cashify first)' };
  }
  sessionFiles.sort(() => Math.random() - 0.5);

  const browser: Browser = await getCashifyBrowser({ headless: resolveHeadless(opts.headless ?? true) });

  let lastError: string | null = null;
  // A rotating pool can (and did, in the safety pilot) contain a mix of
  // fresh and expired sessions. Treating AUTH_REQUIRED as an immediate
  // return made the whole batch's outcome depend on random session-shuffle
  // luck: an expired session picked first blocked a device even though a
  // working session existed in the same pool. Now every session is tried
  // (matching how a thrown error already falls through via `continue`), and
  // AUTH_REQUIRED is only the final answer if every single session hit it.
  let lastAuthRequired: CollectorResult | null = null;

  for (const sessionFile of sessionFiles) {
    let context: BrowserContext | null = null;
    try {
      context = await browser.newContext({ storageState: sessionFile });
      const page = await context.newPage();
      page.setDefaultTimeout(actionTimeoutMs);

      const brandLower = device.brand.toLowerCase();
      const modelLower = device.model.toLowerCase();
      const cleanModel = modelLower.startsWith(brandLower) ? modelLower.slice(brandLower.length).trim() : modelLower;
      const modelSlug = `${brandLower}-${cleanModel}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const deviceUrl = device.cashifyUrl || `https://www.cashify.in/sell-old-mobile-phone/used-${modelSlug}`;

      const response = await page.goto(deviceUrl, { waitUntil: 'domcontentloaded' });

      const notFoundReason = await detectNotFound(page, response?.status());
      if (notFoundReason) {
        return { status: 'UNSUPPORTED', sourceUrl: deviceUrl, unsupportedReason: `device/variant not found: ${notFoundReason}` };
      }
      if (await detectAuthRequired(page)) {
        lastAuthRequired = { status: 'AUTH_REQUIRED', sourceUrl: deviceUrl, errorReason: 'login/OTP prompt detected before questionnaire started' };
        continue;
      }
      if (await detectCaptcha(page)) {
        lastAuthRequired = { status: 'AUTH_REQUIRED', sourceUrl: deviceUrl, errorReason: 'CAPTCHA detected before questionnaire started' };
        continue;
      }

      // Select the storage variant chip.
      const spacedStorage = device.storage.replace(/(\d+)([a-zA-Z]+)/, '$1 $2');
      const variantHandle = (await clickByText(page, spacedStorage, 5000)) ?? (await clickByText(page, device.storage, 5000));
      if (variantHandle) await variantHandle.click().catch(() => {});
      await page.waitForTimeout(1000);

      // Capture the public "Get upto" figure shown before the questionnaire,
      // for later comparison against the questionnaire-driven finalQuote.
      const originalGetUptoReference = await page
        .evaluate(() => {
          const el = Array.from(document.querySelectorAll('*')).find((n) => /get upto/i.test(n.textContent || ''));
          if (!el) return null;
          const text = `${el.textContent || ''} ${el.nextElementSibling?.textContent || ''}`;
          const match = text.match(/₹\s?([\d,]+)/);
          return match ? Number(match[1].replace(/,/g, '')) : null;
        })
        .catch(() => null);

      const getExactValueBtn = await page.$('text="Get Exact Value"');
      if (!getExactValueBtn) {
        return {
          status: 'UNSUPPORTED',
          sourceUrl: deviceUrl,
          originalGetUptoReference: originalGetUptoReference ?? undefined,
          unsupportedReason: 'could not find "Get Exact Value" - variant not selectable or page shape changed',
        };
      }
      await getExactValueBtn.click();

      if (await detectAuthRequired(page)) {
        lastAuthRequired = {
          status: 'AUTH_REQUIRED',
          sourceUrl: deviceUrl,
          originalGetUptoReference: originalGetUptoReference ?? undefined,
          errorReason: 'login/OTP prompt detected after opening questionnaire',
        };
        continue;
      }

      await page.waitForSelector('text=/make and receive calls/i', { timeout: 10000 }).catch(() => {});

      const questions: QuestionAnswerRecord[] = [];
      const ctx: WalkContext = { page, questions, actionTimeoutMs };

      // PAGE 1: Yes/No questions, positional in the same order
      // scrapeCashifyPrice() relies on (calls, touch, originalScreen,
      // warranty, GST bill) - fragile, but it is what Cashify's DOM gives.
      const yesBtns = await page.$$('text="Yes"');
      const noBtns = await page.$$('text="No"');
      const pairCount = Math.min(yesBtns.length, noBtns.length, YES_NO_FIELDS.length);
      for (let i = 0; i < pairCount; i++) {
        const field = YES_NO_FIELDS[i];
        const value = answers[field];
        if (value === false) {
          await recordAndClick(ctx, noBtns[i], 'No');
        } else {
          await recordAndClick(ctx, yesBtns[i], 'Yes');
        }
      }

      // eSIM question, if present.
      const singleEsim = await page.$('text="Single eSIM"');
      const dualEsim = await page.$('text="Dual eSIM"');
      if (singleEsim && dualEsim) {
        if (answers.eSim === 'Dual eSIM') {
          await recordAndClick(ctx, dualEsim, 'Dual eSIM');
        } else {
          await recordAndClick(ctx, singleEsim, 'Single eSIM');
        }
      }

      const continue1 = await page.$('text="Continue"');
      if (continue1) await continue1.click();
      await page.waitForTimeout(1500);

      if (await detectAuthRequired(page)) {
        lastAuthRequired = {
          status: 'AUTH_REQUIRED',
          sourceUrl: deviceUrl,
          originalGetUptoReference: originalGetUptoReference ?? undefined,
          questionsAsked: questions,
          errorReason: 'login prompt mid-questionnaire',
        };
        continue;
      }

      // PAGE 2: Screen/body defect checkboxes.
      for (const [id, text] of Object.entries(DEFECT_CHECKBOX_TEXT) as Array<[keyof typeof DEFECT_CHECKBOX_TEXT, string]>) {
        if (answers.defects?.includes(id)) {
          const el = await page.$(`text="${text}"`);
          if (el) await recordAndClick(ctx, el, text);
        }
      }
      const continue2 = await page.$('text="Continue"');
      if (continue2) await continue2.click();
      await page.waitForTimeout(1500);

      // Sub-pages for whichever defects were selected, in the same order
      // scrapeCashifyPrice() walks them.
      for (const sub of SUB_PAGE_FIELDS) {
        if (!answers.defects?.includes(sub.triggerId)) continue;
        for (const field of sub.fields) {
          const value = answers[field] as string | undefined;
          if (!value) continue;
          const el = await page.$(`text="${value}"`);
          if (el) await recordAndClick(ctx, el, value);
        }
        const cont = await page.$('text="Continue"');
        if (cont) await cont.click();
        await page.waitForTimeout(1500);
      }

      // PAGE 3: Functional/hardware defects.
      for (const hwId of answers.hardware ?? []) {
        const text = HARDWARE_TEXT[hwId];
        if (!text) continue;
        const el = await page.$(`text="${text}"`);
        if (el) await recordAndClick(ctx, el, text);
      }
      const continue3 = await page.$('text="Continue"');
      if (continue3) await continue3.click();
      await page.waitForTimeout(1500);

      // PAGE 4: Accessories.
      if (answers.accessories?.includes('charger')) {
        const el = await page.$('text=Original Charger of device');
        if (el) await recordAndClick(ctx, el, 'Original Charger of device');
      }
      if (answers.accessories?.includes('box')) {
        const el = await page.$('text=Box with same IMEI');
        if (el) await recordAndClick(ctx, el, 'Box with same IMEI');
      }
      const continue4 = await page.$('text="Continue"');
      if (continue4) await continue4.click();
      await page.waitForTimeout(1500);

      // PAGE 5: Mobile age, only if Cashify is actually showing it for this
      // run (either the page title rendered, or warranty+bill both true,
      // matching scrapeCashifyPrice()'s own detection).
      const agePageTitle = await page.$('text=What is your mobile age?');
      if (agePageTitle || (answers.warranty === true && answers.validBill === true)) {
        const ageText = AGE_TEXT[answers.mobileAge ?? 'above11'] ?? AGE_TEXT.above11;
        const ageBtn = (await page.$(`text="${ageText}"`)) ?? (await page.$(`text="${AGE_TEXT.above11}"`));
        if (ageBtn) await recordAndClick(ctx, ageBtn, ageText);
      }

      await page.waitForTimeout(3000);

      if (await detectAuthRequired(page)) {
        lastAuthRequired = {
          status: 'AUTH_REQUIRED',
          sourceUrl: deviceUrl,
          originalGetUptoReference: originalGetUptoReference ?? undefined,
          questionsAsked: questions,
          errorReason: 'login prompt before final price',
        };
        continue;
      }
      if (await detectCaptcha(page)) {
        lastAuthRequired = {
          status: 'AUTH_REQUIRED',
          sourceUrl: deviceUrl,
          originalGetUptoReference: originalGetUptoReference ?? undefined,
          questionsAsked: questions,
          errorReason: 'CAPTCHA before final price',
        };
        continue;
      }

      const priceText = await page
        .evaluate(() => {
          const sellingLabel = Array.from(document.querySelectorAll('*')).find((el) =>
            (el.textContent || '').trim().toLowerCase().includes('selling price')
          );
          if (sellingLabel) {
            let curr = sellingLabel.nextElementSibling;
            while (curr) {
              if (curr.textContent?.includes('₹')) return curr.textContent.trim();
              curr = curr.nextElementSibling;
            }
            const parent = sellingLabel.parentElement;
            if (parent?.nextElementSibling?.textContent?.includes('₹')) {
              return parent.nextElementSibling.textContent.trim();
            }
          }
          const priceElements = Array.from(document.querySelectorAll('span, div, h1, h2, h3, h4, h5, h6')).filter((el) => {
            const t = el.textContent?.trim() || '';
            return t.includes('₹') && t.length < 15;
          });
          return priceElements.length > 0 ? priceElements[0].textContent?.trim() ?? null : null;
        })
        .catch(() => null);

      const fingerprint = stableFingerprint(questions);

      if (!priceText) {
        return {
          status: 'FAILED',
          sourceUrl: deviceUrl,
          originalGetUptoReference: originalGetUptoReference ?? undefined,
          questionsAsked: questions,
          answersSelected: answers,
          errorReason: 'could not extract final price from the page',
          questionnaireFingerprint: fingerprint,
        };
      }

      const finalQuote = parseInt(priceText.replace(/[^0-9]/g, ''), 10);

      if (!Number.isFinite(finalQuote)) {
        // priceText was found but contained no digits - e.g. a masked
        // placeholder like "₹ XX,XXX" behind a login gate the
        // AUTH_MARKERS check above didn't catch. Never record this as
        // COMPLETED with a missing price: that would look like verified data.
        return {
          status: 'FAILED',
          sourceUrl: deviceUrl,
          originalGetUptoReference: originalGetUptoReference ?? undefined,
          questionsAsked: questions,
          answersSelected: answers,
          errorReason: `extracted price text did not contain a parseable number: "${priceText}"`,
          questionnaireFingerprint: fingerprint,
        };
      }

      return {
        status: 'COMPLETED',
        sourceUrl: deviceUrl,
        originalGetUptoReference: originalGetUptoReference ?? undefined,
        questionsAsked: questions,
        answersSelected: answers,
        finalQuote: Number.isFinite(finalQuote) ? finalQuote : undefined,
        questionnaireFingerprint: fingerprint,
      };
    } catch (error: any) {
      lastError = error?.message ?? String(error);
      // Loop continues and tries the next session file.
    } finally {
      if (context) await context.close().catch(() => {});
    }
  }

  // AUTH_REQUIRED is more specific and more actionable than a generic
  // failure (it tells the operator exactly what to do: re-authenticate),
  // so prefer it over lastError when every session in the pool hit it.
  if (lastAuthRequired) return lastAuthRequired;
  return { status: 'FAILED', errorReason: lastError ?? 'all Cashify sessions failed' };
}
