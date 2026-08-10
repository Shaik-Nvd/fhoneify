import { calculateFhoneifyPrice, DiagnosticsType } from '../lib/pricingCalculator';

const basePrice = 57000;
const brand = "OnePlus";
const model = "OnePlus 15";

const testCombination = (age: string, validBill: boolean) => {
  const case1: DiagnosticsType = {
    calls: true,
    touch: true,
    originalScreen: false,
    defects: ["screen_scratch"],
    screenCondition: "More than 2 scratches on screen",
    screenSpots: null,
    screenLines: null,
    screenDiscoloration: null,
    bodyScratches: null,
    bodyDents: null,
    bodyPanel: null,
    bodyBent: null,
    hardware: ["battery_health"],
    accessories: ["box"],
    warranty: true,
    validBill,
    eSim: null,
    mobileAge: age as any,
    box: true
  };
  return calculateFhoneifyPrice(brand, model, basePrice, case1).fhoneifyPrice;
}

console.log("above11, bill=true:", testCombination("above11", true));
console.log("above11, bill=false:", testCombination("above11", false));
console.log("below3, bill=true:", testCombination("below3", true));
console.log("below3, bill=false:", testCombination("below3", false));
