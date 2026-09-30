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
import fs from 'fs';
import path from 'path';
import {
  getCashifyBrowser,
  getCashifySessionFiles,
  resolveHeadless,
} from '../../server/modules/quote/cashifyScraper';
import type { CashifyResearchAnswers } from './profiles';
import { hasAuthGate, validateFinalQuote, verifyOptionGrid } from './quoteEvidence';

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
  answersSelected?: { requested: CashifyResearchAnswers; observed: QuestionAnswerRecord[]; questionnaireFingerprint?: string };
  finalQuote?: number;
  unsupportedReason?: string;
  errorReason?: string;
  questionnaireFingerprint?: string;
  evidence?: { screenshotPath: string; screenshotSha256: string; capturedAt: string };
}

export interface CollectDeviceInput {
  brand: string;
  model: string;
  storage: string;
  /** Curated Cashify URL from the catalog, when known - preferred over a
   * generated slug, same precedence scrapeCashifyPrice() gives it. */
  cashifyUrl?: string;
}

/** Reports each session file's on-disk validity without any network call -
 * used by run-batch.ts to print session-pool health before starting, and by
 * a standalone `research:session-status` check. */
export function describeSessionPool(sessionFileName?: string): Array<{ file: string; valid: boolean; reason: string }> {
  return getCashifySessionFiles()
    .filter((f) => !sessionFileName || path.basename(f) === sessionFileName)
    .map((f) => ({ file: f, ...isSessionLikelyValid(f) }));
}

export interface CollectOptions {
  /** Same default-resolution pattern as resolveHeadless(): the caller states
   * its own default, and CASHIFY_SCRAPER_HEADED=true still forces a visible
   * window for manual CAPTCHA solving. Defaults to headless=true - this is a
   * batch research tool, not the interactive quote path. */
  headless?: boolean;
  /** Per-action timeout in ms. */
  actionTimeoutMs?: number;
  /** Local, ignored artifact directory; a COMPLETED row requires a screenshot. */
  evidenceDir?: string;
  evidenceId?: string;
  /** A fresh, explicitly selected session; never rotate through exposed historical files. */
  sessionFileName?: string;
  /** Matrix-only gate: reject any missing or mismatched planned answer before
   * reading/storing a final price. Legacy A/B/C callers leave this unset. */
  verifyPlannedAnswers?: (observed: QuestionAnswerRecord[]) => { status: string; reason: string | null };
}

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

function safeCollectorFailure(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  const networkCode = message.match(/net::(ERR_[A-Z_]+)/)?.[1];
  if (networkCode) return `Cashify navigation failed: ${networkCode}`;
  if (/timeout/i.test(message)) return 'Cashify questionnaire timed out';
  const known = [
    'requested defect option not visible', 'requested hardware option not visible',
    'requested charger option not visible', 'requested box option not visible',
    'requested mobile-age answer was not visible',
    'question label could not be verified', 'selected answer state could not be verified',
    'questionnaire option grid could not be fully identified',
    'questionnaire option state did not match requested answer',
  ];
  return known.find((reason) => message.includes(reason)) ?? 'questionnaire action failed (selector or navigation)';
}

/**
 * A Cashify auth-cookie expiry is only a local preflight hint. Even a live
 * cookie does not prove authentication; every completed observation must
 * pass the live final quotation gate.
 *
 * Deliberately local-only: this never deletes or rewrites the session files
 * on disk. They are shared with the production on-demand scraper
 * (server/modules/quote/cashifyScraper.ts) via the same cashify-sessions/
 * directory, and AGENTS.md says not to touch that path - pruning files here
 * would be exactly that.
 */
