"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAndroidModelParams = exports.getAppleModelParams = void 0;
exports.calculateFhoneifyPrice = calculateFhoneifyPrice;
var pricingConfig_json_1 = __importDefault(require("./pricingConfig.json"));
var getAppleModelParams = function (model) {
    var lowerModel = String(model || '').toLowerCase();
    var params = {
        warrantyPenalty: 0.05,
        gstBillPenalty: 0.02,
        callsPenalty: 0.55,
        originalScreenPenalty: 0.70,
        touchPenalty: 0.55,
        functionalScale: 1.15,
        physicalScale: 1.15,
    };
    var isPro = lowerModel.includes('pro');
    var isProMax = lowerModel.includes('pro max');
    var isPlus = lowerModel.includes('plus');
    params = {
        warrantyPenalty: 0.0, gstBillPenalty: 0.0, callsPenalty: 0.50, originalScreenPenalty: 0.70, touchPenalty: 0.55, functionalScale: 1.15, physicalScale: 1.15,
    };
    if (lowerModel.includes('17e')) {
        params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.25, originalScreenPenalty: 0.4554, touchPenalty: 0.215, functionalScale: 1.50, physicalScale: 1.50 };
    }
    else if (lowerModel.includes('16e')) {
        params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.25, originalScreenPenalty: 0.4336, touchPenalty: 0.22, functionalScale: 1.50, physicalScale: 1.50 };
    }
    else if (lowerModel.includes('14')) {
        if (isProMax || isPlus) {
            params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.45, originalScreenPenalty: 0.55, touchPenalty: 0.45, functionalScale: 1.25, physicalScale: 1.25 };
        }
        else {
            params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.60, originalScreenPenalty: 0.6681, touchPenalty: 0.60, functionalScale: 1.20, physicalScale: 1.20 };
        }
    }
    else if (lowerModel.includes('17')) {
        if (isProMax || isPlus) {
            params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.45, originalScreenPenalty: 0.55, touchPenalty: 0.45, functionalScale: 1.25, physicalScale: 1.25 };
        }
        else if (isPro) {
            params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.45, originalScreenPenalty: 0.60, touchPenalty: 0.50, functionalScale: 1.20, physicalScale: 1.20 };
        }
        else {
            params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.50, originalScreenPenalty: 0.65, touchPenalty: 0.50, functionalScale: 1.15, physicalScale: 1.15 };
        }
    }
    else if (lowerModel.includes('16') || lowerModel.includes('15') || lowerModel.includes('14')) {
        if (lowerModel === 'apple iphone 16 pro max' || lowerModel === 'iphone 16 pro max') {
            // Highly specialized logic for the newest 16 Pro Max (higher penalty for 3rd party screen)
            params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.50, originalScreenPenalty: 0.782, touchPenalty: 0.635, functionalScale: 1.09, physicalScale: 0.39895, bodyScale: 0.9806, facePenalty: 0.257307 };
        }
        else if (isProMax) {
            params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.50, originalScreenPenalty: 0.8176, touchPenalty: 0.635, functionalScale: 1.09, physicalScale: 0.39895, bodyScale: 0.9806, facePenalty: 0.257307 };
        }
        else if (isPro || isPlus) {
            params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.50, originalScreenPenalty: 0.65, touchPenalty: 0.55, functionalScale: 1.05, physicalScale: 1.05 };
        }
        else {
            params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.55, originalScreenPenalty: 0.70, touchPenalty: 0.55, functionalScale: 1.00, physicalScale: 1.00 };
        }
    }
    else if (lowerModel.includes('13') || lowerModel.includes('se (2022') || lowerModel.includes('se 2022')) {
        if (isProMax) {
            params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.50, originalScreenPenalty: 0.55, touchPenalty: 0.50, functionalScale: 0.85, physicalScale: 0.85 };
        }
        else if (isPro) {
            params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.50, originalScreenPenalty: 0.60, touchPenalty: 0.52, functionalScale: 0.80, physicalScale: 0.80 };
        }
        else {
            params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.55, originalScreenPenalty: 0.6610, touchPenalty: 0.4781, functionalScale: 0.75, physicalScale: 0.75 };
        }
    }
    else if (lowerModel.includes('12')) {
        if (isProMax || isPro) {
            params = { warrantyPenalty: 0.0, gstBillPenalty: 0.0, callsPenalty: 0.55, originalScreenPenalty: 0.65, touchPenalty: 0.55, functionalScale: 1.15, physicalScale: 1.15 };
        }
        else {
            params = { warrantyPenalty: 0.0, gstBillPenalty: 0.0, callsPenalty: 0.60, originalScreenPenalty: 0.75, touchPenalty: 0.60, functionalScale: 0.65, physicalScale: 0.85 };
        }
    }
    else if (lowerModel.includes('11') || lowerModel.includes('se (2020') || lowerModel.includes('se 2020')) {
        if (isProMax || isPro) {
            params = { warrantyPenalty: 0.0, gstBillPenalty: 0.0, callsPenalty: 0.55, originalScreenPenalty: 0.65, touchPenalty: 0.55, functionalScale: 1.05, physicalScale: 1.05 };
        }
        else {
            params = { warrantyPenalty: 0.0, gstBillPenalty: 0.0, callsPenalty: 0.60, originalScreenPenalty: 0.78, touchPenalty: 0.60, functionalScale: 0.85, physicalScale: 0.85 };
        }
    }
    else if (lowerModel.includes('xs') || lowerModel.includes('xr') || lowerModel.includes('x')) {
        params = {
            warrantyPenalty: 0.0, gstBillPenalty: 0.0, callsPenalty: 0.62, originalScreenPenalty: 0.71, touchPenalty: 0.40, functionalScale: 0.6, physicalScale: 0.6,
        };
    }
    else if (lowerModel.includes('8') || lowerModel.includes('7') || lowerModel.includes('6') || lowerModel.includes('se')) {
        params = {
            warrantyPenalty: 0.0, gstBillPenalty: 0.0, callsPenalty: 0.65, originalScreenPenalty: 0.82, touchPenalty: 0.50, functionalScale: 0.5, physicalScale: 0.5,
        };
    }
    return params;
};
exports.getAppleModelParams = getAppleModelParams;
var getAndroidModelParams = function (brand, model) {
    var lowerBrand = String(brand || '').toLowerCase();
    var lowerModel = String(model || '').toLowerCase();
    var params = {
        warrantyPenalty: 0.10, gstBillPenalty: 0.05, callsPenalty: 0.50, originalScreenPenalty: 0.60, touchPenalty: 0.40, functionalScale: 0.8, physicalScale: 0.75,
    };
    if (lowerBrand === 'samsung') {
        var isS = lowerModel.includes('galaxy s') || lowerModel.includes('s2') || lowerModel.includes('s1') || lowerModel.includes('s9') || lowerModel.includes('s8');
        var isZ = lowerModel.includes('fold') || lowerModel.includes('flip');
        var isNote = lowerModel.includes('note');
        if (isS || isZ || isNote) {
            params = { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.50, originalScreenPenalty: 0.60, touchPenalty: 0.30, functionalScale: 1.10, physicalScale: 1.10 };
        }
        else {
            params = { warrantyPenalty: 0.10, gstBillPenalty: 0.05, callsPenalty: 0.55, originalScreenPenalty: 0.65, touchPenalty: 0.35, functionalScale: 0.75, physicalScale: 0.75 };
        }
    }
    else if (lowerBrand === 'oneplus') {
        var isPro = lowerModel.includes('pro');
        var isFold = lowerModel.includes('open') || lowerModel.includes('fold');
        var isNord = lowerModel.includes('nord') || lowerModel.includes('ce');
        if (isPro || isFold) {
            params = { warrantyPenalty: 0.10, gstBillPenalty: 0.05, callsPenalty: 0.50, originalScreenPenalty: 0.60, touchPenalty: 0.40, functionalScale: 0.95, physicalScale: 0.95 };
        }
        else if (isNord) {
            params = { warrantyPenalty: 0.10, gstBillPenalty: 0.05, callsPenalty: 0.50, originalScreenPenalty: 0.60, touchPenalty: 0.40, functionalScale: 0.65, physicalScale: 0.65 };
        }
        else {
            params = { warrantyPenalty: 0.10, gstBillPenalty: 0.05, callsPenalty: 0.50, originalScreenPenalty: 0.60, touchPenalty: 0.40, functionalScale: 0.85, physicalScale: 0.80 };
        }
    }
    else if (lowerBrand === 'xiaomi' || lowerBrand === 'poco') {
        var isPremium = lowerModel.includes('pro') || lowerModel.includes('ultra') || lowerModel.includes('fold');
        var isBudget = lowerModel.includes('redmi') || lowerModel.includes('poco c') || lowerModel.includes('poco m');
        if (isPremium) {
            params = { warrantyPenalty: 0.12, gstBillPenalty: 0.08, callsPenalty: 0.45, originalScreenPenalty: 0.55, touchPenalty: 0.45, functionalScale: 0.85, physicalScale: 0.80 };
        }
        else if (isBudget) {
            params = { warrantyPenalty: 0.12, gstBillPenalty: 0.08, callsPenalty: 0.45, originalScreenPenalty: 0.65, touchPenalty: 0.45, functionalScale: 0.55, physicalScale: 0.55 };
        }
        else {
            params = { warrantyPenalty: 0.12, gstBillPenalty: 0.08, callsPenalty: 0.45, originalScreenPenalty: 0.55, touchPenalty: 0.45, functionalScale: 0.70, physicalScale: 0.65 };
        }
    }
    else if (lowerBrand === 'vivo' || lowerBrand === 'oppo' || lowerBrand === 'iqoo') {
        var isPremium = lowerModel.includes('pro') || lowerModel.includes('find n') || lowerModel.includes('fold') || lowerModel.includes('x-series') || lowerModel.includes(' x');
        var isBudget = lowerModel.includes(' y') || lowerModel.includes(' a') || lowerModel.includes('a-series');
        if (isPremium) {
            params = { warrantyPenalty: 0.12, gstBillPenalty: 0.08, callsPenalty: 0.45, originalScreenPenalty: 0.55, touchPenalty: 0.45, functionalScale: 0.85, physicalScale: 0.80 };
        }
        else if (isBudget) {
            params = { warrantyPenalty: 0.12, gstBillPenalty: 0.08, callsPenalty: 0.45, originalScreenPenalty: 0.60, touchPenalty: 0.45, functionalScale: 0.55, physicalScale: 0.55 };
        }
        else {
            params = { warrantyPenalty: 0.12, gstBillPenalty: 0.08, callsPenalty: 0.45, originalScreenPenalty: 0.55, touchPenalty: 0.45, functionalScale: 0.70, physicalScale: 0.65 };
        }
    }
    else if (lowerBrand === 'google' || lowerBrand === 'nothing' || lowerBrand === 'asus' || lowerBrand === 'huawei') {
        params = {
            warrantyPenalty: 0.10, gstBillPenalty: 0.05, callsPenalty: 0.50, originalScreenPenalty: 0.60, touchPenalty: 0.40, functionalScale: 0.8, physicalScale: 0.75,
        };
    }
    else {
        params = {
            warrantyPenalty: 0.12, gstBillPenalty: 0.08, callsPenalty: 0.45, originalScreenPenalty: 0.55, touchPenalty: 0.45, functionalScale: 0.75, physicalScale: 0.70,
        };
    }
    return params;
};
exports.getAndroidModelParams = getAndroidModelParams;
function calculateFhoneifyPrice(brand, model, basePrice, diagnostics) {
    if (!basePrice)
        return 0;
    var floor_price = pricingConfig_json_1.default.modelFloorPrice;
    var age_multiplier = 1.0;
    var calls_multiplier = 1.0;
    var touch_multiplier = 1.0;
    var screen_orig_mult = 1.0;
    var screen_body_sum = 0;
    var functional_sum = 0;
    var safeBrand = String(brand || '');
    var safeModel = String(model || '');
    var isApple = safeBrand.toLowerCase() === 'apple';
    // Cashify sets a flat scrap price of exactly ₹1,200 for any iPhone that cannot make or receive calls
    if (isApple && diagnostics.calls === false) {
        return 1200;
    }
    var isFoldable = safeModel.toLowerCase().includes('fold') || safeModel.toLowerCase().includes('flip') || safeModel.toLowerCase().includes('open');
    var isWarrantyEligible = function (brandStr, modelStr) {
        if (brandStr.toLowerCase() === 'apple') {
            var lower = modelStr.toLowerCase();
            return lower.includes('15') || lower.includes('16') || lower.includes('17') || lower.includes('air');
        }
        return true; // For Androids, assume they are eligible for now unless proven otherwise
    };
    var params = isApple ? (0, exports.getAppleModelParams)(safeModel) : (0, exports.getAndroidModelParams)(safeBrand, safeModel);
    var bodyScale = params.bodyScale || params.physicalScale;
    var applyGranularDefects = function (scale, bScale) {
        var sum = 0;
        var defectsList = diagnostics.defects || [];
        defectsList.forEach(function (d) {
            var penalty = pricingConfig_json_1.default.defects_screen_body[d] || 0;
            // Granularize screen_scratch penalty based on screenCondition severity
            if (d === 'screen_scratch' && diagnostics.screenCondition) {
                if (diagnostics.screenCondition === 'More than 2 scratches on screen' || diagnostics.screenCondition === 'More than 2 scratches') {
                    penalty = 0.2635; // Calibrated to exactly mirror Cashify's penalty
                }
                else if (diagnostics.screenCondition === '1-2 scratches on screen' || diagnostics.screenCondition === '1-2 scratches') {
                    penalty = 0.15;
                }
                else {
                    // Default for "Screen cracked/ glass broken" or "Chipped/cracked outside display area"
                    penalty = 0.35;
                }
            }
            // Granularize body_scratch penalty based on bodyScratches and bodyDents severity
            if (d === 'body_scratch') {
                var scratchPenalty = 0;
                var dentPenalty = 0;
                if (diagnostics.bodyScratches === 'More than 2 scratches') {
                    scratchPenalty = 0.02116; // Calibrated to exactly mirror Cashify's ~1.27% penalty on iPhone X
                }
                else if (diagnostics.bodyScratches === '1-2 scratches') {
                    scratchPenalty = 0.01;
                }
                else {
                    scratchPenalty = 0.05; // Fallback if no specific condition provided
                }
                if (diagnostics.bodyDents === 'Major dent(s) or more than 2') {
                    dentPenalty = isProMax ? 0.02861 : 0.04232; // Calibrated to exactly mirror Cashify's penalty
                }
                else if (diagnostics.bodyDents === '1-2 minor dents') {
                    dentPenalty = isProMax ? 0.015 : 0.02; // Extrapolated from major dents
                }
                if (diagnostics.bodyScratches === 'No scratches')
                    scratchPenalty = 0;
                if (diagnostics.bodyDents === 'No dents')
                    dentPenalty = 0;
                // Apply bodyScale specifically for body defects
                penalty = (scratchPenalty + dentPenalty) * (bScale / scale);
            }
            var foldableScreenMult = isFoldable ? 3.0 : 1.0;
            if (d === 'screen_scratch' || d === 'screen_spot' || d === 'panel_missing') {
                penalty *= foldableScreenMult;
            }
            // If the screen is not original, Cashify waives physical screen penalties (except body defects)
            // because they already heavily penalize the 3rd party screen
            if (diagnostics.originalScreen === false && d !== 'body_scratch' && d !== 'panel_missing') {
                penalty = 0;
            }
            sum += penalty * scale;
        });
        return sum;
    };
    if (!isWarrantyEligible(safeBrand, safeModel)) {
        // If not warranty eligible, the scraped base price is ALREADY the >11 months price!
        age_multiplier = 1.0;
    }
    else {
        // It is warranty eligible (e.g. iPhone 15/16/17), so DB price is the flawless "Below 3 months" price
        age_multiplier = pricingConfig_json_1.default.ageBonus['above11'] || 0.7966; // Default to above11
        if (diagnostics.warranty === false) {
            if (isApple && (safeModel.toLowerCase().includes('16e') || safeModel.toLowerCase().includes('17e'))) {
                age_multiplier = 0.75305;
            }
            else {
                age_multiplier = pricingConfig_json_1.default.ageBonus['above11'] || 0.7966;
            }
        }
        else if (diagnostics.mobileAge) {
            if (diagnostics.mobileAge === 'Below 3 months' || diagnostics.mobileAge === 'below3') {
                age_multiplier = pricingConfig_json_1.default.ageBonus['below3'] || 1.0;
            }
            else if (diagnostics.mobileAge === '3 months - 6 months' || diagnostics.mobileAge === '3to6') {
                age_multiplier = pricingConfig_json_1.default.ageBonus['3to6'] || 0.9427;
            }
            else if (diagnostics.mobileAge === '6 months - 11 months' || diagnostics.mobileAge === '6to11') {
                age_multiplier = pricingConfig_json_1.default.ageBonus['6to11'] || 0.9114;
            }
            else {
                age_multiplier = pricingConfig_json_1.default.ageBonus['above11'] || 0.7966;
            }
        }
        // Warranty penalty strictly applied if less than 11 months old and no warranty/bill
        var isLessThan11Months = diagnostics.warranty !== false && diagnostics.mobileAge !== 'Above 11 months' && diagnostics.mobileAge !== 'above11';
        if (isLessThan11Months) {
            if (!diagnostics.warranty)
                age_multiplier -= params.warrantyPenalty;
            var hasValidBill = diagnostics.validBill === true || (diagnostics.accessories || []).includes('bill');
            if (!hasValidBill)
                age_multiplier -= params.gstBillPenalty;
        }
    }
    calls_multiplier = diagnostics.calls === false ? params.callsPenalty : 1.0;
    touch_multiplier = diagnostics.touch === false ? params.touchPenalty : 1.0;
    screen_orig_mult = diagnostics.originalScreen === false ? params.originalScreenPenalty : 1.0;
    if (diagnostics.touch === false || (diagnostics.defects || []).includes('broken_screen')) {
        screen_orig_mult = 1.0;
    }
    screen_body_sum = applyGranularDefects(params.physicalScale, bodyScale);
    if (isFoldable && diagnostics.originalScreen === false) {
        screen_orig_mult = Math.min(screen_orig_mult, 0.35);
    }
    var hardwareList = diagnostics.hardware || [];
    hardwareList.forEach(function (h) {
        if (h in pricingConfig_json_1.default.defects_functional) {
            if (h === 'battery_health' && diagnostics.warranty === true) {
                return; // Cashify waives the battery health penalty if the phone is under warranty
            }
            var penalty = pricingConfig_json_1.default.defects_functional[h] * params.functionalScale;
            if (h === 'battery_health' && isApple) {
                var isNewerSeries = safeModel.toLowerCase().includes('15') || safeModel.toLowerCase().includes('16') || safeModel.toLowerCase().includes('17');
                var isOlderThan11Months = diagnostics.mobileAge === 'Above 11 months' || diagnostics.mobileAge === 'above11' || diagnostics.warranty === false;
                if (isOlderThan11Months) {
                    // Cashify WAIVES the 80-85% battery health penalty for phones older than 11 months,
                    // because natural lithium-ion degradation to this level is EXPECTED after a year!
                    penalty = 0.0;
                }
                else if (isNewerSeries) {
                    penalty = 0.01729 * params.functionalScale; // Scaled ~1.7% deduction for newer series
                }
                else {
                    penalty = 0.0; // Cashify waives the 80-85% battery health penalty entirely for older iPhones (like iPhone X, 11, 12, etc.)
                }
            }
            if (h === 'battery_service' && isApple) {
                var isNewerSeries = safeModel.toLowerCase().includes('15') || safeModel.toLowerCase().includes('16') || safeModel.toLowerCase().includes('17');
                if (isNewerSeries) {
                    penalty = 0.058074 * params.functionalScale; // Scaled ~6.33% deduction for newer series
                }
            }
            if (h === 'front_camera' && isApple) {
                var isNewerSeries = safeModel.toLowerCase().includes('15') || safeModel.toLowerCase().includes('16') || safeModel.toLowerCase().includes('17');
                if (isNewerSeries) {
                    penalty = 0.0289437 * params.functionalScale; // Scaled ~3.15% deduction for newer series
                }
            }
            if (h === 'back_camera' && isApple) {
                var isNewerSeries = safeModel.toLowerCase().includes('15') || safeModel.toLowerCase().includes('16') || safeModel.toLowerCase().includes('17');
                if (isNewerSeries) {
                    penalty = 0.066813 * params.functionalScale; // Scaled ~7.28% deduction for newer series
                }
            }
            if (h === 'face' && isApple) {
                var isTouchIDOnly = safeModel.toLowerCase().includes('se') || safeModel.toLowerCase().match(/[678]/);
                if (isTouchIDOnly) {
                    penalty = 0.0; // Touch ID phones don't have Face ID
                }
                else {
                    penalty = params.facePenalty !== undefined ? params.facePenalty : 0.37;
                }
            }
            if (h === 'fingerprint' && isApple) {
                var isTouchIDOnly = safeModel.toLowerCase().includes('se') || safeModel.toLowerCase().match(/[678]/);
                if (!isTouchIDOnly) {
                    penalty = 0.0; // Face ID phones don't have Touch ID, Cashify ignores this defect
                }
            }
            functional_sum += penalty;
        }
    });
    var box_bonus = (diagnostics.accessories || []).includes('box') ? pricingConfig_json_1.default.bonuses.box : 0;
    var calls_penalty_val = 1.0 - calls_multiplier;
    var touch_penalty_val = 1.0 - touch_multiplier;
    var screen_orig_penalty_val = 1.0 - screen_orig_mult;
    var total_penalty_sum = calls_penalty_val + touch_penalty_val + screen_orig_penalty_val + screen_body_sum + functional_sum;
    var rawCalculated = basePrice
        * age_multiplier
        * Math.max(0, 1 - total_penalty_sum);
    var upliftPercent = 1.0;
    // Handle Cashify's AI-Generated Market Price Edge Case
    var eSim_multiplier = 1.0;
    var accessories_multiplier = 1.0;
    var final_box_bonus = box_bonus;
    if (isApple) {
        if (safeModel.toLowerCase().includes('17')) {
            // Penalize Dual eSIM (imported models without physical SIM trays typically sell for less in India)
            if (diagnostics.eSim === 'Dual eSIM') {
                eSim_multiplier = 0.95; // 5% deduction for imported Dual eSIM
            }
        }
        else {
            // Older imported Dual eSIM iPhones (like 15 series) suffer a much heavier depreciation
            if (diagnostics.eSim === 'Dual eSIM') {
                eSim_multiplier = 0.80908; // ~19.1% deduction exactly matching Cashify's logic
            }
        }
    }
    var calculated = (rawCalculated * upliftPercent * eSim_multiplier * accessories_multiplier) + final_box_bonus;
    return Math.max(Math.round(calculated), floor_price);
}
