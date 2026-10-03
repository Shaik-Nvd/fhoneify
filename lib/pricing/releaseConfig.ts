/** Where the API learns whether release-candidate pricing is active.
 *
 * Precedence: an explicit PRICING_RELEASE_CANDIDATE=on|off environment value
 * (immediate host-side switch, e.g. for rollback), else the reviewed,
 * committed config/pricing-release.json, else legacy. Any read or parse
 * failure is legacy: the release never activates by accident. */
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

export const PRICING_RELEASE_CONFIG_FILE = 'config/pricing-release.json';
const fileSchema = z.object({
  releaseCandidate: z.boolean(),
  routeEvidenceFile: z.string().min(1).optional(),
  approvedBy: z.string().optional(),
  note: z.string().optional(),
});

export interface PricingReleaseConfig {
  mode: 'legacy' | 'release-candidate';
  /** Absolute path, or null: no route evidence (every verified route then inspects). */
  routeEvidenceFile: string | null;
  source: 'env' | 'file' | 'default';
  error?: string;
}

export function resolvePricingReleaseConfig(env: Record<string, string | undefined> = process.env, root = process.cwd()): PricingReleaseConfig {
  const resolve = (p: string | undefined | null) => (p ? path.resolve(root, p) : null);
  const envSwitch = env.PRICING_RELEASE_CANDIDATE?.trim().toLowerCase();
  let file: z.infer<typeof fileSchema> | null = null;
  let error: string | undefined;
  try {
    file = fileSchema.parse(JSON.parse(fs.readFileSync(path.join(root, PRICING_RELEASE_CONFIG_FILE), 'utf8')));
  } catch (err: any) {
    error = `${PRICING_RELEASE_CONFIG_FILE}: ${err?.code === 'ENOENT' ? 'missing' : 'invalid'}`;
  }
  const evidence = resolve(env.PRICING_RELEASE_ROUTE_EVIDENCE_FILE || file?.routeEvidenceFile);
  if (envSwitch === 'on') return { mode: 'release-candidate', routeEvidenceFile: evidence, source: 'env', error };
  if (envSwitch === 'off') return { mode: 'legacy', routeEvidenceFile: null, source: 'env', error };
  if (file) return { mode: file.releaseCandidate ? 'release-candidate' : 'legacy', routeEvidenceFile: file.releaseCandidate ? evidence : null, source: 'file' };
  return { mode: 'legacy', routeEvidenceFile: null, source: 'default', error };
}
