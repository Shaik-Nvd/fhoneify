"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var pricingCalculator_1 = require("./lib/pricingCalculator");
var diag1 = {
    calls: true,
    touch: true,
    originalScreen: false,
    warranty: true,
    validBill: true,
    defects: [],
    hardware: ["front_camera"],
    accessories: [],
    mobileAge: 'below3'
};
var diag2 = {
    calls: true,
    touch: true,
    originalScreen: false,
    warranty: true,
    validBill: true,
    defects: [],
    hardware: ["front_camera"],
    accessories: [],
    mobileAge: 'above11'
};
var res1 = (0, pricingCalculator_1.calculateFhoneifyPrice)("Nothing", "Nothing Phone 4a Pro (12 GB/256 GB)", 32500, diag1);
var res2 = (0, pricingCalculator_1.calculateFhoneifyPrice)("Nothing", "Nothing Phone 4a Pro (12 GB/256 GB)", 32500, diag2);
console.log("With below3: ".concat(res1.fhoneifyPrice));
console.log("With above11: ".concat(res2.fhoneifyPrice));
var res3 = (0, pricingCalculator_1.calculateFhoneifyPrice)("Nothing", "Nothing Phone 4a Pro (12 GB/256 GB)", 32000, diag1);
var res4 = (0, pricingCalculator_1.calculateFhoneifyPrice)("Nothing", "Nothing Phone 4a external", 32000, diag2);
console.log("With base 32000, below3: ".concat(res3.fhoneifyPrice));
console.log("With base 32000, above11: ".concat(res4.fhoneifyPrice));
