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
};

/**
 * Fhoneify Production Pricing Engine Algorithm
 * Calibrated against Cashify reverse logic for Apple, Samsung, Nothing, CMF, Vivo, OnePlus, and generic Android devices.
 */

export const pricingConfig = {
  defects_screen_body: {
    broken_screen: 0.4,
    screen_scratch: 0.35,
    screen_spot: 0.25,
    panel_missing: 0.2,
    body_scratch: 0.08
  },
  defects_functional: {
    fingerprint: 0.15,
    battery_service: 0.15,
    battery_health: 0.05,
    front_camera: 0.1253,
    back_camera: 0.223,
    wifi: 0.12,
    speaker: 0.1,
    audio_receiver: 0.1,
    charging: 0.1,
    microphone: 0.1,
    face: 0.05,
    volume: 0.05,
    power: 0.05,
    camera_glass: 0.05,
    bluetooth: 0.05,
    silent: 0.02,
    vibrator: 0.02,
    proximity: 0.02,
    s_pen: 0.08,
    hinge: 0.2
  },
  // Standard Age Multipliers
  ageBonus: {
    below3: 1,
    "3to6": 0.9427,
    "6to11": 0.9114,
    above11: 0.7966
  },
  // Specialized Series Multipliers
  oneplus15SeriesAgeBonus: { below3: 0.98, "3to6": 0.93, "6to11": 0.90, above11: 0.7966 },
  oneplus13SeriesAgeBonus: { below3: 0.98, "3to6": 0.93, "6to11": 0.90, above11: 0.7966 },
  vivoSeriesAgeBonus: { below3: 0.9729463846532218, "3to6": 0.93, "6to11": 0.90, above11: 0.7966 },
  nothing4aProSeriesAgeBonus: { below3: 0.98, "3to6": 0.95, "6to11": 0.92, above11: 0.88 },
  nothing4aSeriesAgeBonus: { below3: 0.98, "3to6": 0.95, "6to11": 0.92, above11: 0.88 },
  nothing3aProSeriesAgeBonus: { below3: 0.98, "3to6": 0.95, "6to11": 0.92, above11: 0.88 },
  nothing3SeriesAgeBonus: { below3: 0.98, "3to6": 0.95, "6to11": 0.92, above11: 0.88 },
  nothing3aSeriesAgeBonus: { below3: 0.98, "3to6": 0.95, "6to11": 0.92, above11: 0.88 },
  nothing2aPlusSeriesAgeBonus: { below3: 0.98, "3to6": 0.95, "6to11": 0.92, above11: 0.88 },
  cmfSeriesAgeBonus: { below3: 0.98, "3to6": 0.95, "6to11": 0.92, above11: 0.88 },
  nothing2aSeriesAgeBonus: { below3: 0.98, "3to6": 0.95, "6to11": 0.92, above11: 0.88 },
  nothing2SeriesAgeBonus: { below3: 0.98, "3to6": 0.95, "6to11": 0.92, above11: 0.88 },
  nothing1SeriesAgeBonus: { below3: 0.98, "3to6": 0.93, "6to11": 0.90, above11: 0.8805755395683453 },
  foldableAgeBonus: { below3: 0.98, "3to6": 0.925, "6to11": 0.8845226, above11: 0.7902512 },
  s26UltraSeriesAgeBonus: {
    below3: 0.95,
    "3to6": 0.9063182897862233,
    "6to11": 0.8907363420427553,
    above11: 0.8139316811781648
  },
  sUltraSeriesAgeBonus: { below3: 0.98, "3to6": 0.93, "6to11": 0.90, above11: 0.8139316811781648 },
  s24UltraSeriesAgeBonus: {
    below3: 0.98,
    "3to6": 0.93,
    "6to11": 0.89,
    above11_bill: 0.8032786885245902,
    above11_nobill: 0.8188914910226385
  },
  sPlusSeriesAgeBonus: { below3: 0.98, "3to6": 0.91315104167, "6to11": 0.8979591836, above11: 0.7760816326 },
  sSeriesAgeBonus: { below3: 0.95, "3to6": 0.9095510204, "6to11": 0.8979591836, above11: 0.7760816326 },
  feSeriesAgeBonus: { below3: 0.94, "3to6": 0.895, "6to11": 0.86310559, above11: 0.75701863 },
  edgeSeriesAgeBonus: { below3: 0.96, "3to6": 0.935, "6to11": 0.923466114868, above11: 0.79668938657 },
  bonuses: { box: 380 },
  modelFloorPrice: 100
};

