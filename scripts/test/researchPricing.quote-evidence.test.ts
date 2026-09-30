import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyYesNoQuestion } from '../pricing-research/collector';
import { hasAuthGate, validateFinalQuote, verifyOptionGrid } from '../pricing-research/quoteEvidence';

const expected = { model: 'POCO C3', storage: '4 GB/64 GB' };
const url = 'https://www.cashify.in/sell/quote/details?qid=example';
const finalText = 'POCO C3 (4 GB/64 GB)\nSelling price :\n₹2,910\nRecalculate';

test('only a stable, unmasked final quotation for the requested variant passes', () => {
  assert.deepEqual(validateFinalQuote(url, finalText, expected), { ok: true, price: 2910 });
  assert.equal(validateFinalQuote(url, finalText, { ...expected, storage: '6 GB/64 GB' }).ok, false);
  assert.equal(validateFinalQuote(url, finalText, { ...expected, model: 'POCO C31' }).ok, false);
  assert.equal(validateFinalQuote('https://www.cashify.in/sell-old-mobile-phone/poco-c3', finalText, expected).ok, false);
  assert.equal(validateFinalQuote(url, 'Get Upto ₹4,300\n' + finalText.replace('₹2,910', '₹XX,XXX'), expected).ok, false);
  assert.equal(validateFinalQuote(url, 'Get Upto ₹4,300', expected).ok, false);
  assert.equal(validateFinalQuote(url, finalText + '\nSelling price: ₹3,000', expected).ok, false);
});

test('late login modal and OTP gate invalidate even a visible underlying number', () => {
  assert.equal(hasAuthGate('Login/Signup\nLogin to unlock the best price'), true);
  assert.equal(validateFinalQuote(url, finalText + '\nLogin/Signup\nEnter OTP', expected).ok, false);
});

test('Yes/No questions are identified by labels, never positional order', () => {
  assert.equal(classifyYesNoQuestion('Are you able to make and receive calls?'), 'calls');
  assert.equal(classifyYesNoQuestion('Is the touch screen working?'), 'touch');
  assert.equal(classifyYesNoQuestion('Is this the original screen?'), 'originalScreen');
  assert.equal(classifyYesNoQuestion("Is your phone's screen original?"), 'originalScreen');
  assert.equal(classifyYesNoQuestion('Is the phone under manufacturer warranty?'), 'warranty');
  assert.equal(classifyYesNoQuestion('Do you have GST valid bill?'), 'validBill');
  assert.equal(classifyYesNoQuestion('Unfamiliar question'), null);
});

test('option grids record selected and unselected answers and reject uncertain states', () => {
  const choices = [{ text: 'Screen damaged', selected: false }, { text: 'Original Charger', selected: true }];
  assert.deepEqual(verifyOptionGrid(choices, ['Original Charger']), [
    { questionText: 'Screen damaged', selectedAnswer: 'Not selected' },
    { questionText: 'Original Charger', selectedAnswer: 'Selected' },
  ]);
  assert.throws(() => verifyOptionGrid(choices, ['Screen damaged']));
  assert.throws(() => verifyOptionGrid(choices, ['Missing option']));
  assert.throws(() => verifyOptionGrid([choices[0], choices[0]], []));
});
