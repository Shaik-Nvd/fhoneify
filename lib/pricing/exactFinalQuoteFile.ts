/** Loads a reviewed, sanitized collector manifest. Never accepts data from public quote requests. */
import fs from 'node:fs';
import { z } from 'zod';
import { createExactFinalQuoteIndex } from './exactFinalQuote';
const mode=z.enum(['ASKED','NOT_ASKED','UNKNOWN']);
const evidence=z.object({id:z.string().min(1).max(200),brand:z.string().min(1).max(100),model:z.string().min(1).max(150),storage:z.string().min(1).max(100),
 getUpto:z.number().int().positive(),sellingPrice:z.number().int().positive(),observedAt:z.string().datetime(),screenshotSha256:z.string().regex(/^[a-f0-9]{64}$/),
 route:z.object({warranty:mode,validBill:mode,mobileAge:mode,eSim:mode,box:mode,charger:mode,sPen:mode}),diagnostics:z.unknown(),
 provenance:z.object({screenshotVerified:z.boolean(),planMatched:z.boolean(),routeComplete:z.boolean(),source:z.string().min(1),role:z.string().min(1)})});
export function loadExactFinalQuoteFile(file:string) {
 const parsed=z.object({version:z.literal('exact-final-quote-evidence/1'),rows:z.array(evidence).max(100000)}).parse(JSON.parse(fs.readFileSync(file,'utf8')));
 return createExactFinalQuoteIndex(parsed.rows);
}
