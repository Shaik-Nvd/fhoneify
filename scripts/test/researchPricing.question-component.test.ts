import assert from 'node:assert/strict';
import test, { before, after } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';
import { inspectDefectQuestion, verifyDefectSelection } from '../pricing-research/defectQuestion';

const fixture = fs.readFileSync(path.join(__dirname, 'fixtures/cashify/screen-detail.html'), 'utf8');
const requested = 'More than 2 scratches on screen';
let browser: Browser;
before(async () => { browser = await chromium.launch({ headless: true }); });
after(async () => { await browser?.close(); });
async function withFixture(check: (page: Page) => Promise<void>, html = fixture) {
  const page = await browser.newPage();
  await page.route('**/*', (route) => route.abort());
  try { await page.setContent(html); await check(page); } finally { await page.close(); }
}

test('captured live screen fixture reproduces the old option-as-heading failure', async () => {
  await withFixture(async (page) => {
    const option = await page.$(`text="${requested}"`);
    assert.ok(option);
    const oldLabel = await option.evaluate((element) => {
      let node: Element | null = element;
      for (let hop = 0; hop < 8 && node; hop++) {
        const container: Element | null = node.parentElement;
        if (!container) break;
        for (const leaf of Array.from(container.querySelectorAll('*')).filter((n) => n.children.length === 0)) {
          const text = (leaf.textContent || '').trim().replace(/\s+/g, ' ');
          if (text.length >= 4 && text.length <= 220 && !/^(yes|no)$/i.test(text) && /[a-zA-Z]/.test(text)) return text;
        }
        node = container;
      }
      return null;
    });
    assert.equal(oldLabel, requested);
    const actual = await option.evaluate(inspectDefectQuestion);
    assert.equal(actual.ok, true, actual.reason ?? '');
    assert.equal(actual.questionText, 'Screen Physical Condition');
    assert.equal(actual.options.length, 4);
    assert.deepEqual(actual.options.filter((choice) => choice.selected), [{ text: requested, selected: true }]);
    verifyDefectSelection(actual, requested);
    assert.throws(() => verifyDefectSelection(actual, '1-2 scratches on screen'), /selection/);
  });
});

test('missing, ambiguous and option-text headings reject without accepting nearby text', async () => {
  for (const replacement of ['', '<div class="body3">Another heading</div>Screen Physical Condition', requested]) {
    await withFixture(async (page) => {
      const option = await page.locator('.caption3').filter({ hasText: requested }).elementHandle();
      assert.ok(option);
      const actual = await option.evaluate(inspectDefectQuestion);
      assert.equal(actual.ok, false);
      assert.match(actual.reason!, /heading/);
    }, fixture.replace('>Screen Physical Condition</div>', `>${replacement}</div>`));
  }
});

test('separate body scratch and dent groups preserve their own heading and options', async () => {
  // Body variation of the captured structure, not a claim of live body evidence.
  const scratch = fixture.replace('Screen Physical Condition', 'Body Scratches')
    .replace('Screen cracked/ glass broken', 'No scratches')
    .replace('Chipped/cracked outside display area', '1-2 scratches')
    .replaceAll(requested, 'More than 2 scratches');
  const dent = fixture.replace('Screen Physical Condition', 'Body Dents')
    .replace('Screen cracked/ glass broken', 'Major dents')
    .replace('Chipped/cracked outside display area', '1-2 minor dents')
    .replaceAll(requested, 'No dents');
  await withFixture(async (page) => {
    await page.locator('div.flex.flex-row.flex-wrap.w-full').evaluateAll((grids) => {
      for (const grid of grids) grid.lastElementChild?.remove();
    });
    for (const [text, heading] of [['More than 2 scratches', 'Body Scratches'], ['No dents', 'Body Dents']]) {
      const option = await page.$(`text="${text}"`);
      assert.ok(option);
      const actual = await option.evaluate(inspectDefectQuestion);
      assert.equal(actual.ok, true, actual.reason ?? '');
      assert.equal(actual.questionText, heading);
      assert.equal(actual.options.length, 3);
      verifyDefectSelection(actual, text);
    }
    await page.locator('.body3').first().evaluate((heading) => heading.remove());
    const option = await page.$('text="More than 2 scratches"');
    assert.ok(option);
    assert.equal((await option.evaluate(inspectDefectQuestion)).ok, false);
    await page.locator('div.flex.flex-row.flex-wrap.w-full').first().evaluate((grid) => {
      grid.parentElement!.parentElement!.firstElementChild!.insertAdjacentHTML('beforeend',
        '<div class="body3">Body Scratches</div><div class="body3">Conflicting body heading</div>');
    });
    const ambiguous = await option.evaluate(inspectDefectQuestion);
    assert.equal(ambiguous.ok, false);
    assert.match(ambiguous.reason!, /heading/);
  }, scratch + dent);
});

test('contradictory and multiple selected states reject', async () => {
  await withFixture(async (page) => {
    const option = await page.$(`text="${requested}"`);
    assert.ok(option);
    await page.locator('div.cursor-pointer').first().evaluate((card) => {
      card.classList.remove('border-surface-light-3'); card.classList.add('border-primary');
      const panel = card.querySelector('.flex-1')!;
      panel.classList.remove('bg-gray-50'); panel.classList.add('border-primary', 'bg-primary');
    });
    assert.equal((await option.evaluate(inspectDefectQuestion)).ok, false);
  });
  await withFixture(async (page) => {
    const option = await page.$(`text="${requested}"`);
    assert.ok(option);
    await option.evaluate((label) => label.closest('.cursor-pointer')!.classList.remove('border-primary'));
    assert.equal((await option.evaluate(inspectDefectQuestion)).ok, false);
  });
  await withFixture(async (page) => {
    const option = await page.$(`text="${requested}"`);
    assert.ok(option);
    await option.evaluate((label) => {
      const card = label.closest('.cursor-pointer')!;
      card.classList.remove('border-primary'); card.classList.add('border-surface-light-3');
      const panel = card.querySelector('.flex-1')!;
      panel.classList.remove('border-primary', 'bg-primary'); panel.classList.add('bg-gray-50');
    });
    const actual = await option.evaluate(inspectDefectQuestion);
    assert.equal(actual.ok, true);
    assert.throws(() => verifyDefectSelection(actual, requested), /selection/);
  });
});

test('sanitized failure evidence excludes attributes, assets and surrounding private content', async () => {
  await withFixture(async (page) => {
    await page.locator('.body3').evaluate((heading) => {
      heading.setAttribute('data-token', 'private-test-token');
      heading.parentElement!.insertAdjacentHTML('beforeend', '<input value="private-test-value"><img src="https://invalid/token"><script>privateScript</script>');
    });
    const option = await page.$(`text="${requested}"`);
    assert.ok(option);
    const actual = await option.evaluate(inspectDefectQuestion);
    assert.equal(actual.ok, true);
    assert.ok(actual.sanitizedHtml);
    assert.doesNotMatch(actual.sanitizedHtml, /private|token|src=|<input|<script|<img|surrounding-account/);
    assert.match(actual.sanitizedHtml, /Screen Physical Condition/);
  }, '<div>surrounding-account</div>' + fixture);
});
