"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var pricingCalculator_1 = require("./lib/pricingCalculator");
// Constants
var BOX_BONUS = 380;
var FLOOR = 100;
var data = {
    "Nothing 1": { basePrice: 13900, case1Expected: 4040, case2Expected: 9200, case3Expected: 10630 },
    "Nothing 2": { basePrice: 20730, case1Expected: 5110, case2Expected: 11080, case3Expected: 12830 },
    "Nothing 2a": { basePrice: 17710, case1Expected: 4100, case2Expected: 8670, case3Expected: 10420 },
    "CMF": { basePrice: 11430, case1Expected: 2640, case2Expected: 4950, case3Expected: 6030 },
    "Nothing 2a Plus": { basePrice: 18260, case1Expected: 4220, case2Expected: 9110, case3Expected: 10870 },
    "Nothing 3a": { basePrice: 20810, case1Expected: 4580, case2Expected: 9760, case3Expected: 11810 },
    "Nothing 3": { basePrice: 32550, case1Expected: 10650, case2Expected: 17400, case3Expected: 20210 },
    "Nothing 3a Pro": { basePrice: 22710, case1Expected: 5000, case2Expected: 11200, case3Expected: 13250 },
    "Nothing 4a": { basePrice: 27000, case1Expected: 7850, case2Expected: 14450, case3Expected: 16500 },
    "Nothing 4a Pro": { basePrice: 32500, case1Expected: 12010, case2Expected: 18610, case3Expected: 20660 }
};
for (var _i = 0, _a = Object.entries(data); _i < _a.length; _i++) {
    var _b = _a[_i], model = _b[0], cases = _b[1];
    console.log("\nTesting ".concat(model, "..."));
    var diag1 = {
        calls: true,
        touch: false,
        originalScreen: true,
        warranty: true,
        validBill: true,
        defects: ["screen_scratch"],
        screenCondition: "1-2 scratches on screen",
        hardware: ["back_camera"],
        accessories: ["box", "charger"]
    };
    var res1 = (0, pricingCalculator_1.calculateFhoneifyPrice)("Nothing", model, cases.basePrice, diag1);
    console.log("Case 1 - Expected: ".concat(cases.case1Expected, ", Got: ").concat(res1.fhoneifyPrice));
    var diag2 = {
        calls: true,
        touch: true,
        originalScreen: false,
        warranty: true,
        validBill: true,
        defects: [],
        screenCondition: null,
        hardware: ["front_camera"],
        accessories: ["box"]
    };
    var res2 = (0, pricingCalculator_1.calculateFhoneifyPrice)("Nothing", model, cases.basePrice, diag2);
    console.log("Case 2 - Expected: ".concat(cases.case2Expected, ", Got: ").concat(res2.fhoneifyPrice));
    var diag3 = {
        calls: true,
        touch: true,
        originalScreen: true,
        warranty: true,
        validBill: false,
        defects: ["screen_scratch"],
        screenCondition: "More than 2 scratches on screen",
        hardware: ["battery_health"],
        accessories: ["box", "charger"]
    };
    var res3 = (0, pricingCalculator_1.calculateFhoneifyPrice)("Nothing", model, cases.basePrice, diag3);
    console.log("Case 3 - Expected: ".concat(cases.case3Expected, ", Got: ").concat(res3.fhoneifyPrice));
}
