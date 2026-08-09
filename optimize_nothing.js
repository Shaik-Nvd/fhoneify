"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var fs = __importStar(require("fs"));
// Constants
var BOX_BONUS = 380;
var FLOOR = 100;
var data = {
    "Nothing1": { basePrice: 13900, case1Expected: 4040, case2Expected: 9200, case3Expected: 10630 },
    "Nothing2": { basePrice: 20730, case1Expected: 5110, case2Expected: 11080, case3Expected: 12830 },
    "Nothing2a": { basePrice: 17710, case1Expected: 4100, case2Expected: 8670, case3Expected: 10420 },
    "CMF1": { basePrice: 11430, case1Expected: 2640, case2Expected: 4950, case3Expected: 6030 },
    "Nothing2aPlus": { basePrice: 18260, case1Expected: 4220, case2Expected: 9110, case3Expected: 10870 },
    "Nothing3a": { basePrice: 20810, case1Expected: 4580, case2Expected: 9760, case3Expected: 11810 },
    "Nothing3": { basePrice: 32550, case1Expected: 10650, case2Expected: 17400, case3Expected: 20210 },
    "Nothing3aPro": { basePrice: 22710, case1Expected: 5000, case2Expected: 11200, case3Expected: 13250 },
    "Nothing4a": { basePrice: 27000, case1Expected: 7850, case2Expected: 14450, case3Expected: 16500 },
    "Nothing4aPro": { basePrice: 32500, case1Expected: 12010, case2Expected: 18610, case3Expected: 20660 }
};
function getCashifyBase(fhoneifyExpected, basePrice) {
    var upliftPercent = 1;
    if (basePrice <= 20000)
        upliftPercent = 1.08;
    else if (basePrice <= 50000)
        upliftPercent = 1.06;
    else
        upliftPercent = 1.04;
    for (var c = 100; c <= 40000; c++) {
        var fhoneifyExtra = c * (upliftPercent - 1);
        if (fhoneifyExtra > 2000)
            fhoneifyExtra = 2000;
        if (fhoneifyExtra < 100 && c > 1200)
            fhoneifyExtra = 100;
        var fhoneifyPrice = Math.max(Math.round(c + fhoneifyExtra), FLOOR);
        if (fhoneifyPrice === fhoneifyExpected) {
            return c;
        }
    }
    return -1;
}
function optimize() {
    var output = '';
    for (var _i = 0, _a = Object.entries(data); _i < _a.length; _i++) {
        var _b = _a[_i], model = _b[0], cases = _b[1];
        console.log("Optimizing ".concat(model, "..."));
        var c1Base = getCashifyBase(cases.case1Expected, cases.basePrice);
        var c2Base = getCashifyBase(cases.case2Expected, cases.basePrice);
        var c3Base = getCashifyBase(cases.case3Expected, cases.basePrice);
        // Case 1: Touch=NO, Scratches 1-2, Back Camera, Box=Yes
        // Total penalty = (1 - touch_multiplier) + (back_camera)
        // raw1 = c1Base - box_bonus
        // raw1 = basePrice * age_multiplier * (1 - ((1-touch_multiplier) + back_camera))
        // -> (1 - touch_multiplier) + back_camera = 1 - (raw1 / (basePrice * age_multiplier))
        // Case 2: OrigScreen=NO, Front Camera, Box=Yes
        // Total penalty = (1 - origScreen_multiplier) + front_camera
        // raw2 = c2Base - box_bonus
        // -> (1 - origScreen_multiplier) + front_camera = 1 - (raw2 / (basePrice * age_multiplier))
        // Case 3: GST Bill=NO, Scratches >2, Battery, Box=Yes
        // Total penalty = screen_scratch(>2) + battery
        // age = age_multiplier - gstBillPenalty
        // raw3 = c3Base - box_bonus
        // -> screen_scratch(>2) + battery = 1 - (raw3 / (basePrice * (age_multiplier - gstBillPenalty)))
        // Since we have multiple unknowns, we will fix:
        // age_multiplier = 0.98
        // front_camera = 0.05
        // back_camera = 0.15
        // battery = 0.05
        // And then solve for the others.
        var ageMult = 0.98;
        var frontCamera = 0.05;
        var backCamera = 0.15;
        var battery = 0.05;
        var gstBillPenalty = 0.223828345567476; // Using existing one
        var ageBill = ageMult - gstBillPenalty;
        var raw1 = c1Base - BOX_BONUS;
        var raw2 = c2Base - BOX_BONUS;
        var raw3 = c3Base - BOX_BONUS;
        var penalty1 = 1 - (raw1 / (cases.basePrice * ageMult));
        var penalty2 = 1 - (raw2 / (cases.basePrice * ageMult));
        var penalty3 = 1 - (raw3 / (cases.basePrice * ageBill));
        var touchPenaltyValue = penalty1 - backCamera;
        var origScreenPenaltyValue = penalty2 - frontCamera;
        var scratchGt2 = penalty3 - battery;
        var touchMultiplier = 1 - touchPenaltyValue;
        var origScreenMultiplier = 1 - origScreenPenaltyValue;
        output += "    } else if (is".concat(model, ") {\n");
        output += "      params = {\n";
        output += "        warrantyPenalty: 0.1,\n";
        output += "        gstBillPenalty: ".concat(gstBillPenalty, ",\n");
        output += "        callsPenalty: 0.5,\n";
        output += "        originalScreenPenalty: ".concat(origScreenMultiplier, ",\n");
        output += "        touchPenalty: ".concat(touchMultiplier, ",\n");
        output += "        functionalScale: 1.0,\n";
        output += "        physicalScale: 1.0\n";
        output += "      };\n";
        console.log("".concat(model, ": touchPenalty=").concat(touchMultiplier, ", origScreenPenalty=").concat(origScreenMultiplier, ", scratchGt2=").concat(scratchGt2));
        output += "      // ".concat(model, " scratchGt2: ").concat(scratchGt2, "\n");
    }
    fs.writeFileSync('nothing_params.txt', output);
    console.log("Done");
}
optimize();
