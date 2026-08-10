"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var pricingCalculator_1 = require("./lib/pricingCalculator");
var diag = {
    calls: true,
    touch: true,
    originalScreen: true,
    warranty: true,
    validBill: false,
    defects: ["screen_scratch"],
    screenCondition: "More than 2 scratches on screen",
    hardware: ["battery_service"],
    accessories: ["box"],
    mobileAge: 'below3'
};
var res = (0, pricingCalculator_1.calculateFhoneifyPrice)("Nothing", "Nothing Phone 4a Pro (12 GB/256 GB)", 32500, diag);
console.log("With basePrice 32500 and mobileAge below3: ".concat(res.fhoneifyPrice));
res = (0, pricingCalculator_1.calculateFhoneifyPrice)("Nothing", "Nothing Phone 4a Pro (12 GB/256 GB)", 32000, diag);
console.log("With basePrice 32000 and mobileAge below3: ".concat(res.fhoneifyPrice));