export const getAppleModelParams = (model: string): ModelParams => {
  const lowerModel = String(model || "").toLowerCase();
  let params: ModelParams = {
    warrantyPenalty: 0.05,
    gstBillPenalty: 0.02,
    callsPenalty: 0.55,
    originalScreenPenalty: 0.7,
    touchPenalty: 0.55,
    functionalScale: 1.15,
    physicalScale: 1.15
  };
  const isPro = lowerModel.includes("pro");
  const isProMax = lowerModel.includes("pro max");
  const isPlus = lowerModel.includes("plus");

  if (lowerModel.includes("17e")) {
    params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.25, originalScreenPenalty: 0.4554, touchPenalty: 0.215, functionalScale: 1.5, physicalScale: 1.5 };
  } else if (lowerModel.includes("16e")) {
    params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.25, originalScreenPenalty: 0.4336, touchPenalty: 0.22, functionalScale: 1.5, physicalScale: 1.5 };
  } else if (lowerModel.includes("17")) {
    if (isProMax || isPlus) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.45, originalScreenPenalty: 0.58, touchPenalty: 0.61485, functionalScale: 1.15, physicalScale: 1.11392, facePenalty: 0.05 };
    } else if (isPro) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.45, originalScreenPenalty: 0.6, touchPenalty: 0.61485, functionalScale: 1.15, physicalScale: 1.05, facePenalty: 0.05 };
    } else {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.5, originalScreenPenalty: 0.65, touchPenalty: 0.61485, functionalScale: 1.1, physicalScale: 1.05, facePenalty: 0.05 };
    }
  } else if (lowerModel.includes("16") || lowerModel.includes("15")) {
    if (lowerModel.includes("16 pro max")) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.5, originalScreenPenalty: 0.782, touchPenalty: 0.635, functionalScale: 1.09, physicalScale: 1.08303, bodyScale: 0.9806, facePenalty: 0.257307 };
    } else if (isProMax) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.5, originalScreenPenalty: 0.8176, touchPenalty: 0.635, functionalScale: 1.09, physicalScale: 1.05692, bodyScale: 0.9806, facePenalty: 0.257307 };
    } else if (isPro || isPlus) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.5, originalScreenPenalty: 0.65, touchPenalty: 0.55, functionalScale: 1.05, physicalScale: 1.05 };
    } else if (lowerModel === "apple iphone 15" || lowerModel === "iphone 15") {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.55, originalScreenPenalty: 0.56465, touchPenalty: 0.59355, functionalScale: 1, physicalScale: 1 };
    } else {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.55, originalScreenPenalty: 0.7, touchPenalty: 0.55, functionalScale: 1, physicalScale: 1 };
    }
  } else if (lowerModel.includes("14")) {
    if (isProMax || isPlus) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.45, originalScreenPenalty: 0.55, touchPenalty: 0.5463, functionalScale: 1.25, physicalScale: 1.25 };
    } else {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.6, originalScreenPenalty: 0.6681, touchPenalty: 0.6, functionalScale: 1.2, physicalScale: 1.2 };
    }
  } else {
    params = { warrantyPenalty: 0, gstBillPenalty: 0, callsPenalty: 0.6, originalScreenPenalty: 0.7, touchPenalty: 0.5, functionalScale: 0.8, physicalScale: 0.8 };
  }
  return params;
};

