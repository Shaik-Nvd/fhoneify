/** A currency amount is usable only when explicitly labelled final Selling price. */
export function cashifyBlockingTextReason(text: string): string | null {
  return /\bcaptcha\b|verify (?:that )?you are human|access denied|session (?:has )?expired|sign[ -]?in to continue|log[ -]?in to continue|authentication required|too many requests|rate limit(?:ed| exceeded)?/i.test(text)
    ? 'Authentication, CAPTCHA or rate limit detected; stop collection' : null;
}

export function parseFinalSellingPrice(text: string): number | null {
  if (cashifyBlockingTextReason(text)) return null;
  const matches=[...text.matchAll(/(?:^|\n)\s*Selling\s+price\s*[:\-]?\s*(?:\n\s*)?₹\s*([\d,]+)(?:\.00)?\s*(?=\n|$)/gi)];
  if(matches.length!==1)return null;
  const token=matches[0][1];
  if(!/^(?:\d+|\d{1,3}(?:,\d{2})*,\d{3}|\d{1,3}(?:,\d{3})+)$/.test(token))return null;
  const price=Number(token.replace(/,/g,''));
  return Number.isSafeInteger(price)&&price>0?price:null;
}
export function requireBooleanAnswer(answers: Record<string,unknown>, field: string): boolean {
  if(typeof answers[field]!=='boolean')throw new Error(`Explicit ${field} answer required`);
  return answers[field] as boolean;
}
export function requireEsimAnswer(value: unknown): 'Single eSIM'|'Dual eSIM' {
  if(value!=='Single eSIM'&&value!=='Dual eSIM')throw new Error('Explicit eSIM answer required');
  return value;
}

/** Ignore third-party/assets errors; monitor questionnaire documents and API responses at every stage. */
export function cashifyResponseBlockReason(url: string, status: number, resourceType: string): string | null {
  if (![401,403,429].includes(status) || !['document','xhr','fetch'].includes(resourceType)) return null;
  let host: string;
  try { host = new URL(url).hostname.toLowerCase(); } catch { return null; }
  return host === 'cashify.in' || host.endsWith('.cashify.in')
    ? `Authentication or blocked Cashify response HTTP ${status}; stop collection` : null;
}

/** The same listener/request boundary is used by the walker and offline tests. */
export async function installCashifyCollectionGuards(page: Pick<import('playwright').Page, 'on' | 'route'>) {
  let reason: string | null = null;
  page.on('response', response => {
    reason ??= cashifyResponseBlockReason(response.url(), response.status(), response.request().resourceType());
  });
  await page.route('**/*', route => {
    if (reason || route.request().resourceType() === 'media') route.abort();
    else route.continue();
  });
  return { get reason() { return reason; } };
}
