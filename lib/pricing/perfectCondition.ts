import type { DiagnosticsType } from '../pricingCalculator';

/**
 * The perfect-condition answers behind the "Get upto" figure. Kept apart from
 * engine.ts so the quote page can use them without bundling the engine and
 * its materialized price snapshot - the browser must never price a device.
 */
export const PERFECT_CONDITION_DIAGNOSTICS: DiagnosticsType = {
  calls: true,
  touch: true,
  originalScreen: true,
  defects: [],
  screenCondition: null,
  screenSpots: null,
  screenLines: null,
  screenDiscoloration: null,
  bodyScratches: 'No scratches',
  bodyDents: 'No dents',
  bodyPanel: null,
  bodyBent: null,
  hardware: [],
  accessories: ['box', 'bill', 'charger', 'spen'],
  warranty: true,
  validBill: true,
  eSim: null,
  mobileAge: 'Below 3 months',
};
