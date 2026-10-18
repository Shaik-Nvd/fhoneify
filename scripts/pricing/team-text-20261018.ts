/** Offline, fail-closed import of the supplied team quotation transcripts. No runtime activation. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

export const TEAM_TEXT_FILES = [
  'iphone15_plus_24_test_cases.txt', 'iphone15_pro_max_20_test_cases.txt',
  'iphone15_pro_max_24_test_cases.txt', 'iphone15_pro_test_cases.txt',
  'iphone16_24_test_cases.txt', 'iphone16_plus_24_test_cases.txt',
  'iphone16e_24_test_cases.txt', 'iphone17_test_cases.txt', 'iphoneair_24_test_cases.txt',
] as const;

type Answers = {
  calls: boolean | null; touch: boolean | null; originalScreen: boolean | null;
  warranty: boolean | null; validBill: boolean | null; eSim: string | null;
  defects: string[] | null; screenCondition: string | null;
  hardware: string[] | null; accessories: string[] | null; mobileAge: string | null;
};
export type TeamTextRow = {
  id: string; file: string; caseId: string; sourceSha256: string; caseText: string;
  identity: { brand: 'Apple'; model: string | null; ram: string | null; storage: string | null };
  referencePrice: number | null; sellingPrice: number | null;
  cashifyFees: { basePrice: number | null; imeiFee: number | null; processingFee: number | null; totalAmount: number | null };
  answers: Answers;
  sourceDate: string | null; datePrecision: 'day' | null;
  status: string | null; sourceKind: 'team-text-transcript'; screenshotVerified: false;
  questionnaire: { eSimShown: boolean | null; ageShown: boolean | null; otherBodyDefects: string | null; unlistedFunctionalProblems: string | null };
  diagnostics: { unavailable: boolean; answersComplete: boolean; feeArithmeticValid: boolean; unknownHardware: string[]; issues: string[] };
};

const money = (s: string, label: string): number | null => {
  const value = s.match(new RegExp(`${escape(label)}: ₹([\\d,]+)`))?.[1];
  return value === undefined ? null : Number(value.replaceAll(',', ''));
};
const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const next = (s: string, label: string): string | null => s.match(new RegExp(`${escape(label)}\\n([^\\n]+)`))?.[1] ?? null;
const sameLine = (s: string, label: string): string | null => s.match(new RegExp(`${escape(label)}: ([^\\n]+)`))?.[1] ?? null;
const yn = (value: string | null): boolean | null => value === 'Yes' ? true : value === 'No' ? false : null;
const hardwareAliases: Record<string, string> = {
  'Face Sensor not working': 'face',
  'Battery in Service (Health is less than 80%)': 'battery_service',
  'Battery Health 80-85%': 'battery_health',
  'Speaker Faulty (speaker not working)': 'speaker',
};
const ageAliases: Record<string, string> = {
  'Below 3 months': 'below3', '3 months - 6 months': '3to6',
  '6 months - 11 months': '6to11', 'Above 11 months': 'above11',
};
function caseDate(file: string, caseNumber: number): string | null {
  if (file === 'iphone17_test_cases.txt') return '2026-10-16';
  if (file === 'iphone15_pro_test_cases.txt') return caseNumber <= 6 ? '2026-10-16' : '2026-10-17';
  if (file === 'iphone16_24_test_cases.txt') return caseNumber >= 10 && caseNumber <= 14 ? '2026-10-16' : '2026-10-17';
  return TEAM_TEXT_FILES.includes(file as typeof TEAM_TEXT_FILES[number]) ? '2026-10-17' : null;
}
export function parseTeamText(file: string, bytes: Buffer): TeamTextRow[] {
  const source = bytes.toString('utf8').replaceAll('\r\n', '\n');
  const sourceSha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  const header = source.split(/TEST CASE\s+\d+/)[0];
  const pieces = source.split(/TEST CASE\s+(\d+)/);
  if (pieces.length < 3) throw new Error(`No cases in ${file}`);
  const rows: TeamTextRow[] = [];
  for (let index = 1; index < pieces.length; index += 2) {
    const caseId = pieces[index];
    const caseText = pieces[index + 1].trim().replace(/\n={5,}\s*$/, '').trim();
    const text = caseText.split('\n').map(line => line.trim()).join('\n');
    const identity = text.match(/^Apple (iPhone[^\n(]+) \((\d+) GB\/(\d+) GB\)/m);
    const hardwareSection = text.match(/Functional or Physical Problems:\n([\s\S]*?)\nOther functional problems:/)?.[1];
    const hardwareLabels = hardwareSection?.split('\n').map(line => line.replace(/^- /, '').trim()).filter(Boolean) ?? null;
    const unknownHardware = hardwareLabels?.filter(label => label !== 'NONE' && !hardwareAliases[label]) ?? [];
    const hardware = hardwareLabels === null || unknownHardware.length > 0 ? null : hardwareLabels.filter(label => label !== 'NONE').map(label => hardwareAliases[label]);
    const brokenScreen = sameLine(text, 'Broken/scratch on device screen');
    const body = sameLine(text, 'Other screen/body defects');
    const screenCondition = sameLine(text, 'Check physical condition of Display Screen');
    const box = yn(sameLine(text, 'Original Box with same IMEI'));
    const ageText = text.match(/What is your mobile age\?\n(?:\(Because[^\n]*\)\n)?([^\n]+)/)?.[1] ?? null;
    const ageNotShown = /Mobile age question: Not shown/.test(text);
    const eSim = next(text, 'How many eSIMs does your device support?');
    const eSimNotShown = /No eSIM question was shown for this model/.test(header);
    const sellingPrice = money(text, "Cashify's Selling price");
    const cashifyFees = { basePrice: money(text, 'Base Price'), imeiFee: money(text, 'IMEI Validation Fee'), processingFee: money(text, 'Processing Fee'), totalAmount: money(text, 'Total Amount') };
    const answers: Answers = {
      calls: yn(next(text, 'Are you able to make and receive calls?')),
      touch: yn(next(text, "Is your device's touch screen working properly?")),
      originalScreen: yn(next(text, "Is your phone's screen original?")),
      warranty: yn(next(text, 'Is your device under manufacturer warranty?')),
      validBill: yn(next(text, 'Do you have GST valid bill with the same IMEI?')),
      eSim, defects: body !== 'NONE' ? null : brokenScreen === 'NONE' ? [] : brokenScreen === 'Selected' ? ['broken_screen'] : null,
      screenCondition: brokenScreen === 'NONE' ? null : screenCondition,
      hardware, accessories: box === null ? null : box ? ['box'] : [], mobileAge: ageText ? ageAliases[ageText] ?? null : null,
    };
    const status = sameLine(text, 'Status');
    const unavailable = sellingPrice === null;
    const issues: string[] = [];
    if (!identity) issues.push('unparsed-exact-identity');
    if (identity && identity[3] !== '512') issues.push('unexpected-storage-scope');
    if (unknownHardware.length) issues.push('unrecognized-hardware-choice');
    if (hardwareLabels?.includes('NONE') && hardwareLabels.length !== 1) issues.push('contradictory-hardware-none');
    if (hardware?.includes('battery_service') && hardware.includes('battery_health')) issues.push('contradictory-battery-choices');
    if (body !== 'NONE') issues.push('unrecognized-or-missing-body-condition');
    if (sameLine(text, 'Other functional problems') !== 'Not selected') issues.push('unrecognized-or-missing-unlisted-functionality');
    if (answers.defects?.includes('broken_screen') && !screenCondition) issues.push('missing-screen-detail');
    if (screenCondition && !['1-2 scratches on screen', 'More than 2 scratches on screen'].includes(screenCondition)) issues.push('unrecognized-screen-condition');
    if (brokenScreen === 'NONE' && screenCondition !== null) issues.push('contradictory-screen-condition');
    if (ageText && !answers.mobileAge) issues.push('unrecognized-age-choice');
    if (eSim !== null && !['Single eSIM', 'Dual eSIM'].includes(eSim)) issues.push('unrecognized-esim-choice');
    if (eSim === null && !eSimNotShown) issues.push('unknown-esim-semantics');
    if (ageText === null && !ageNotShown) issues.push('unknown-age-semantics');
    if (unavailable) issues.push('no-observed-selling-price');
    if (!unavailable && status !== 'OBSERVED LIVE') issues.push('unrecognized-observed-status');
    if (sellingPrice !== null && (!Number.isSafeInteger(sellingPrice) || sellingPrice <= 0)) issues.push('invalid-selling-price');
    if (money(text, "Cashify's Get Upto") === null) issues.push('missing-reference-price');
    if (box === null) issues.push('unknown-box-choice');
    const answersComplete = ['calls', 'touch', 'originalScreen', 'warranty', 'validBill', 'defects', 'hardware', 'accessories'].every(key => answers[key as keyof Answers] !== null)
      && (eSim !== null || eSimNotShown) && (ageText !== null || ageNotShown) && issues.length === 0;
    const feeArithmeticValid = sellingPrice !== null && cashifyFees.basePrice === sellingPrice + 20 && cashifyFees.imeiFee === 20 && cashifyFees.processingFee === 99 && cashifyFees.totalAmount === sellingPrice - 99;
    if (!unavailable && !feeArithmeticValid) issues.push('fee-arithmetic-mismatch');
    rows.push({ id: `${file.replace(/\.txt$/, '')}:${caseId}`, file, caseId, sourceSha256, caseText,
      identity: { brand: 'Apple', model: identity ? `Apple ${identity[1].trim()}` : null, ram: identity ? `${identity[2]}GB` : null, storage: identity ? `${identity[3]}GB` : null },
      referencePrice: money(text, "Cashify's Get Upto"), sellingPrice, cashifyFees, answers,
      sourceDate: caseDate(file, Number(caseId)), datePrecision: caseDate(file, Number(caseId)) ? 'day' : null,
      status, sourceKind: 'team-text-transcript', screenshotVerified: false,
      questionnaire: { eSimShown: eSim !== null ? true : eSimNotShown ? false : null, ageShown: ageText !== null ? true : ageNotShown ? false : null, otherBodyDefects: body, unlistedFunctionalProblems: sameLine(text, 'Other functional problems') },
      diagnostics: { unavailable, answersComplete: answersComplete && feeArithmeticValid, feeArithmeticValid, unknownHardware, issues } });
  }
  return rows;
}
export function analyzeTeamText(rows: TeamTextRow[]) {
  const observed = rows.filter(row => row.sellingPrice !== null);
  const group = (ignoreAge: boolean) => {
    const result = new Map<string, TeamTextRow[]>();
    for (const row of observed) {
      const answers = { ...row.answers, ...(ignoreAge ? { mobileAge: null } : {}) };
      const key = JSON.stringify([row.identity, row.referencePrice, answers, row.questionnaire.eSimShown]);
      result.set(key, [...(result.get(key) ?? []), row]);
    }
    return [...result.values()];
  };
  const full = group(false), neutral = group(true);
  const ageGroups = neutral.filter(group => new Set(group.map(row => row.sellingPrice)).size > 1).map(group => {
    const selling = group.map(row => row.sellingPrice!);
    const minimum = Math.min(...selling), maximum = Math.max(...selling);
    return { ids: group.map(row => row.id), minimumSelling: minimum, maximumSelling: maximum,
      range: maximum - minimum, minimumPayoutOff: maximum + 1, maximumPayoutOff: minimum + 2000 - 299,
      feasibleForBothCouponStates: maximum + 1 <= minimum + 2000 - 299 };
  });
  return { totalRows: rows.length, observedRows: observed.length, unavailableRows: rows.length - observed.length,
    uniqueFullAnswerCombinations: full.length, repeatedRows: observed.length - full.length,
    uniqueAgeNeutralCombinations: neutral.length,
    uniqueWarrantyNoCombinations: full.filter(group => group[0].answers.warranty === false).length,
    duplicateGroups: full.filter(group => group.length > 1).map(group => group.map(row => row.id)),
    conflictingExactGroups: full.filter(group => new Set(group.map(row => row.sellingPrice)).size > 1).map(group => group.map(row => row.id)),
    ageGroups };
}
export function buildTeamTextFixture(inputDirectory: string) {
  const rows = TEAM_TEXT_FILES.flatMap(file => parseTeamText(file, fs.readFileSync(path.join(inputDirectory, file))));
  return { schema: 'fhoneify-team-text/1', sourceKind: 'team-text-transcript', screenshotVerified: false,
    notice: 'Day-precision team transcripts; no independently verified browser capture, exact timestamp, or questionnaire artifact. Not runtime activation.',
    rows, analysis: analyzeTeamText(rows) };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const inputDirectory = path.resolve(process.argv[2] ?? 'scripts/pricing/fixtures/team-text-2026-10-18');
  const output = path.resolve(process.argv[3] ?? 'scripts/pricing/fixtures/team-text-2026-10-18.json');
  const fixture = buildTeamTextFixture(inputDirectory);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(fixture, null, 2) + '\n');
  console.log(JSON.stringify(fixture.analysis, null, 2));
}
