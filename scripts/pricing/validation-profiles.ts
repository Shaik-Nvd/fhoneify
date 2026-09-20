import type { DiagnosticsType } from '../../lib/pricingCalculator';

export const validationAnswer = (overrides: Partial<DiagnosticsType> = {}): DiagnosticsType => ({
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
  bodyPanel: 'No defect on side or back panel',
  bodyBent: 'Phone not bent',
  hardware: [],
  accessories: ['box', 'bill', 'charger'],
  warranty: true,
  validBill: true,
  eSim: null,
  mobileAge: 'below3',
  ...overrides,
});

export const VALIDATION_PROFILES: Record<string, DiagnosticsType> = {
  P0_PERFECT: validationAnswer(),
  P1_OLD_NO_DAMAGE: validationAnswer({ warranty: false, mobileAge: 'above11' }),
  P2_MINOR_SCREEN: validationAnswer({ defects: ['screen_scratch'], screenCondition: '1-2 scratches on screen' }),
  P2_HEAVY_SCREEN: validationAnswer({ defects: ['screen_scratch'], screenCondition: 'More than 2 scratches on screen' }),
  P3_FUNCTIONAL: validationAnswer({ hardware: ['speaker'] }),
  P3_SCREEN_FUNCTIONAL: validationAnswer({ defects: ['screen_scratch'], screenCondition: 'More than 2 scratches on screen', hardware: ['speaker'] }),
  P4_BODY: validationAnswer({ defects: ['body_scratch'], bodyScratches: 'More than 2 scratches', bodyDents: 'Major dent(s) or more than 2' }),
  P5_SEVERE_MULTI: validationAnswer({
    defects: ['screen_scratch', 'body_scratch'],
    screenCondition: 'Screen cracked/ glass broken',
    bodyScratches: 'More than 2 scratches',
    bodyDents: 'Major dent(s) or more than 2',
    hardware: ['speaker', 'back_camera'],
    accessories: [],
    warranty: false,
    validBill: false,
    mobileAge: 'above11',
  }),
};
