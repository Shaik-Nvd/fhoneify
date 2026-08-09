"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
var pricingCalculator_1 = require("./lib/pricingCalculator");
// Polyfill minimal test cases
var cases = [
    {
        name: "Nothing Phone 1 (12 GB/256 GB)",
        basePrice: 13900,
        expectedPrice: 4040,
        diag: {
            calls: true,
            touch: false,
            originalScreen: true,
            warranty: true,
            validBill: true,
            defects: ["screen_scratch"],
            screenCondition: "1-2 scratches on screen",
            hardware: ["back_camera"],
            accessories: ["box", "charger"]
        }
    }
];
var ages = ["below3", "3to6", "6to11", "above11"];
cases.forEach(function (c) {
    console.log("\nTesting ".concat(c.name));
    ages.forEach(function (age) {
        var diag = __assign(__assign({}, c.diag), { mobileAge: age });
        var result = (0, pricingCalculator_1.calculateFhoneifyPrice)("Nothing", c.name, c.basePrice, diag);
        console.log("Age ".concat(age, " - Expected: ").concat(c.expectedPrice, ", Got: ").concat(result.fhoneifyPrice, ", CashifyBase: ").concat(result.cashifyBasePrice));
    });
});
