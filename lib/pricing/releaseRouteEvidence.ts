/** Server-only explicit reviewed route input. No fallback or inferred modes. */
import fs from 'node:fs';
import { z } from 'zod';
import type { WorkbookRouteEvidence } from './teamWorkbookResearchQuoteService';
const mode = z.enum(['ASKED', 'NOT_ASKED', 'UNKNOWN']);
const row = z.object({
  brand: z.string().min(1), model: z.string().min(1), storage: z.string().min(1),
  source: z.literal('VERIFIED_COLLECTOR_TRACE'), status: z.literal('OK'),
  observedAt: z.string().datetime(), evidenceSha256: z.string().regex(/^[a-f0-9]{64}$/),
  semantics: z.object({ warrantyMode: mode, billMode: mode, ageMode: mode }),
  boxMode: mode, chargerMode: mode, sPenMode: mode, eSimMode: mode,
});
export function loadReleaseRouteEvidence(file?: string): readonly WorkbookRouteEvidence[] {
  if (!file) return [];
  const parsed = z.object({ version: z.string().min(1), rows: z.array(row) }).parse(JSON.parse(fs.readFileSync(file, 'utf8')));
  const keys = parsed.rows.map(r => `${r.brand}|${r.model}|${r.storage.replace(/\s+/g, '').toLowerCase()}`);
  if (new Set(keys).size !== keys.length) throw new Error('Duplicate release route evidence identity');
  return parsed.rows;
}
