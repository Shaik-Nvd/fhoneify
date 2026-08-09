"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAndroidModelParams = exports.getAppleModelParams = exports.pricingConfig = void 0;
exports.calculateFhoneifyPrice = calculateFhoneifyPrice;
/**
 * Fhoneify Production Pricing Engine Algorithm
 * Calibrated against Cashify reverse logic for Apple, Samsung, Nothing, CMF, and Nothing 4a Pro devices.
 */
exports.pricingConfig = {
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
    nothing4aProSeriesAgeBonus: {
        below3: 0.98,
        "3to6": 0.95,
        "6to11": 0.92,
        above11: 0.88
    },
    nothing4aSeriesAgeBonus: {
        below3: 0.98,
        "3to6": 0.95,
        "6to11": 0.92,
        above11: 0.88
    },
    nothing3aProSeriesAgeBonus: {
        below3: 0.98,
        "3to6": 0.95,
        "6to11": 0.92,
        above11: 0.88
    },
    nothing3SeriesAgeBonus: {
        below3: 0.98,
        "3to6": 0.95,
        "6to11": 0.92,
        above11: 0.88
    },
    nothing3aSeriesAgeBonus: {
        below3: 0.98,
        "3to6": 0.95,
        "6to11": 0.92,
        above11: 0.88
    },
    nothing2aPlusSeriesAgeBonus: {
        below3: 0.98,
        "3to6": 0.95,
        "6to11": 0.92,
        above11: 0.88
    },
    cmfSeriesAgeBonus: {
        below3: 0.98,
        "3to6": 0.95,
        "6to11": 0.92,
        above11: 0.88
    },
    nothing2aSeriesAgeBonus: {
        below3: 0.98,
        "3to6": 0.95,
        "6to11": 0.92,
        above11: 0.88
    },
    nothing2SeriesAgeBonus: {
        below3: 0.98,
        "3to6": 0.95,
        "6to11": 0.92,
        above11: 0.88
    },
    nothing1SeriesAgeBonus: {
        below3: 0.98,
        "3to6": 0.93,
        "6to11": 0.90,
        above11: 0.8805755395683453
    },
    foldableAgeBonus: {
        below3: 0.98,
        "3to6": 0.925,
        "6to11": 0.8845226,
        above11: 0.7902512
    },
    s26UltraSeriesAgeBonus: {
        below3: 0.95,
        "3to6": 0.9063182897862233,
        "6to11": 0.8907363420427553,
        above11: 0.8139316811781648
    },
    sUltraSeriesAgeBonus: {
        below3: 0.98,
        "3to6": 0.93,
        "6to11": 0.90,
        above11: 0.8139316811781648
    },
    s24UltraSeriesAgeBonus: {
        below3: 0.98,
        "3to6": 0.93,
        "6to11": 0.89,
        above11_bill: 0.8032786885245902,
        above11_nobill: 0.8188914910226385
    },
    sPlusSeriesAgeBonus: {
        below3: 0.98,
        "3to6": 0.91315104167,
        "6to11": 0.8979591836,
        above11: 0.7760816326
    },
    sSeriesAgeBonus: {
        below3: 0.95,
        "3to6": 0.9095510204,
        "6to11": 0.8979591836,
        above11: 0.7760816326
    },
    feSeriesAgeBonus: {
        below3: 0.94,
        "3to6": 0.895,
        "6to11": 0.86310559,
        above11: 0.75701863
    },
    edgeSeriesAgeBonus: {
        below3: 0.96,
        "3to6": 0.935,
        "6to11": 0.923466114868,
        above11: 0.79668938657
    },
    bonuses: {
        box: 380
    },
    modelFloorPrice: 100
};
// 1. Apple Device Base Parameters
var getAppleModelParams = function (model) {
    var lowerModel = String(model || "").toLowerCase();
    var params = {
        warrantyPenalty: 0.05,
        gstBillPenalty: 0.02,
        callsPenalty: 0.55,
        originalScreenPenalty: 0.7,
        touchPenalty: 0.55,
        functionalScale: 1.15,
        physicalScale: 1.15
    };
    var isPro = lowerModel.includes("pro");
    var isProMax = lowerModel.includes("pro max");
    var isPlus = lowerModel.includes("plus");
    if (lowerModel.includes("17e")) {
        params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.25, originalScreenPenalty: 0.4554, touchPenalty: 0.215, functionalScale: 1.5, physicalScale: 1.5 };
    }
    else if (lowerModel.includes("16e")) {
        params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.25, originalScreenPenalty: 0.4336, touchPenalty: 0.22, functionalScale: 1.5, physicalScale: 1.5 };
    }
    else if (lowerModel.includes("17")) {
        if (isProMax || isPlus) {
            params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.45, originalScreenPenalty: 0.58, touchPenalty: 0.61485, functionalScale: 1.15, physicalScale: 1.11392, facePenalty: 0.05 };
        }
        else if (isPro) {
            params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.45, originalScreenPenalty: 0.6, touchPenalty: 0.61485, functionalScale: 1.15, physicalScale: 1.05, facePenalty: 0.05 };
        }
        else {
            params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.5, originalScreenPenalty: 0.65, touchPenalty: 0.61485, functionalScale: 1.1, physicalScale: 1.05, facePenalty: 0.05 };
        }
    }
    else if (lowerModel.includes("16") || lowerModel.includes("15")) {
        if (lowerModel.includes("16 pro max")) {
            params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.5, originalScreenPenalty: 0.782, touchPenalty: 0.635, functionalScale: 1.09, physicalScale: 1.08303, bodyScale: 0.9806, facePenalty: 0.257307 };
        }
        else if (isProMax) {
            params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.5, originalScreenPenalty: 0.8176, touchPenalty: 0.635, functionalScale: 1.09, physicalScale: 1.05692, bodyScale: 0.9806, facePenalty: 0.257307 };
        }
        else if (isPro || isPlus) {
            params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.5, originalScreenPenalty: 0.65, touchPenalty: 0.55, functionalScale: 1.05, physicalScale: 1.05 };
        }
        else if (lowerModel === "apple iphone 15" || lowerModel === "iphone 15") {
            params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.55, originalScreenPenalty: 0.56465, touchPenalty: 0.59355, functionalScale: 1, physicalScale: 1 };
        }
        else {
            params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.55, originalScreenPenalty: 0.7, touchPenalty: 0.55, functionalScale: 1, physicalScale: 1 };
        }
    }
    else if (lowerModel.includes("14")) {
        if (isProMax || isPlus) {
            params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.45, originalScreenPenalty: 0.55, touchPenalty: 0.5463, functionalScale: 1.25, physicalScale: 1.25 };
        }
        else {
            params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.6, originalScreenPenalty: 0.6681, touchPenalty: 0.6, functionalScale: 1.2, physicalScale: 1.2 };
        }
    }
    else {
        params = { warrantyPenalty: 0, gstBillPenalty: 0, callsPenalty: 0.6, originalScreenPenalty: 0.7, touchPenalty: 0.5, functionalScale: 0.8, physicalScale: 0.8 };
    }
    return params;
};
exports.getAppleModelParams = getAppleModelParams;
// 2. Android Device Base Parameters
var getAndroidModelParams = function (brand, model) {
    var lowerBrand = String(brand || "").toLowerCase();
    var lowerModel = String(model || "").toLowerCase();
    var params = {
        warrantyPenalty: 0.1,
        gstBillPenalty: 0.05,
        callsPenalty: 0.5,
        originalScreenPenalty: 0.6,
        touchPenalty: 0.4,
        functionalScale: 0.8,
        physicalScale: 0.75
    };
    if (lowerBrand === "cmf" || lowerModel.includes("cmf")) {
        params = {
            warrantyPenalty: 0.1,
            gstBillPenalty: 0.223828345567476,
            callsPenalty: 0.5,
            originalScreenPenalty: 0.4410,
            touchPenalty: 0.3670,
            functionalScale: 1.0,
            physicalScale: 1.0
        };
    }
    else if (lowerBrand === "nothing" || lowerModel.includes("nothing")) {
        if (lowerModel.includes("4a pro") || lowerModel.includes("phone (4a) pro") || lowerModel.includes("phone 4a pro")) {
            params = {
                warrantyPenalty: 0.1,
                gstBillPenalty: 0.223828345567476,
                callsPenalty: 0.5,
                originalScreenPenalty: 0.6050,
                touchPenalty: 0.5270,
                functionalScale: 1.0,
                physicalScale: 1.0
            };
        }
        else if (lowerModel.includes("4a") || lowerModel.includes("phone (4a)") || lowerModel.includes("phone 4a")) {
            params = {
                warrantyPenalty: 0.1,
                gstBillPenalty: 0.223828345567476,
                callsPenalty: 0.5,
                originalScreenPenalty: 0.5670,
                touchPenalty: 0.4480,
                functionalScale: 1.0,
                physicalScale: 1.0
            };
        }
        else if (lowerModel.includes("3a pro") || lowerModel.includes("phone (3a) pro") || lowerModel.includes("phone 3a pro")) {
            params = {
                warrantyPenalty: 0.1,
                gstBillPenalty: 0.223828345567476,
                callsPenalty: 0.5,
                originalScreenPenalty: 0.5240,
                touchPenalty: 0.3780,
                functionalScale: 1.0,
                physicalScale: 1.0
            };
        }
        else if (lowerModel.includes("3a") || lowerModel.includes("phone (3a)") || lowerModel.includes("phone 3a")) {
            params = {
                warrantyPenalty: 0.1,
                gstBillPenalty: 0.223828345567476,
                callsPenalty: 0.5,
                originalScreenPenalty: 0.4990,
                touchPenalty: 0.3760,
                functionalScale: 1.0,
                physicalScale: 1.0
            };
        }
        else if (lowerModel.includes("phone 3") || lowerModel.includes("phone (3)") || lowerModel.includes("nothing 3")) {
            params = {
                warrantyPenalty: 0.1,
                gstBillPenalty: 0.223828345567476,
                callsPenalty: 0.5,
                originalScreenPenalty: 0.5690,
                touchPenalty: 0.4860,
                functionalScale: 1.0,
                physicalScale: 1.0
            };
        }
        else if (lowerModel.includes("2a plus") || lowerModel.includes("phone (2a) plus") || lowerModel.includes("phone 2a plus")) {
            params = {
                warrantyPenalty: 0.1,
                gstBillPenalty: 0.223828345567476,
                callsPenalty: 0.5,
                originalScreenPenalty: 0.5160,
                touchPenalty: 0.3800,
                functionalScale: 1.0,
                physicalScale: 1.0
            };
        }
        else if (lowerModel.includes("2a") || lowerModel.includes("phone (2a)") || lowerModel.includes("phone 2a")) {
            params = {
                warrantyPenalty: 0.1,
                gstBillPenalty: 0.223828345567476,
                callsPenalty: 0.5,
                originalScreenPenalty: 0.5060,
                touchPenalty: 0.3800,
                functionalScale: 1.0,
                physicalScale: 1.0
            };
        }
        else if (lowerModel.includes("phone 2") || lowerModel.includes("phone (2)") || lowerModel.includes("nothing 2")) {
            params = {
                warrantyPenalty: 0.1,
                gstBillPenalty: 0.2238302026049204,
                callsPenalty: 0.5,
                originalScreenPenalty: 0.5620,
                touchPenalty: 0.4010,
                functionalScale: 1.0,
                physicalScale: 1.0
            };
        }
        else {
            params = {
                warrantyPenalty: 0.1,
                gstBillPenalty: 0.05,
                callsPenalty: 0.5,
                originalScreenPenalty: 0.6560,
                touchPenalty: 0.3820,
                functionalScale: 1.0,
                physicalScale: 1.0
            };
        }
    }
    else if (lowerBrand === "samsung") {
        var isUltra = lowerModel.includes("ultra");
        var isS = lowerModel.includes("galaxy s") || lowerModel.includes("s2") || lowerModel.includes("s1") || lowerModel.includes("s9") || lowerModel.includes("s8");
        var isZ = lowerModel.includes("fold") || lowerModel.includes("flip");
        var isFE = lowerModel.includes("fe");
        var isEdge = lowerModel.includes("edge");
        var isPlus = lowerModel.includes("plus") || lowerModel.includes("+");
        if (isUltra) {
            params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.5, originalScreenPenalty: 0.6, touchPenalty: 0.3, functionalScale: 1.2, physicalScale: 1.2 };
        }
        else if (isPlus) {
            params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.5, originalScreenPenalty: 0.6, touchPenalty: 0.3, functionalScale: 1.1, physicalScale: 1.1 };
        }
        else if (isEdge) {
            params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.5, originalScreenPenalty: 0.6, touchPenalty: 0.35, functionalScale: 1.0, physicalScale: 1.11 };
        }
        else if (isFE) {
            params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.5, originalScreenPenalty: 0.6, touchPenalty: 0.35, functionalScale: 0.9, physicalScale: 0.986 };
        }
        else if (isS || isZ) {
            params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.5, originalScreenPenalty: 0.6, touchPenalty: 0.3, functionalScale: 1.1, physicalScale: 1.1 };
        }
        else {
            params = { warrantyPenalty: 0.1, gstBillPenalty: 0.05, callsPenalty: 0.55, originalScreenPenalty: 0.65, touchPenalty: 0.35, functionalScale: 0.75, physicalScale: 0.75 };
        }
    }
    else if (lowerBrand === "oneplus") {
        var isPro = lowerModel.includes("pro");
        var isFold = lowerModel.includes("open") || lowerModel.includes("fold");
        if (isPro || isFold) {
            params = { warrantyPenalty: 0.1, gstBillPenalty: 0.05, callsPenalty: 0.5, originalScreenPenalty: 0.6, touchPenalty: 0.4, functionalScale: 0.95, physicalScale: 0.95 };
        }
        else {
            params = { warrantyPenalty: 0.1, gstBillPenalty: 0.05, callsPenalty: 0.5, originalScreenPenalty: 0.6, touchPenalty: 0.4, functionalScale: 0.85, physicalScale: 0.8 };
        }
    }
    else {
        params = { warrantyPenalty: 0.12, gstBillPenalty: 0.08, callsPenalty: 0.45, originalScreenPenalty: 0.55, touchPenalty: 0.45, functionalScale: 0.75, physicalScale: 0.7 };
    }
    return params;
};
exports.getAndroidModelParams = getAndroidModelParams;
// 3. Main Algorithm Execution Function
function calculateFhoneifyPrice(brand, model, basePrice, diagnostics) {
    if (!basePrice || basePrice <= 0)
        return { cashifyBasePrice: 0, fhoneifyPrice: 0 };
    var floor_price = exports.pricingConfig.modelFloorPrice;
    var age_multiplier = 1;
    var calls_multiplier = 1;
    var touch_multiplier = 1;
    var screen_orig_mult = 1;
    var screen_body_sum = 0;
    var functional_sum = 0;
    var safeBrand = String(brand || "");
    var safeModel = String(model || "");
    var lowerModel = safeModel.toLowerCase();
    var lowerBrand = safeBrand.toLowerCase();
    var isApple = lowerBrand === "apple";
    var isCmf = lowerBrand === "cmf" || lowerModel.includes("cmf");
    var isNothing = lowerBrand === "nothing" || lowerModel.includes("nothing");
    var isNothing4aPro = isNothing && !isCmf && (lowerModel.includes("4a pro") || lowerModel.includes("phone (4a) pro") || lowerModel.includes("phone 4a pro"));
    var isNothing4a = isNothing && !isCmf && !isNothing4aPro && (lowerModel.includes("4a") || lowerModel.includes("phone (4a)") || lowerModel.includes("phone 4a"));
    var isNothing3aPro = isNothing && !isCmf && !isNothing4aPro && !isNothing4a && (lowerModel.includes("3a pro") || lowerModel.includes("phone (3a) pro") || lowerModel.includes("phone 3a pro"));
    var isNothing3a = isNothing && !isCmf && !isNothing4aPro && !isNothing4a && !isNothing3aPro && (lowerModel.includes("3a") || lowerModel.includes("phone (3a)") || lowerModel.includes("phone 3a"));
    var isNothing3 = isNothing && !isCmf && !isNothing4aPro && !isNothing4a && !isNothing3aPro && !isNothing3a && (lowerModel.includes("phone 3") || lowerModel.includes("phone (3)") || lowerModel.includes("nothing 3"));
    var isNothing2aPlus = isNothing && !isCmf && !isNothing4aPro && !isNothing4a && !isNothing3aPro && !isNothing3a && !isNothing3 && (lowerModel.includes("2a plus") || lowerModel.includes("phone (2a) plus") || lowerModel.includes("phone 2a plus"));
    var isNothing2a = isNothing && !isCmf && !isNothing4aPro && !isNothing4a && !isNothing3aPro && !isNothing3a && !isNothing3 && !isNothing2aPlus && (lowerModel.includes("2a") || lowerModel.includes("phone (2a)") || lowerModel.includes("phone 2a"));
    var isNothing2 = isNothing && !isCmf && !isNothing4aPro && !isNothing4a && !isNothing3aPro && !isNothing3a && !isNothing3 && !isNothing2aPlus && !isNothing2a && (lowerModel.includes("phone 2") || lowerModel.includes("phone (2)") || lowerModel.includes("nothing 2"));
    var isNothing1 = isNothing && !isCmf && !isNothing4aPro && !isNothing4a && !isNothing3aPro && !isNothing3a && !isNothing3 && !isNothing2aPlus && !isNothing2a && !isNothing2;
    var isFoldable = lowerModel.includes("fold") || lowerModel.includes("flip") || lowerModel.includes("open");
    var isUltra = lowerModel.includes("ultra");
    var isFE = lowerModel.includes("fe");
    var isEdge = lowerModel.includes("edge");
    var isPlus = lowerModel.includes("plus") || lowerModel.includes("+");
    var isS26Ultra = lowerModel.includes("s26 ultra");
    var isS24Ultra = lowerModel.includes("s24 ultra");
    var isSPlus = (lowerModel.includes("galaxy s") || lowerModel.includes("s2")) && isPlus;
    var isSUltra = (lowerModel.includes("galaxy s") || lowerModel.includes("s2")) && isUltra;
    var isSSeries = (lowerModel.includes("galaxy s") || lowerModel.includes("s2")) && !isFE && !isEdge && !isPlus && !isUltra;
    var isProMax = lowerModel.includes("pro max");
    // Determine appropriate age configuration map
    var ageConfig = exports.pricingConfig.ageBonus;
    if (isNothing4aPro)
        ageConfig = exports.pricingConfig.nothing4aProSeriesAgeBonus;
    else if (isNothing4a)
        ageConfig = exports.pricingConfig.nothing4aSeriesAgeBonus;
    else if (isNothing3aPro)
        ageConfig = exports.pricingConfig.nothing3aProSeriesAgeBonus;
    else if (isNothing3)
        ageConfig = exports.pricingConfig.nothing3SeriesAgeBonus;
    else if (isNothing3a)
        ageConfig = exports.pricingConfig.nothing3aSeriesAgeBonus;
    else if (isNothing2aPlus)
        ageConfig = exports.pricingConfig.nothing2aPlusSeriesAgeBonus;
    else if (isCmf)
        ageConfig = exports.pricingConfig.cmfSeriesAgeBonus;
    else if (isNothing2a)
        ageConfig = exports.pricingConfig.nothing2aSeriesAgeBonus;
    else if (isNothing2)
        ageConfig = exports.pricingConfig.nothing2SeriesAgeBonus;
    else if (isNothing1)
        ageConfig = exports.pricingConfig.nothing1SeriesAgeBonus;
    else if (isFoldable)
        ageConfig = exports.pricingConfig.foldableAgeBonus;
    else if (isS26Ultra)
        ageConfig = exports.pricingConfig.s26UltraSeriesAgeBonus;
    else if (isS24Ultra)
        ageConfig = exports.pricingConfig.s24UltraSeriesAgeBonus;
    else if (isSUltra)
        ageConfig = exports.pricingConfig.sUltraSeriesAgeBonus;
    else if (isSPlus)
        ageConfig = exports.pricingConfig.sPlusSeriesAgeBonus;
    else if (isEdge)
        ageConfig = exports.pricingConfig.edgeSeriesAgeBonus;
    else if (isFE)
        ageConfig = exports.pricingConfig.feSeriesAgeBonus;
    else if (isSSeries)
        ageConfig = exports.pricingConfig.sSeriesAgeBonus;
    var params = isApple ? (0, exports.getAppleModelParams)(safeModel) : (0, exports.getAndroidModelParams)(safeBrand, safeModel);
    var bodyScale = params.bodyScale || params.physicalScale;
    // Handle Granular Body & Screen Defects
    var applyGranularDefects = function (scale, bScale) {
        var sum = 0;
        var defectsList = diagnostics.defects || [];
        defectsList.forEach(function (d) {
            var penalty = exports.pricingConfig.defects_screen_body[d] || 0;
            if (d === "screen_scratch" && diagnostics.screenCondition) {
                if (diagnostics.screenCondition.includes("More than 2")) {
                    penalty = isNothing4aPro ? 0.1600 : isNothing4a ? 0.1940 : isNothing3aPro ? 0.2320 : isNothing3 ? 0.1790 : isNothing3a ? 0.2540 : isNothing2aPlus ? 0.2370 : isCmf ? 0.3360 : isNothing2a ? 0.2460 : isNothing2 ? 0.1900 : isNothing1 ? 0.0500 : lowerModel.includes("17") ? 0.12856 : isSUltra ? 0.018754186202277293 : 0.2635;
                }
                else if (diagnostics.screenCondition.includes("1-2")) {
                    penalty = (isNothing || isCmf) ? 0.05 : 0.15;
                }
                else {
                    penalty = 0.25;
                }
            }
            if (d === "body_scratch") {
                var scratchPenalty = 0;
                var dentPenalty = 0;
                if (diagnostics.bodyScratches === "More than 2 scratches" || diagnostics.bodyScratches === "More than 2") {
                    scratchPenalty = isS26Ultra ? 0.016152018998218527 : isS24Ultra ? 0.005932864949258392 : isSPlus ? 0.01041666667 : 0.02116;
                }
                else if (diagnostics.bodyScratches === "1-2 scratches" || diagnostics.bodyScratches === "1-2") {
                    scratchPenalty = isFoldable ? 0.01979899 : isS24Ultra ? 0.01873536300078064 : isSUltra ? 0.0150167448 : isEdge ? 0.011100292112956 : isSPlus ? 0.0168489583333333 : isSSeries ? 0.0167718 : 0.01;
                }
                else {
                    scratchPenalty = 0.05;
                }
                if (diagnostics.bodyDents === "Major dent(s) or more than 2")
                    dentPenalty = isProMax ? 0.02861 : 0.04232;
                else if (diagnostics.bodyDents === "1-2 minor dents" || diagnostics.bodyDents === "1-2") {
                    dentPenalty = isSUltra ? 0.0147220368 : isSPlus ? 0.0078125 : (isProMax ? 0.015 : 0.02);
                }
                if (diagnostics.bodyScratches === "No scratches" || diagnostics.bodyScratches === "No" || !diagnostics.bodyScratches)
                    scratchPenalty = 0;
                if (diagnostics.bodyDents === "No dents" || diagnostics.bodyDents === "No" || !diagnostics.bodyDents)
                    dentPenalty = 0;
                penalty = (scratchPenalty + dentPenalty) * (bScale / scale);
            }
            var foldableScreenMult = isFoldable ? 3 : 1;
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
    // Age & Document Deductions
    var hasValidBill = diagnostics.validBill === true || (diagnostics.accessories || []).includes("bill");
    if (diagnostics.warranty === false) {
        if (isS24Ultra) {
            age_multiplier = hasValidBill ? ageConfig["above11_bill"] : ageConfig["above11_nobill"];
        }
        else {
            age_multiplier = ageConfig["above11"];
        }
    }
    else if (diagnostics.mobileAge) {
        var ageKey = String(diagnostics.mobileAge).toLowerCase();
        if (ageKey.includes("below 3") || ageKey.includes("below3"))
            age_multiplier = ageConfig["below3"];
        else if (ageKey.includes("3") && ageKey.includes("6"))
            age_multiplier = ageConfig["3to6"];
        else if (ageKey.includes("6") && ageKey.includes("11"))
            age_multiplier = ageConfig["6to11"];
        else
            age_multiplier = ageConfig["above11"];
    }
    else {
        age_multiplier = ageConfig["below3"] || ageConfig["above11"];
    }
    // Apply GST Bill Penalty
    if (!hasValidBill) {
        if (diagnostics.warranty !== false) {
            if (isSUltra)
                age_multiplier -= 0.1265558194774347;
            else
                age_multiplier -= params.gstBillPenalty;
        }
    }
    // Major Component Multipliers
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
    // Functional Hardware Checks
    var hardwareList = diagnostics.hardware || [];
    hardwareList.forEach(function (h) {
        if (isNothing4aPro || isNothing4a || isNothing3aPro || isNothing3 || isNothing3a || isNothing2aPlus || isCmf || isNothing2a) {
            if (h === "front_camera")
                functional_sum += 0.06583850931677018;
            else if (h === "back_camera")
                functional_sum += 0.18272162620000000;
            else if (h === "battery_health" || h === "battery_service" || h === "battery")
                functional_sum += 0.06205533596837944;
        }
        else if (isNothing2) {
            if (h === "front_camera")
                functional_sum += 0.06538350217076699;
            else if (h === "back_camera")
                functional_sum += 0.18263386396526773;
            else if (h === "battery_health" || h === "battery_service" || h === "battery")
                functional_sum += 0.06200675349734684;
        }
        else if (isNothing1) {
            if (h === "front_camera")
                functional_sum += 0.05899280575539568;
            else if (h === "back_camera")
                functional_sum += 0.13525179856115108;
            else if (h === "battery_health" || h === "battery_service" || h === "battery")
                functional_sum += 0.04964028776978417;
        }
        else if (h in exports.pricingConfig.defects_functional) {
            var penalty = exports.pricingConfig.defects_functional[h] * params.functionalScale;
            functional_sum += penalty;
        }
    });
    var box_bonus = (diagnostics.accessories || []).includes("box") || diagnostics.box === true ? exports.pricingConfig.bonuses.box : 0;
    var calls_penalty_val = 1 - calls_multiplier;
    var touch_penalty_val = 1 - touch_multiplier;
    var screen_orig_penalty_val = 1 - screen_orig_mult;
    var total_penalty_sum = calls_penalty_val + touch_penalty_val + screen_orig_penalty_val + screen_body_sum + functional_sum;
    // Calculate Base Cashify Depreciation
    var rawCalculated = basePrice * age_multiplier * Math.max(0, 1 - total_penalty_sum);
    var cashifyPrice = rawCalculated + box_bonus;
    // Dead Network Failsafe
    if (diagnostics.calls === false && !lowerModel.includes("16")) {
        cashifyPrice = isApple ? 1200 : basePrice <= 5000 ? 200 : 1200;
    }
    // Round Cashify Base Price
    var exactCashifyPrice = Math.round(cashifyPrice);
    // Fhoneify Competitor Uplift Margin Logic
    var upliftPercent = 1;
    if (basePrice <= 20000)
        upliftPercent = 1.08;
    else if (basePrice <= 50000)
        upliftPercent = 1.06;
    else
        upliftPercent = 1.04;
    var fhoneifyExtra = exactCashifyPrice * (upliftPercent - 1);
    if (fhoneifyExtra > 2000)
        fhoneifyExtra = 2000;
    if (fhoneifyExtra < 100 && exactCashifyPrice > 1200)
        fhoneifyExtra = 100;
    var fhoneifyPrice = Math.max(Math.round(exactCashifyPrice + fhoneifyExtra), floor_price);
    return {
        cashifyBasePrice: exactCashifyPrice,
        fhoneifyPrice: fhoneifyPrice
    };
}