export function isSessionLikelyValid(sessionFile: string): { valid: boolean; reason: string } {
  try {
    const data = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
    const cookies: Array<{ name: string; domain?: string; expires?: number }> = data.cookies ?? [];
    const nowSec = Date.now() / 1000;

    const authCookie = cookies.find((c) => c.name === '_cs__user_auth__v1');
    if (authCookie) {
      if (typeof authCookie.expires !== 'number' || authCookie.expires <= 0) {
        return { valid: true, reason: 'auth cookie has no expiry (session cookie) - assume valid' };
      }
      return authCookie.expires > nowSec
        ? { valid: true, reason: `auth cookie valid until ${new Date(authCookie.expires * 1000).toISOString()}` }
        : { valid: false, reason: `auth cookie expired at ${new Date(authCookie.expires * 1000).toISOString()}` };
    }

    return { valid: false, reason: 'auth cookie missing; live login is not established' };
  } catch (e: any) {
    return { valid: false, reason: 'could not read or parse session file' };
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
  return hasAuthGate(text, page.url());
}

async function captureFinalCard(page: Page, device: CollectDeviceInput, evidenceDir: string, evidenceId?: string) {
  const clip = await page.evaluate(({ model, storage }) => {
    const elements = document.querySelectorAll('*');
    for (const element of elements) {
      const label = ((element as HTMLElement).innerText || '').trim();
      if (!/^Selling price\s*:?$/i.test(label)) continue;
      let container = element.parentElement;
      for (let hop = 0; hop < 7 && container; hop++, container = container.parentElement) {
        const text = (container as HTMLElement).innerText || '';
        if (!text.toLowerCase().includes(model.toLowerCase()) || !text.toLowerCase().includes(storage.toLowerCase())) continue;
        if (!/Selling price\s*:?\s*₹\s*[\d,]+/i.test(text)) continue;
        const rect = container.getBoundingClientRect();
        if (rect.width > 1100 || rect.height > 600 || rect.width < 200 || rect.height < 80) return null;
        return { x: Math.max(0, rect.x), y: Math.max(0, rect.y), width: rect.width, height: rect.height };
      }
    }
    return null;
  }, { model: device.model, storage: device.storage });
  if (!clip) return null;
  fs.mkdirSync(evidenceDir, { recursive: true });
  const safeId = evidenceId?.replace(/[^a-zA-Z0-9-]/g, '') || crypto.randomUUID();
  const screenshotPath = path.join(evidenceDir, `final-${safeId}-${Date.now()}.png`);
  await page.screenshot({ path: screenshotPath, clip });
  const screenshotSha256 = crypto.createHash('sha256').update(fs.readFileSync(screenshotPath)).digest('hex');
  return { screenshotPath, screenshotSha256, capturedAt: new Date().toISOString() };
}

async function detectCaptcha(page: Page): Promise<boolean> {
  const text = await pageVisibleText(page);
  if (CAPTCHA_MARKERS.some((re) => re.test(text))) return true;
  const frame = await page.$('iframe[src*="captcha" i], iframe[title*="captcha" i]');
  return !!frame;
}

class AuthGateError extends Error {}

async function assertNoChallenge(page: Page): Promise<void> {
  if (await detectAuthRequired(page)) throw new AuthGateError('login prompt appeared during questionnaire');
  if (await detectCaptcha(page)) throw new AuthGateError('CAPTCHA appeared during questionnaire');
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
  await assertNoChallenge(ctx.page);
  const label = await readQuestionLabel(ctx.page, handle);
  if (!label || label.toLowerCase() === selectedAnswer.toLowerCase()) {
    throw new Error('question label could not be verified');
  }
  await handle.click({ timeout: ctx.actionTimeoutMs });
  await assertNoChallenge(ctx.page);
  const selected = await handle.evaluate((el: Element) => {
    let node: Element | null = el;
    for (let hop = 0; hop < 3 && node; hop++, node = node.parentElement) {
      const item = node as HTMLElement;
      if (item.getAttribute('aria-checked') === 'true' || item.getAttribute('aria-selected') === 'true' ||
        (item instanceof HTMLInputElement && item.checked) ||
        (item.classList.contains('border-primary') && !!item.querySelector('.bg-primary')) ||
        (item.classList.contains('border-primary') && item.classList.contains('bg-primary'))) return true;
    }
    return false;
  }).catch(() => false);
  if (!selected) throw new Error('selected answer state could not be verified');
  ctx.questions.push({ questionText: label, selectedAnswer });
}

/** Cashify's defect, hardware and accessory grids expose each choice as a
 * card. Read every visible card, including the explicitly unselected ones. */
async function captureGridVector(ctx: WalkContext, expectedSelected: string[]): Promise<void> {
  const choices = await ctx.page.locator('div.flex.flex-col.items-center.w-full.flex-1').evaluateAll((elements) =>
    elements.map((el) => ({
      text: ((el as HTMLElement).innerText || '').replace(/\s+/g, ' ').trim(),
      selected: el.classList.contains('bg-primary') && el.classList.contains('border-primary'),
    })));
  ctx.questions.push(...verifyOptionGrid(choices, expectedSelected));
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

const YES_NO_QUESTION_PATTERNS: Record<string, RegExp> = {
  calls: /make and receive calls/i,
  touch: /touch(?:screen| screen)?(?: is)? working|touch functionality/i,
  originalScreen: /(?:original (?:screen|display)|(?:screen|display) original)/i,
  warranty: /under manufacturer warranty/i,
  validBill: /gst valid bill/i,
};

export function classifyYesNoQuestion(question: string): keyof CashifyResearchAnswers | null {
  const matches = YES_NO_FIELDS.filter((field) => YES_NO_QUESTION_PATTERNS[field].test(question));
  return matches.length === 1 ? matches[0] : null;
}

async function associatedYesNoQuestion(handle: ElHandle): Promise<string | null> {
  return handle.evaluate((el: Element) => {
    let node: Element | null = el.parentElement;
    for (let hop = 0; hop < 8 && node; hop++, node = node.parentElement) {
      const text = ((node as HTMLElement).innerText || '').replace(/\s+/g, ' ').trim();
      // Instructions may themselves say "Yes" and "No", so counting words
      // confuses a real question with the answer controls. The first question
      // sentence is stable even when help text and option order change.
      const question = text.match(/^(.{4,220}?\?)/)?.[1];
      if (question && text.length <= 500) return question.trim();
    }
    return null;
  }).catch(() => null);
}

async function assertYesNoSelected(handle: ElHandle): Promise<void> {
  const selected = await handle.evaluate((el: Element) => {
    const choice = el.parentElement;
    return !!choice?.classList.contains('border-primary') &&
      !!choice.querySelector('.bg-primary');
  }).catch(() => false);
  if (!selected) throw new Error('Yes/No answer selection could not be verified');
}

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
  const allSessionFiles = getCashifySessionFiles().filter((f) =>
    !opts.sessionFileName || path.basename(f) === opts.sessionFileName);
  if (allSessionFiles.length === 0) {
    return { status: 'FAILED', errorReason: 'no Cashify session files available (run setup-cashify first)' };
  }

  // Skip sessions the file itself already says are dead - no network call
  // spent confirming what the cookie's own expiry already tells us.
  const checked = allSessionFiles.map((f) => ({ file: f, ...isSessionLikelyValid(f) }));
  let sessionFiles = checked.filter((c) => c.valid).map((c) => c.file);
  if (sessionFiles.length === 0) {
    const reasons = checked.map((c) => `${c.file}: ${c.reason}`).join('; ');
    return {
      status: 'AUTH_REQUIRED',
      errorReason: `every session in the pool is pre-confirmed expired (no network request attempted): ${reasons}`,
    };
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

      // PAGE 1: associate each pair with its *visible question*, never its
      // position. An extra/missing/reordered question is not guessed.
      const yesBtns = await page.$$('text="Yes"');
      const noBtns = await page.$$('text="No"');
      if (yesBtns.length === 0 || yesBtns.length !== noBtns.length) {
        return { status: 'UNSUPPORTED', sourceUrl: deviceUrl, unsupportedReason: 'Yes/No question pairs are incomplete or absent' };
      }
      const mapped = new Map<keyof CashifyResearchAnswers, { text: string; yes: ElHandle; no: ElHandle }>();
      for (const yes of yesBtns) {
        const text = await associatedYesNoQuestion(yes);
        const field = text ? classifyYesNoQuestion(text) : null;
        if (!text || !field || mapped.has(field)) {
          return { status: 'UNSUPPORTED', sourceUrl: deviceUrl, unsupportedReason: 'unrecognized or duplicate Yes/No question label' };
        }
        const matchingNo: ElHandle[] = [];
        for (const no of noBtns) {
          if ((await associatedYesNoQuestion(no)) === text) matchingNo.push(no);
        }
        if (matchingNo.length !== 1) {
          return { status: 'UNSUPPORTED', sourceUrl: deviceUrl, unsupportedReason: 'Yes/No options could not be paired by question label' };
        }
        mapped.set(field, { text, yes, no: matchingNo[0] });
      }
      if (!mapped.has('calls')) {
        return { status: 'UNSUPPORTED', sourceUrl: deviceUrl, unsupportedReason: 'required calls question not found' };
      }
      let authDuringQuestion = false;
      for (const field of YES_NO_FIELDS) {
        const pair = mapped.get(field);
        if (!pair) continue;
        const selectedAnswer = answers[field] === false ? 'No' : 'Yes';
        assertSafeToSelect(selectedAnswer);
        const choice = selectedAnswer === 'No' ? pair.no : pair.yes;
        await choice.click({ timeout: actionTimeoutMs });
        await assertYesNoSelected(choice);
        questions.push({ questionText: pair.text, selectedAnswer });
        if (await detectAuthRequired(page)) {
          lastAuthRequired = { status: 'AUTH_REQUIRED', sourceUrl: deviceUrl, questionsAsked: questions, errorReason: 'login prompt during Yes/No questions' };
          authDuringQuestion = true;
          break;
        }
      }
      if (authDuringQuestion) continue;

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
      if (!continue1) throw new Error('questionnaire page did not offer Continue');
      await continue1.click();
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
          if (!el) throw new Error('requested defect option not visible');
          await assertNoChallenge(page);
          await el.click({ timeout: actionTimeoutMs });
        }
      }
      await captureGridVector(ctx, (answers.defects ?? []).map((id) => DEFECT_CHECKBOX_TEXT[id]));
      const continue2 = await page.$('text="Continue"');
      if (!continue2) throw new Error('defect page did not offer Continue');
      await continue2.click();
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
        if (!cont) throw new Error('defect detail page did not offer Continue');
        await cont.click();
        await page.waitForTimeout(1500);
      }

      // PAGE 3: Functional/hardware defects.
      for (const hwId of answers.hardware ?? []) {
        const text = HARDWARE_TEXT[hwId];
        if (!text) throw new Error('unrecognized requested hardware option');
        const el = await page.$(`text="${text}"`);
        if (!el) throw new Error('requested hardware option not visible');
        await assertNoChallenge(page);
        await el.click({ timeout: actionTimeoutMs });
      }
      await captureGridVector(ctx, (answers.hardware ?? []).map((id) => HARDWARE_TEXT[id]));
      const continue3 = await page.$('text="Continue"');
      if (!continue3) throw new Error('hardware page did not offer Continue');
      await continue3.click();
      await page.waitForTimeout(1500);

      // PAGE 4: Accessories.
      if (answers.accessories?.includes('charger')) {
        const el = await page.$('text=Original Charger of device');
        if (!el) throw new Error('requested charger option not visible');
        await assertNoChallenge(page);
        await el.click({ timeout: actionTimeoutMs });
      }
      if (answers.accessories?.includes('box')) {
        const el = await page.$('text=Box with same IMEI');
        if (!el) throw new Error('requested box option not visible');
        await assertNoChallenge(page);
        await el.click({ timeout: actionTimeoutMs });
      }
      await captureGridVector(ctx, [
        ...(answers.accessories?.includes('charger') ? ['Original Charger of Device'] : []),
        ...(answers.accessories?.includes('box') ? ['Original Box with same IMEI'] : []),
      ]);
      const continue4 = await page.$('text="Continue"');
      if (!continue4) throw new Error('accessory page did not offer Continue');
      await continue4.click();
      await page.waitForTimeout(1500);

      // PAGE 5: Mobile age only when Cashify actually displays that question.
      // Requested warranty/bill values do not imply the question exists.
      const agePageTitle = await page.$('text=What is your mobile age?');
      if (agePageTitle) {
        const ageText = AGE_TEXT[answers.mobileAge ?? 'above11'] ?? AGE_TEXT.above11;
        const ageBtn = await page.$(`text="${ageText}"`);
        if (!ageBtn) throw new Error('requested mobile-age answer was not visible');
        await recordAndClick(ctx, ageBtn, ageText);
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

      if (opts.verifyPlannedAnswers) {
        const verdict = opts.verifyPlannedAnswers(questions);
        if (verdict.status !== 'COMPLETED') {
          return { status: 'UNSUPPORTED', sourceUrl: deviceUrl,
            originalGetUptoReference: originalGetUptoReference ?? undefined,
            questionsAsked: questions, answersSelected: { requested: answers, observed: questions },
            unsupportedReason: verdict.reason ?? 'planned answer vector was not verified' };
        }
      }

      const fingerprint = stableFingerprint(questions);
      const expected = { model: device.model, storage: spacedStorage };
      const first = validateFinalQuote(page.url(), await pageVisibleText(page), expected);
      await page.waitForTimeout(1200); // catches delayed login overlays and unstable prices
      const second = validateFinalQuote(page.url(), await pageVisibleText(page), expected);
      if (await detectAuthRequired(page)) {
        lastAuthRequired = { status: 'AUTH_REQUIRED', sourceUrl: deviceUrl, questionsAsked: questions, errorReason: 'login modal at final-price gate' };
        continue;
      }
      if (!first.ok || !second.ok || first.price !== second.price) {
        return {
          status: 'FAILED', sourceUrl: deviceUrl,
          originalGetUptoReference: originalGetUptoReference ?? undefined,
          questionsAsked: questions, answersSelected: { requested: answers, observed: questions },
          errorReason: `final quotation rejected: ${second.reason ?? first.reason ?? 'unstable price'}`,
          questionnaireFingerprint: fingerprint,
        };
      }
      const evidence = await captureFinalCard(page, { ...device, storage: spacedStorage }, opts.evidenceDir ?? path.resolve('research-evidence'), opts.evidenceId);
      if (!evidence) {
        return { status: 'FAILED', sourceUrl: deviceUrl, questionsAsked: questions, answersSelected: { requested: answers, observed: questions },
          errorReason: 'could not capture a cropped final card showing model, variant and Selling price', questionnaireFingerprint: fingerprint };
      }
      const last = validateFinalQuote(page.url(), await pageVisibleText(page), expected);
      if (!last.ok || last.price !== first.price) {
        return { status: 'AUTH_REQUIRED', sourceUrl: deviceUrl, questionsAsked: questions,
          errorReason: 'final quotation changed or authentication gate appeared after screenshot' };
      }
      return {
        status: 'COMPLETED', sourceUrl: page.url(),
        originalGetUptoReference: originalGetUptoReference ?? undefined,
        questionsAsked: questions, answersSelected: { requested: answers, observed: questions, questionnaireFingerprint: fingerprint },
        finalQuote: first.price, questionnaireFingerprint: fingerprint, evidence,
      };
    } catch (error: any) {
      if (error instanceof AuthGateError) {
        lastAuthRequired = { status: 'AUTH_REQUIRED', errorReason: error.message };
      } else {
        // Playwright exceptions may include page text and URLs. Neither
        // belongs in a database errorReason or CI log.
        lastError = safeCollectorFailure(error);
      }
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
