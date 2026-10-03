/** OnePlus display-fault research only (verified 2026-10-02 collector blocks).
 * Exact variants, exact routes and single measured display faults; the active
 * OnePlus engine and every other condition remain unchanged. */
import fixture from '../../scripts/pricing/fixtures/oneplus-display-verified-development-2026-10-02.json';
import { calculateVerifiedWorkbookCandidate, type WorkbookEvidenceInput } from './xiaomiWorkbookEvidenceCandidate';

export const ONEPLUS_DISPLAY_CANDIDATE_VERSION = fixture.version;
export const ONEPLUS_DISPLAY_SPECS = fixture.specs;
export function calculateOnePlusDisplayEvidenceCandidate(input: WorkbookEvidenceInput) {
  return calculateVerifiedWorkbookCandidate(fixture.specs, ONEPLUS_DISPLAY_CANDIDATE_VERSION, input);
}