export const getAndroidModelParams = (brand: string, model: string): ModelParams => {
  const lowerBrand = String(brand || "").toLowerCase();
  const lowerModel = String(model || "").toLowerCase();
  let params: ModelParams = {
    warrantyPenalty: 0.1,
    gstBillPenalty: 0.05,
    callsPenalty: 0.5,
    originalScreenPenalty: 0.6,
    touchPenalty: 0.4,
    functionalScale: 0.8,
    physicalScale: 0.75
  };
  
  if (lowerBrand === "oneplus" || lowerModel.includes("oneplus")) {
    if (lowerModel.includes("nord 5") || lowerModel.includes("nord5")) {
      params = {
        warrantyPenalty: 0.1,
        gstBillPenalty: 0.223828345567,
        callsPenalty: 0.5,
        originalScreenPenalty: 0.588208996073,
        touchPenalty: 0.489236539858,
        functionalScale: 1.0,
        physicalScale: 1.0
      };
    } else if (lowerModel.includes("nord 4") || lowerModel.includes("nord4")) {
      params = {
        warrantyPenalty: 0.1,
        gstBillPenalty: 0.223828345567,
        callsPenalty: 0.5,
        originalScreenPenalty: 0.601389842542,
        touchPenalty: 0.459850793974,
        functionalScale: 1.0,
        physicalScale: 1.0
      };
    } else if (lowerModel.includes("10t") || lowerModel.includes("10 t")) {
      params = {
        warrantyPenalty: 0.1,
        gstBillPenalty: 0.05,
        callsPenalty: 0.5,
        originalScreenPenalty: 0.919242688691,
        touchPenalty: 0.576661944883,
        functionalScale: 1.0,
        physicalScale: 1.0
      };
    } else if (lowerModel.includes("9 pro") || lowerModel.includes("9pro")) {
      params = {
        warrantyPenalty: 0.1,
        gstBillPenalty: 0.05,
        callsPenalty: 0.5,
        originalScreenPenalty: 0.788402894214,
        touchPenalty: 0.527625688003,
        functionalScale: 1.0,
        physicalScale: 1.0
      };
    } else if (lowerModel.includes("9rt") || lowerModel.includes("9 rt")) {
      params = {
        warrantyPenalty: 0.1,
        gstBillPenalty: 0.05,
        callsPenalty: 0.5,
        originalScreenPenalty: 0.789663904338,
        touchPenalty: 0.524035414520,
        functionalScale: 1.0,
        physicalScale: 1.0
      };
    } else if (lowerModel.includes("8 pro") || lowerModel.includes("8pro")) {
      params = {
        warrantyPenalty: 0.1,
        gstBillPenalty: 0.05,
        callsPenalty: 0.5,
        originalScreenPenalty: 0.812773032168,
        touchPenalty: 0.525361420222,
        functionalScale: 1.0,
        physicalScale: 1.0
      };
    } else if (lowerModel.includes("10r") || lowerModel.includes("10 r")) {
      params = {
        warrantyPenalty: 0.1,
        gstBillPenalty: 0.05,
        callsPenalty: 0.5,
        originalScreenPenalty: 0.863344425182,
        touchPenalty: 0.534887536603,
        functionalScale: 1.0,
        physicalScale: 1.0
      };
    } else if (lowerModel.includes("nord 6") || lowerModel.includes("nord6")) {
      params = {
        warrantyPenalty: 0.1,
        gstBillPenalty: 0.223828345567,
        callsPenalty: 0.5,
        originalScreenPenalty: 0.584277463847,
        touchPenalty: 0.450534014310,
        functionalScale: 1.0,
        physicalScale: 1.0
      };
    } else if (lowerModel.includes("11r") || lowerModel.includes("11 r")) {
      params = {
        warrantyPenalty: 0.1,
        gstBillPenalty: 0.223828345567,
        callsPenalty: 0.5,
        originalScreenPenalty: 0.628553482947,
        touchPenalty: 0.433581520720,
        functionalScale: 1.0,
        physicalScale: 1.0
      };
    } else if (lowerModel.includes("10 pro") || lowerModel.includes("10pro")) {
      params = {
        warrantyPenalty: 0.1,
        gstBillPenalty: 0.05,
        callsPenalty: 0.5,
        originalScreenPenalty: 0.849705542054,
        touchPenalty: 0.560716088353,
        functionalScale: 1.0,
        physicalScale: 1.0
      };
    } else if (lowerModel.includes("11")) {
      params = {
        warrantyPenalty: 0.1,
        gstBillPenalty: 0.223828345567,
        callsPenalty: 0.5,
        originalScreenPenalty: 0.619984508557,
        touchPenalty: 0.438131142850,
        functionalScale: 1.0,
        physicalScale: 1.0
      };
    } else if (lowerModel.includes("open")) {
      params = {
        warrantyPenalty: 0.1,
        gstBillPenalty: 0.223828345567,
        callsPenalty: 0.5,
        originalScreenPenalty: 0.239976647636,
        touchPenalty: 0.351224244847,
        functionalScale: 1.0,
        physicalScale: 1.0
      };
    } else if (lowerModel.includes("12r") || lowerModel.includes("12 r")) {
      params = {
        warrantyPenalty: 0.1,
        gstBillPenalty: 0.05,
        callsPenalty: 0.5,
        originalScreenPenalty: 0.783440559635,
        touchPenalty: 0.483440017786,
        functionalScale: 1.0,
        physicalScale: 1.0
      };
    } else if (lowerModel.includes("13s") || lowerModel.includes("13 s")) {
      params = {
        warrantyPenalty: 0.1,
        gstBillPenalty: 0.2392779973650988,
        callsPenalty: 0.5,
        originalScreenPenalty: 0.578763679385,
        touchPenalty: 0.385439313275,
        functionalScale: 1.0,
        physicalScale: 1.0
      };
    } else if (lowerModel.includes("13r") || lowerModel.includes("13 r")) {
      params = {
        warrantyPenalty: 0.1,
        gstBillPenalty: 0.223828345567,
        callsPenalty: 0.5,
        originalScreenPenalty: 0.604341237141,
        touchPenalty: 0.399600455256,
        functionalScale: 1.0,
        physicalScale: 1.0
      };
    } else if (lowerModel.includes("13")) {
      params = {
        warrantyPenalty: 0.1,
        gstBillPenalty: 0.223828345567,
        callsPenalty: 0.5,
        originalScreenPenalty: 0.666253652872,
        touchPenalty: 0.438236973653,
        functionalScale: 1.0,
        physicalScale: 1.0
      };
    } else if (lowerModel.includes("12")) {
      params = {
        warrantyPenalty: 0.1,
        gstBillPenalty: 0.05,
        callsPenalty: 0.5,
        originalScreenPenalty: 0.777337654200,
        touchPenalty: 0.495807732028,
        functionalScale: 1.0,
        physicalScale: 1.0
      };
    } else if (lowerModel.includes("15r") || lowerModel.includes("15 r")) {
      params = {
        warrantyPenalty: 0.1,
        gstBillPenalty: 0.2454928733980118,
        callsPenalty: 0.5,
        originalScreenPenalty: 0.6099500728104847,
        touchPenalty: 0.35616285856,
        functionalScale: 1.0,
        physicalScale: 1.0
      };
    } else if (lowerModel.includes("15")) {
      params = {
        warrantyPenalty: 0.1,
        gstBillPenalty: 0.1840908062034098,
        callsPenalty: 0.5,
        originalScreenPenalty: 0.5797424107983113,
        touchPenalty: 0.4,
        functionalScale: 1.0,
        physicalScale: 1.0
      };
    } else {
      const isPro = lowerModel.includes("pro");
      const isFold = lowerModel.includes("open") || lowerModel.includes("fold");
      if (isPro || isFold) {
        params = { warrantyPenalty: 0.1, gstBillPenalty: 0.05, callsPenalty: 0.5, originalScreenPenalty: 0.6, touchPenalty: 0.4, functionalScale: 0.95, physicalScale: 0.95 };
      } else {
        params = { warrantyPenalty: 0.1, gstBillPenalty: 0.05, callsPenalty: 0.5, originalScreenPenalty: 0.6, touchPenalty: 0.4, functionalScale: 0.85, physicalScale: 0.8 };
      }
    }
  } else if (lowerBrand === "vivo" || lowerModel.includes("vivo")) {
    params = {
      warrantyPenalty: 0.1,
      gstBillPenalty: 0.05,
      callsPenalty: 0.5,
      originalScreenPenalty: 0.8002385938173499,
      touchPenalty: 0.34764077227429186,
      functionalScale: 1.0,
      physicalScale: 0.8
    };
  } else if (lowerBrand === "cmf" || lowerModel.includes("cmf")) {
    params = {
      warrantyPenalty: 0.1,
      gstBillPenalty: 0.223828345567476,
      callsPenalty: 0.5,
      originalScreenPenalty: 0.5189093754585025,
      touchPenalty: 0.3804469105394575,
      functionalScale: 1.0,
      physicalScale: 1.0
    };
  } else if (lowerBrand === "nothing" || lowerModel.includes("nothing")) {
    if (lowerModel.includes("4a pro") || lowerModel.includes("phone (4a) pro") || lowerModel.includes("phone 4a pro")) {
      params = {
        warrantyPenalty: 0.1,
        gstBillPenalty: 0.223828345567476,
        callsPenalty: 0.5,
        originalScreenPenalty: 0.6501399221896116,
        touchPenalty: 0.5598015320084772,
        functionalScale: 1.0,
        physicalScale: 1.0
      };
    } else if (lowerModel.includes("4a") || lowerModel.includes("phone (4a)") || lowerModel.includes("phone 4a")) {
      params = {
        warrantyPenalty: 0.1,
        gstBillPenalty: 0.223828345567476,
        callsPenalty: 0.5,
        originalScreenPenalty: 0.6119458411383877,
        touchPenalty: 0.4793958514456538,
        functionalScale: 1.0,
        physicalScale: 1.0
      };
    } else if (lowerModel.includes("3a pro") || lowerModel.includes("phone (3a) pro") || lowerModel.includes("phone 3a pro")) {
      params = {
        warrantyPenalty: 0.1,
        gstBillPenalty: 0.223828345567476,
        callsPenalty: 0.5,
        originalScreenPenalty: 0.5690781142736803,
        touchPenalty: 0.3903079632447254,
        functionalScale: 1.0,
        physicalScale: 1.0
      };
    } else if (lowerModel.includes("phone 3") || lowerModel.includes("phone (3)") || lowerModel.includes("nothing 3")) {
      params = {
        warrantyPenalty: 0.1,
        gstBillPenalty: 0.223828345567476,
        callsPenalty: 0.5,
        originalScreenPenalty: 0.6113101541959202,
        touchPenalty: 0.5046752924591304,
        functionalScale: 1.0,
        physicalScale: 1.0
      };
    } else if (lowerModel.includes("3a") || lowerModel.includes("phone (3a)") || lowerModel.includes("phone 3a")) {
      params = {
        warrantyPenalty: 0.1,
        gstBillPenalty: 0.223828345567476,
        callsPenalty: 0.5,
        originalScreenPenalty: 0.5444153316843525,
        touchPenalty: 0.3886663741135816,
        functionalScale: 1.0,
        physicalScale: 1.0
      };
    } else if (lowerModel.includes("2a plus") || lowerModel.includes("phone (2a) plus") || lowerModel.includes("phone 2a plus")) {
      params = {
        warrantyPenalty: 0.1,
        gstBillPenalty: 0.223828345567476,
        callsPenalty: 0.5,
        originalScreenPenalty: 0.5847432190648534,
        touchPenalty: 0.4130173545680177,
        functionalScale: 1.0,
        physicalScale: 1.0
      };
    } else if (lowerModel.includes("2a") || lowerModel.includes("phone (2a)") || lowerModel.includes("phone 2a")) {
      params = {
        warrantyPenalty: 0.1,
        gstBillPenalty: 0.223828345567476,
        callsPenalty: 0.5,
        originalScreenPenalty: 0.575381140609825,
        touchPenalty: 0.4127611518915867,
        functionalScale: 1.0,
        physicalScale: 1.0
      };
    } else if (lowerModel.includes("phone 2") || lowerModel.includes("phone (2)") || lowerModel.includes("nothing 2")) {
      params = {
        warrantyPenalty: 0.1,
        gstBillPenalty: 0.2238302026049204,
        callsPenalty: 0.5,
        originalScreenPenalty: 0.6198745779064158,
        touchPenalty: 0.4307766521948866,
        functionalScale: 1.0,
        physicalScale: 1.0
      };
    } else {
      params = {
        warrantyPenalty: 0.1,
        gstBillPenalty: 0.05,
        callsPenalty: 0.5,
        originalScreenPenalty: 0.8129496402877698,
        touchPenalty: 0.5179856115107914,
        functionalScale: 1.0,
        physicalScale: 1.0
      };
    }
  } else if (lowerBrand === "samsung") {
    const isUltra = lowerModel.includes("ultra");
    const isS = lowerModel.includes("galaxy s") || lowerModel.includes("s2") || lowerModel.includes("s1") || lowerModel.includes("s9") || lowerModel.includes("s8");
    const isZ = lowerModel.includes("fold") || lowerModel.includes("flip");
    const isFE = lowerModel.includes("fe");
    const isEdge = lowerModel.includes("edge");
    const isPlus = lowerModel.includes("plus") || lowerModel.includes("+");
    
    if (isUltra) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.5, originalScreenPenalty: 0.6, touchPenalty: 0.3, functionalScale: 1.2, physicalScale: 1.2 };
    } else if (isPlus) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.5, originalScreenPenalty: 0.6, touchPenalty: 0.3, functionalScale: 1.1, physicalScale: 1.1 };
    } else if (isEdge) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.5, originalScreenPenalty: 0.6, touchPenalty: 0.35, functionalScale: 1.0, physicalScale: 1.11 };
    } else if (isFE) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.5, originalScreenPenalty: 0.6, touchPenalty: 0.35, functionalScale: 0.9, physicalScale: 0.986 };
    } else if (isS || isZ) {
      params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.5, originalScreenPenalty: 0.6, touchPenalty: 0.3, functionalScale: 1.1, physicalScale: 1.1 };
    } else {
      params = { warrantyPenalty: 0.1, gstBillPenalty: 0.05, callsPenalty: 0.55, originalScreenPenalty: 0.65, touchPenalty: 0.35, functionalScale: 0.75, physicalScale: 0.75 };
    }
  } else {
    params = { warrantyPenalty: 0.12, gstBillPenalty: 0.08, callsPenalty: 0.45, originalScreenPenalty: 0.55, touchPenalty: 0.45, functionalScale: 0.75, physicalScale: 0.7 };
  }
  return params;
};

