/**
 * Pure functions building the three Cashify questionnaire answer profiles
 * (A/B/C) for the one-time pricing-research campaign.
 *
 * No I/O, no Playwright, no Prisma: the questionnaire profile
 * (warrantyMode/billMode/ageMode, from CashifyQuestionnaireProfile) is passed
 * in as a plain argument, so this file is independently unit-testable
 * without a database connection.
 *
 * The `answers` shape produced here is EXACTLY what
 * server/modules/quote/cashifyScraper.ts's scrapeCashifyPrice() reads off
 * `deviceDetails.answers` - see that file's PAGE 1-5 walk for the field-by-
 * field mapping this mirrors.
 */
import type { QuestionMode, QuestionnaireSemantics } from '../../lib/pricing/questionnaireSemantics';
import type { DeviceIdentity } from '../../lib/referencePricing/types';

/** One of the checkbox ids scrapeCashifyPrice() recognises on the PAGE 2
 * screen/body defect selector. */
export type CashifyDefectId = 'broken_screen' | 'screen_spot' | 'body_scratch' | 'panel_missing';

/** Exactly the shape scrapeCashifyPrice()'s `answers` object is read as. */
export interface CashifyResearchAnswers {
  calls?: boolean;
  touch?: boolean;
  originalScreen?: boolean;
  warranty?: boolean;
  validBill?: boolean;
  eSim?: 'Single eSIM' | 'Dual eSIM';
  defects?: CashifyDefectId[];
  screenCondition?: string;
  screenSpots?: string;
  screenLines?: string;
  screenDiscoloration?: string;
  bodyScratches?: string;
  bodyDents?: string;
  bodyPanel?: string;
  bodyBent?: string;
  hardware?: string[];
  accessories?: Array<'charger' | 'box'>;
  mobileAge?: 'below3' | '3to6' | '6to11' | 'above11';
}

/** The one field Profile B is allowed to vary, given a supported control was
 * found. Kept narrow (not `keyof CashifyResearchAnswers`) because only these
 * three fields are ever eligible single-variable controls for this
 * campaign. */
export type SingleVariableField = 'warranty' | 'validBill' | 'mobileAge';

export interface ProfileUnsupported {
  unsupported: true;
  reason: string;
}

export interface ProfileAResult {
  unsupported: false;
  answers: CashifyResearchAnswers;
}

export interface ProfileBResult {
  unsupported: false;
  answers: CashifyResearchAnswers;
  variedField: SingleVariableField;
  baselineValue: string | boolean;
  controlValue: string | boolean;
}

export interface ProfileCResult {
  unsupported: false;
  answers: CashifyResearchAnswers;
}

/** The subset of CashifyQuestionnaireProfile this module reads. Callers pass
 * the real Prisma row (which satisfies this shape) or a plain test fixture -
 * this file never imports Prisma or touches the database itself. */
export interface QuestionnaireProfileInput extends QuestionnaireSemantics {
  /**
   * 'OK' means Cashify's first questionnaire page was actually parsed for
   * this model. Anything else (PARSE_FAILED / FETCH_FAILED / NOT_FOUND /
   * VARIANT_MISMATCH / undefined) means we never confirmed which defect
   * pages this model's questionnaire shows, so Profile C must refuse rather
   * than assume a screen-defect path exists.
   */
  status?: string;
}

const isAsked = (mode: QuestionMode | undefined): boolean => mode === 'ASKED';

/**
 * Profile A: clean baseline. Every condition answer is at its best/working/
 * no-defect value. This never depends on the questionnaire profile - a
 * clean phone is a clean phone regardless of which questions Cashify shows;
 * questions it does not ask for this model simply never get read by the
 * collector's walk.
 */
export function buildProfileA(_device: DeviceIdentity): ProfileAResult {
  return {
    unsupported: false,
    answers: {
      calls: true,
      touch: true,
      originalScreen: true,
      warranty: true,
      validBill: true,
      defects: [],
      bodyScratches: 'No scratches',
      bodyDents: 'No dents',
      bodyPanel: 'No defect on side or back panel',
      bodyBent: 'Phone not bent',
      hardware: [],
      accessories: ['charger', 'box'],
      mobileAge: 'below3',
    },
  };
}

/**
 * Profile B: single-variable control. Varies exactly one field the
 * questionnaire is CONFIRMED (ASKED) to present for this model, holding
 * every other answer at the Profile A baseline.
 *
 * Priority when more than one control is available: warranty, then age,
 * then GST bill - matching the brief's examples ("age/warranty ... if
 * ASKED", "GST bill=No if billMode is ASKED" as the fallback). Never
 * invents an answer to a question a mode of NOT_ASKED or UNKNOWN says
 * Cashify does not (confirmed to) ask; falls through to UNSUPPORTED with a
 * reason instead.
 */
export function buildProfileB(
  device: DeviceIdentity,
  profile: QuestionnaireProfileInput
): ProfileBResult | ProfileUnsupported {
  const base = buildProfileA(device).answers;

  if (isAsked(profile.warrantyMode)) {
    return {
      unsupported: false,
      answers: { ...base, warranty: false },
      variedField: 'warranty',
      baselineValue: true,
      controlValue: false,
    };
  }

  if (isAsked(profile.ageMode)) {
    return {
      unsupported: false,
      answers: { ...base, mobileAge: 'above11' },
      variedField: 'mobileAge',
      baselineValue: 'below3',
      controlValue: 'above11',
    };
  }

  if (isAsked(profile.billMode)) {
    return {
      unsupported: false,
      answers: { ...base, validBill: false },
      variedField: 'validBill',
      baselineValue: true,
      controlValue: false,
    };
  }

  return {
    unsupported: true,
    reason:
      `no supported single-variable control for ${device.brand} ${device.model}: ` +
      `warrantyMode=${profile.warrantyMode}, ageMode=${profile.ageMode}, billMode=${profile.billMode} ` +
      '- none is ASKED, so no question exists that can be varied alone without fabricating one',
  };
}

/**
 * Profile C: one screen defect (cracked screen / broken glass), all other
 * answers held at the Profile A baseline.
 *
 * The screen-defect checkbox page is effectively universal on Cashify's
 * questionnaire (scrapeCashifyPrice() always probes for it regardless of
 * device), but this module only trusts that when the model's questionnaire
 * profile was actually verified (`status === 'OK'`). An unverified or failed
 * profile means we never confirmed a defect page exists for this model, so
 * Profile C refuses rather than fabricating one - defensive, since this is
 * rare but not impossible for an oddly-shaped model page.
 */
export function buildProfileC(
  device: DeviceIdentity,
  profile: QuestionnaireProfileInput
): ProfileCResult | ProfileUnsupported {
  if (profile.status !== undefined && profile.status !== 'OK') {
    return {
      unsupported: true,
      reason:
        `questionnaire not verified for ${device.brand} ${device.model} (status=${profile.status}); ` +
        'cannot confirm a screen-defect path exists without fabricating one',
    };
  }

  const base = buildProfileA(device).answers;
  return {
    unsupported: false,
    answers: {
      ...base,
      defects: ['broken_screen'],
      screenCondition: 'Screen cracked/ glass broken',
    },
  };
}
