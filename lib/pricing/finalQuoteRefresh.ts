/** Single-worker, paced final-quote collection. No retries or session rotation; every attempt is reserved first. */
import type { ExactFinalQuoteEvidence } from './exactFinalQuote';
export type RefreshJob = { key: string; priority: number; device: {brand:string;model:string;storage:string}; diagnostics: unknown };
export interface AttemptLedger {
  /** Must atomically persist the reservation and reject when the campaign ceiling is exhausted. */
  reserve(job: RefreshJob, ceiling: number): Promise<{attempt:number}>;
  lastStartTime?(): Promise<number | null>;
  reservedJobKeys?(): Promise<readonly string[]>;
  finish(attempt: number, outcome: 'ACCEPTED' | 'REJECTED' | 'FAILED', detail: string): Promise<void>;
}
export class CashifyCollectionBlocked extends Error {}
export async function refreshFinalQuotes<T extends { id: string } = ExactFinalQuoteEvidence>(options: {
  jobs: readonly RefreshJob[]; authorizedAttempts: number; minStartIntervalMs: number;
  ledger: AttemptLedger; fetch: (job: RefreshJob) => Promise<T>;
  accept: (job: RefreshJob, evidence: T) => Promise<void>;
  now?:()=>number; wait?:(ms:number)=>Promise<void>;
}) {
  if (!Number.isSafeInteger(options.authorizedAttempts) || options.authorizedAttempts < 0) throw new Error('Explicit nonnegative campaign budget required');
  if (options.authorizedAttempts === 0) return { attempted:0, accepted:0, failed:0, stopped:'BUDGET_EXHAUSTED' };
  if (!Number.isSafeInteger(options.minStartIntervalMs) || options.minStartIntervalMs < 30000) throw new Error('At least 30 seconds between attempt starts required');
  const now=options.now??Date.now, wait=options.wait??(ms=>new Promise(r=>setTimeout(r,ms)));
  const ordered=[...options.jobs].sort((a,b)=>b.priority-a.priority||a.key.localeCompare(b.key));
  const seen=new Set<string>(await options.ledger.reservedJobKeys?.() ?? []);
  const unique=ordered.filter(j=>!seen.has(j.key)&&!!seen.add(j.key));
  let attempted=0,accepted=0,failed=0,lastStart:number|null=await options.ledger.lastStartTime?.() ?? null;
  for (const job of unique) {
    if (attempted>=options.authorizedAttempts) break;
    if(lastStart!==null) await wait(Math.max(0,lastStart+options.minStartIntervalMs-now()));
    let reservation;
    try { reservation=await options.ledger.reserve(job,options.authorizedAttempts); } catch { return {attempted,accepted,failed,stopped:'LEDGER_BUDGET_OR_LOCK'}; }
    attempted++;lastStart=now();
    let evidence;
    try { evidence=await options.fetch(job); }
    catch(err) {
      failed++;await options.ledger.finish(reservation.attempt,'FAILED',err instanceof CashifyCollectionBlocked?'AUTH_OR_CAPTCHA_STOP':'FETCH_FAILED');
      if(err instanceof CashifyCollectionBlocked) return {attempted,accepted,failed,stopped:'AUTH_OR_CAPTCHA_STOP'};
      continue;
    }
    let valid=false;
    try { await options.accept(job,evidence);valid=true; } catch { failed++; }
    if(valid) { accepted++;await options.ledger.finish(reservation.attempt,'ACCEPTED',evidence.id); }
    else await options.ledger.finish(reservation.attempt,'REJECTED','EVIDENCE_VALIDATION_FAILED');
  }
  return {attempted,accepted,failed,stopped:attempted>=options.authorizedAttempts?'BUDGET_EXHAUSTED':'QUEUE_COMPLETE'};
}
