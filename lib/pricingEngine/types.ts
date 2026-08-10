export interface ModelParams {
  warrantyPenalty: number;
  gstBillPenalty: number;
  callsPenalty: number;
  originalScreenPenalty: number;
  touchPenalty: number;
  functionalScale: number;
  physicalScale: number;
  bodyScale?: number;
  facePenalty?: number;
}

export type DiagnosticsType = {
  calls: boolean | null;
  touch: boolean | null;
  originalScreen: boolean | null;
  defects: string[];
  screenCondition: string | null;
  screenSpots: string | null;
  screenLines: string | null;
  screenDiscoloration: string | null;
  bodyScratches: string | null;
  bodyDents: string | null;
  bodyPanel: string | null;
  bodyBent: string | null;
  hardware: string[];
  accessories: string[];
  warranty: boolean | null;
  validBill: boolean | null;
  eSim: string | null;
  mobileAge: string | null;
  box?: boolean | null;
  charger?: boolean | null;
};

export interface PricingResult {
  cashifyBasePrice: number;
  fhoneifyPrice: number;
}
