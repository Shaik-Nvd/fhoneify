/** Pure, fail-closed checks shared by login setup and the research collector. */
export interface FinalQuoteExpectation {
  model: string;
  storage: string;
}

export interface FinalQuoteGate {
  ok: boolean;
  price?: number;
  reason?: string;
}

const AUTH_MARKERS = [
  /login\s*\/\s*signup/i,
  /login to unlock/i,
  /log ?in to continue/i,
  /sign in to your account/i,
  /enter otp/i,
  /verify (your )?mobile number/i,
  /session (has )?expired/i,
  /please log ?in/i,
];

export function hasAuthGate(text: string, url = ''): boolean {
  return AUTH_MARKERS.some((marker) => marker.test(text)) || /\/(login|signin|auth)(\/|$|\?)/i.test(url);
}

const normalized = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** A displayed final quote, not an arbitrary rupee amount or Get Upto headline. */
export function validateFinalQuote(url: string, visibleText: string, expected: FinalQuoteExpectation): FinalQuoteGate {
  if (hasAuthGate(visibleText, url)) return { ok: false, reason: 'authentication gate visible' };
  if (!/\/sell\/quote\/details(?:\?|$|\/)/i.test(url)) {
    return { ok: false, reason: 'not the final quotation details page' };
  }
  const labels = [...visibleText.matchAll(/selling price\s*:/gi)];
  if (labels.length !== 1) return { ok: false, reason: `expected one Selling price label; found ${labels.length}` };
  const label = labels[0];
  const afterLabel = visibleText.slice(label.index! + label[0].length, label.index! + label[0].length + 40);
  const match = afterLabel.match(/^\s*₹\s*([\d,]+)(?![\d,])/);
  if (!match || !/^\d[\d,]*$/.test(match[1])) {
    return { ok: false, reason: 'final price missing or masked' };
  }
  const preceding = normalized(visibleText.slice(Math.max(0, label.index! - 240), label.index));
  const model = normalized(expected.model);
  const storage = normalized(expected.storage);
  if (!model || !preceding.includes(model)) return { ok: false, reason: 'final card model mismatch' };
  if (!storage || !preceding.includes(storage)) return { ok: false, reason: 'final card RAM/storage mismatch' };
  const price = Number(match[1].replace(/,/g, ''));
  if (!Number.isSafeInteger(price) || price <= 0) return { ok: false, reason: 'invalid final price' };
  return { ok: true, price };
}

export function verifyOptionGrid(
  choices: Array<{ text: string; selected: boolean }>,
  expectedSelected: string[]
): Array<{ questionText: string; selectedAnswer: string }> {
  if (!choices.length || choices.some((choice) => !choice.text.trim()) ||
    new Set(choices.map((choice) => choice.text.toLowerCase())).size !== choices.length) {
    throw new Error('questionnaire option grid could not be fully identified');
  }
  for (const wanted of expectedSelected) {
    if (choices.filter((choice) => choice.text.toLowerCase() === wanted.toLowerCase()).length !== 1) {
      throw new Error('requested questionnaire option was not visible');
    }
  }
  return choices.map((choice) => {
    const expected = expectedSelected.some((wanted) => wanted.toLowerCase() === choice.text.toLowerCase());
    if (choice.selected !== expected) throw new Error('questionnaire option state did not match requested answer');
    return { questionText: choice.text, selectedAnswer: choice.selected ? 'Selected' : 'Not selected' };
  });
}