export function calculateFhoneifyPrice(brand: string, model: string, basePrice: number, diagnostics: DiagnosticsType): { cashifyBasePrice: number, fhoneifyPrice: number } {
  if (!basePrice || basePrice <= 0) return { cashifyBasePrice: 0, fhoneifyPrice: 0 };
  
  const floor_price = pricingConfig.modelFloorPrice;
  let age_multiplier = 1;
  let calls_multiplier = 1;
  let touch_multiplier = 1;
  let screen_orig_mult = 1;
  let screen_body_sum = 0;
  let functional_sum = 0;
  
  const safeBrand = String(brand || "");
  const safeModel = String(model || "");
  const lowerModel = safeModel.toLowerCase();
  const lowerBrand = safeBrand.toLowerCase();
  const isApple = lowerBrand === "apple";
  const isOnePlus = lowerBrand === "oneplus" || lowerModel.includes("oneplus");
  const isOnePlusNord5 = isOnePlus && (lowerModel.includes("nord 5") || lowerModel.includes("nord5"));
  const isOnePlusNord4 = isOnePlus && (lowerModel.includes("nord 4") || lowerModel.includes("nord4"));
  const isOnePlus10T = isOnePlus && (lowerModel.includes("10t") || lowerModel.includes("10 t"));
  const isOnePlus9Pro = isOnePlus && (lowerModel.includes("9 pro") || lowerModel.includes("9pro"));
  const isOnePlus9RT = isOnePlus && (lowerModel.includes("9rt") || lowerModel.includes("9 rt"));
  const isOnePlus8Pro = isOnePlus && (lowerModel.includes("8 pro") || lowerModel.includes("8pro"));
  const isOnePlus10R = isOnePlus && (lowerModel.includes("10r") || lowerModel.includes("10 r"));
  const isOnePlusNord6 = isOnePlus && (lowerModel.includes("nord 6") || lowerModel.includes("nord6"));
  const isOnePlus11R = isOnePlus && (lowerModel.includes("11r") || lowerModel.includes("11 r"));
  const isOnePlus10Pro = isOnePlus && (lowerModel.includes("10 pro") || lowerModel.includes("10pro"));
  const isOnePlus11 = isOnePlus && !isOnePlus11R && lowerModel.includes("11");
  const isOnePlusOpen = isOnePlus && lowerModel.includes("open");
  const isOnePlus12R = isOnePlus && (lowerModel.includes("12r") || lowerModel.includes("12 r"));
  const isOnePlus15R = isOnePlus && !isOnePlus12R && (lowerModel.includes("15r") || lowerModel.includes("15 r"));
  const isOnePlus15 = isOnePlus && !isOnePlus12R && !isOnePlus15R && lowerModel.includes("15");
  const isOnePlus13s = isOnePlus && (lowerModel.includes("13s") || lowerModel.includes("13 s"));
  const isOnePlus13R = isOnePlus && !isOnePlus13s && (lowerModel.includes("13r") || lowerModel.includes("13 r"));
  const isOnePlus13 = isOnePlus && !isOnePlus13s && !isOnePlus13R && lowerModel.includes("13");
  const isOnePlus12 = isOnePlus && !isOnePlus12R && lowerModel.includes("12");
  const isVivo = lowerBrand === "vivo" || lowerModel.includes("vivo");
  const isCmf = lowerBrand === "cmf" || lowerModel.includes("cmf");
  const isNothing = lowerBrand === "nothing" || lowerModel.includes("nothing");
  const isNothing4aPro = isNothing && !isCmf && (lowerModel.includes("4a pro") || lowerModel.includes("phone (4a) pro") || lowerModel.includes("phone 4a pro"));
  const isNothing4a = isNothing && !isCmf && !isNothing4aPro && (lowerModel.includes("4a") || lowerModel.includes("phone (4a)") || lowerModel.includes("phone 4a"));
  const isNothing3aPro = isNothing && !isCmf && !isNothing4aPro && !isNothing4a && (lowerModel.includes("3a pro") || lowerModel.includes("phone (3a) pro") || lowerModel.includes("phone 3a pro"));
  const isNothing3 = isNothing && !isCmf && !isNothing4aPro && !isNothing4a && !isNothing3aPro && (lowerModel.includes("phone 3") || lowerModel.includes("phone (3)") || lowerModel.includes("nothing 3"));
  const isNothing3a = isNothing && !isCmf && !isNothing4aPro && !isNothing4a && !isNothing3aPro && !isNothing3 && (lowerModel.includes("3a") || lowerModel.includes("phone (3a)") || lowerModel.includes("phone 3a"));
  const isNothing2aPlus = isNothing && !isCmf && !isNothing4aPro && !isNothing4a && !isNothing3aPro && !isNothing3 && !isNothing3a && (lowerModel.includes("2a plus") || lowerModel.includes("phone (2a) plus") || lowerModel.includes("phone 2a plus"));
  const isNothing2a = isNothing && !isCmf && !isNothing4aPro && !isNothing4a && !isNothing3aPro && !isNothing3 && !isNothing3a && !isNothing2aPlus && (lowerModel.includes("2a") || lowerModel.includes("phone (2a)") || lowerModel.includes("phone 2a"));
  const isNothing2 = isNothing && !isCmf && !isNothing4aPro && !isNothing4a && !isNothing3aPro && !isNothing3 && !isNothing3a && !isNothing2aPlus && !isNothing2a && (lowerModel.includes("phone 2") || lowerModel.includes("phone (2)") || lowerModel.includes("nothing 2"));
  const isNothing1 = isNothing && !isCmf && !isNothing4aPro && !isNothing4a && !isNothing3aPro && !isNothing3 && !isNothing3a && !isNothing2aPlus && !isNothing2a && !isNothing2;
  const isFoldable = lowerModel.includes("fold") || lowerModel.includes("flip") || lowerModel.includes("open");
  const isUltra = lowerModel.includes("ultra");
  const isFE = lowerModel.includes("fe");
  const isEdge = lowerModel.includes("edge");
  const isPlus = lowerModel.includes("plus") || lowerModel.includes("+");
  const isS26Ultra = lowerModel.includes("s26 ultra");
  const isS26 = lowerModel.includes("s26") && !isS26Ultra;
  const isS24Ultra = lowerModel.includes("s24 ultra");
  const isSPlus = (lowerModel.includes("galaxy s") || lowerModel.includes("s2")) && isPlus;
  const isSUltra = (lowerModel.includes("galaxy s") || lowerModel.includes("s2")) && isUltra;
  const isSSeries = (lowerModel.includes("galaxy s") || lowerModel.includes("s2")) && !isFE && !isEdge && !isPlus && !isUltra;
  const isProMax = lowerModel.includes("pro max");

  let ageConfig: Record<string, number> = pricingConfig.ageBonus;
  if (isFoldable) ageConfig = pricingConfig.foldableAgeBonus;
  else if (isOnePlusNord5 || isOnePlusNord4 || isOnePlusNord6 || isOnePlus11R || isOnePlus11 || isOnePlus15R || isOnePlus15 || isOnePlus13s || isOnePlus13R || isOnePlus13) ageConfig = pricingConfig.oneplus13SeriesAgeBonus;
  else if (isVivo) ageConfig = pricingConfig.vivoSeriesAgeBonus;
  else if (isNothing4aPro) ageConfig = pricingConfig.nothing4aProSeriesAgeBonus;
  else if (isNothing4a) ageConfig = pricingConfig.nothing4aSeriesAgeBonus;
  else if (isNothing3aPro) ageConfig = pricingConfig.nothing3aProSeriesAgeBonus;
  else if (isNothing3) ageConfig = pricingConfig.nothing3SeriesAgeBonus;
  else if (isNothing3a) ageConfig = pricingConfig.nothing3aSeriesAgeBonus;
  else if (isNothing2aPlus) ageConfig = pricingConfig.nothing2aPlusSeriesAgeBonus;
  else if (isCmf) ageConfig = pricingConfig.cmfSeriesAgeBonus;
  else if (isNothing2a) ageConfig = pricingConfig.nothing2aSeriesAgeBonus;
  else if (isNothing2) ageConfig = pricingConfig.nothing2SeriesAgeBonus;
  else if (isNothing1) ageConfig = pricingConfig.nothing1SeriesAgeBonus;
  else if (isS26Ultra) ageConfig = pricingConfig.s26UltraSeriesAgeBonus;
  else if (isS24Ultra) ageConfig = pricingConfig.s24UltraSeriesAgeBonus;
  else if (isSUltra) ageConfig = pricingConfig.sUltraSeriesAgeBonus;
  else if (isSPlus) ageConfig = pricingConfig.sPlusSeriesAgeBonus;
  else if (isEdge) ageConfig = pricingConfig.edgeSeriesAgeBonus;
  else if (isFE) ageConfig = pricingConfig.feSeriesAgeBonus;
  else if (isSSeries) ageConfig = pricingConfig.sSeriesAgeBonus;

  const params = isApple ? getAppleModelParams(safeModel) : getAndroidModelParams(safeBrand, safeModel);
  const bodyScale = params.bodyScale || params.physicalScale;

  const applyGranularDefects = (scale: number, bScale: number) => {
    let sum = 0;
    const defectsList = diagnostics.defects || [];
    defectsList.forEach((d) => {
      let penalty = (pricingConfig.defects_screen_body as any)[d] || 0;
      if (d === "screen_scratch" && diagnostics.screenCondition) {
        if (diagnostics.screenCondition.includes("More than 2")) {
          penalty = isOnePlusNord5 ? 0.111039395388 : isOnePlus10T ? 0.002341203000 : isOnePlus9Pro ? 0.062196641305 : isOnePlusNord4 ? 0.108974012628 : isOnePlus9RT ? 0.067240822911 : isOnePlus8Pro ? 0.050517725105 : isOnePlus10R ? 0.029113794344 : isOnePlusNord6 ? 0.124291757061 : isOnePlus11R ? 0.079284857791 : isOnePlus10Pro ? 0.063883725669 : isOnePlus11 ? 0.083926265897 : isOnePlusOpen ? 0.0805989102787 : isOnePlus12R ? 0.156639087903 : isOnePlus13R ? 0.161924501442 : isNothing4aPro ? 0.11273520779030486 : isNothing4a ? 0.14839240521691046 : isNothing3aPro ? 0.18849750425029136 : isNothing3 ? 0.13228553599888876 : isNothing3a ? 0.21158221565307447 : isNothing2aPlus ? 0.11963658133380492 : isCmf ? 0.19980314960629921 : isNothing2a ? 0.12721626200000000 : isNothing2 ? 0.09358417752050169 : isNothing1 ? 0.09352517985611511 : lowerModel.includes("17") ? 0.12856 : isSUltra ? 0.018754186202277293 : 0.2635;
        } else if (diagnostics.screenCondition.includes("1-2")) {
          penalty = (isNothing || isCmf) ? 0.05 : 0.15;
        } else {
          penalty = 0.25;
        }
      }
      if (d === "body_scratch") {
        let scratchPenalty = 0;
        let dentPenalty = 0;
        
        if (diagnostics.bodyScratches === "More than 2 scratches" || diagnostics.bodyScratches === "More than 2") {
          scratchPenalty = isS26Ultra ? 0.015111111111111112 : isS24Ultra ? 0.005932864949258392 : isSPlus ? 0.01041666667 : 0.02116;
        } else if (diagnostics.bodyScratches === "1-2 scratches" || diagnostics.bodyScratches === "1-2") {
          scratchPenalty = isOnePlus15R ? 0.0095012762142298 : isFoldable ? 0.01979899 : isS24Ultra ? 0.01873536300078064 : isSUltra ? 0.0150167448 : isEdge ? 0.011100292112956 : isSPlus ? 0.0168489583333333 : isS26 ? 0.018677685950413223 : isSSeries ? 0.0167718 : 0.01;
        } else {
          scratchPenalty = 0.05;
        }
        
        if (diagnostics.bodyDents === "Major dent(s) or more than 2") dentPenalty = isProMax ? 0.02861 : 0.04232;
        else if (diagnostics.bodyDents === "1-2 minor dents" || diagnostics.bodyDents === "1-2") {
          dentPenalty = isSUltra ? 0.0147220368 : isSPlus ? 0.0078125 : (isProMax ? 0.015 : 0.02);
        }
        
        if (diagnostics.bodyScratches === "No scratches" || diagnostics.bodyScratches === "No" || !diagnostics.bodyScratches) scratchPenalty = 0;
        if (diagnostics.bodyDents === "No dents" || diagnostics.bodyDents === "No" || !diagnostics.bodyDents) dentPenalty = 0;
        
        penalty = (scratchPenalty + dentPenalty) * (bScale / scale);
      }
      
      const foldableScreenMult = isFoldable ? 3 : 1;
      if (d === "screen_scratch" || d === "screen_spot" || d === "panel_missing") {
        penalty *= foldableScreenMult;
      }
      if ((diagnostics.originalScreen === false || diagnostics.touch === false) && d !== "body_scratch" && d !== "panel_missing") {
        penalty = 0;
      }
      sum += penalty * scale;
    });
    return sum;
  };

  const hasValidBill = diagnostics.validBill === true || (diagnostics.accessories || []).includes("bill");

  const isOutOfWarranty = diagnostics.warranty === false || diagnostics.mobileAge === 'above11';

  if (isOutOfWarranty) {
    if (isS24Ultra) {
      age_multiplier = hasValidBill ? ageConfig["above11_bill"] : ageConfig["above11_nobill"];
    } else {
      age_multiplier = ageConfig["above11"];
    }
  } else if (diagnostics.mobileAge) {
    const ageKey = String(diagnostics.mobileAge).toLowerCase();
    if (ageKey.includes("below 3") || ageKey.includes("below3")) age_multiplier = ageConfig["below3"];
    else if (ageKey.includes("3") && ageKey.includes("6")) age_multiplier = ageConfig["3to6"];
    else if (ageKey.includes("6") && ageKey.includes("11")) age_multiplier = ageConfig["6to11"];
    else age_multiplier = ageConfig["above11"];
  } else {
    age_multiplier = ageConfig["below3"] || ageConfig["above11"];
  }
  
  if (!hasValidBill) {
    if (diagnostics.warranty !== false) {
      if (isSUltra) age_multiplier -= 0.1265558194774347;
      else age_multiplier -= params.gstBillPenalty;
    }
  }

  calls_multiplier = diagnostics.calls === false ? params.callsPenalty : 1;
  touch_multiplier = diagnostics.touch === false ? params.touchPenalty : 1;
  screen_orig_mult = diagnostics.originalScreen === false ? params.originalScreenPenalty : 1;
  if (diagnostics.touch === false || (diagnostics.defects || []).includes("broken_screen")) {
    screen_orig_mult = 1;
  }
  
  screen_body_sum = applyGranularDefects(params.physicalScale, bodyScale);
  if (isFoldable && diagnostics.originalScreen === false) {
    screen_orig_mult = Math.min(screen_orig_mult, 0.35);
  }

  const hardwareList = diagnostics.hardware || [];
  hardwareList.forEach((h) => {
    if (isFoldable && isVivo) {
      if (h === "battery_health" || h === "battery_service" || h === "battery") {
        functional_sum += 0.02992159060803527;
      }
    } else if (isOnePlusNord5 || isOnePlus10T || isOnePlus9Pro || isOnePlusNord4 || isOnePlus9RT || isOnePlus8Pro || isOnePlus10R || isOnePlusNord6 || isOnePlus11R || isOnePlus10Pro || isOnePlus11 || isOnePlusOpen || isOnePlus12R || isOnePlus15R || isOnePlus15 || isOnePlus13s || isOnePlus13R || isOnePlus13 || isOnePlus12 || isNothing4aPro || isNothing4a || isNothing3aPro || isNothing3 || isNothing3a || isNothing2aPlus || isCmf || isNothing2a) {
      if (h === "front_camera") functional_sum += 0.06583850931677018;
      else if (h === "back_camera") functional_sum += 0.18272162620000000;
      else if (h === "battery_health" || h === "battery_service" || h === "battery") functional_sum += 0.06205533596837944;
    } else if (isNothing2) {
      if (h === "front_camera") functional_sum += 0.06538350217076699;
      else if (h === "back_camera") functional_sum += 0.18263386396526773;
      else if (h === "battery_health" || h === "battery_service" || h === "battery") functional_sum += 0.06200675349734684;
    } else if (isNothing1) {
      if (h === "front_camera") functional_sum += 0.05899280575539568;
      else if (h === "back_camera") functional_sum += 0.13525179856115108;
      else if (h === "battery_health" || h === "battery_service" || h === "battery") functional_sum += 0.04964028776978417;
    } else if (h in pricingConfig.defects_functional) {
      let penalty = (pricingConfig.defects_functional as any)[h] * params.functionalScale;
      functional_sum += penalty;
    }
  });

  const box_bonus = (diagnostics.accessories || []).includes("box") || diagnostics.box === true ? pricingConfig.bonuses.box : 0;
  
  const calls_penalty_val = 1 - calls_multiplier;
  const touch_penalty_val = 1 - touch_multiplier;
  const screen_orig_penalty_val = 1 - screen_orig_mult;
  
  let total_penalty_sum = calls_penalty_val + touch_penalty_val + screen_orig_penalty_val + screen_body_sum + functional_sum;

  const rawCalculated = basePrice * age_multiplier * Math.max(0, 1 - total_penalty_sum);
  let cashifyPrice = rawCalculated + box_bonus;

  if (diagnostics.calls === false && !lowerModel.includes("16")) {
    const deadPrice = isApple ? 1200 : basePrice <= 5000 ? 200 : 1200;
    return {
      cashifyBasePrice: deadPrice,
      fhoneifyPrice: deadPrice
    };
  }

  const exactCashifyPrice = Math.round(cashifyPrice);

  let upliftPercent = 1;
  if (basePrice <= 20000) upliftPercent = 1.08;
  else if (basePrice <= 50000) upliftPercent = 1.06;
  else upliftPercent = 1.04;
  
  let fhoneifyExtra = exactCashifyPrice * (upliftPercent - 1);
  if (fhoneifyExtra > 2000) fhoneifyExtra = 2000;
  if (fhoneifyExtra < 100 && exactCashifyPrice > 1200) fhoneifyExtra = 100;
  
  const fhoneifyPrice = Math.max(Math.round(exactCashifyPrice + fhoneifyExtra), floor_price);

  return {
    cashifyBasePrice: exactCashifyPrice,
    fhoneifyPrice: fhoneifyPrice
  };
}
