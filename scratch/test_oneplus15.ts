import { calculateFhoneifyPrice, DiagnosticsType } from '../lib/pricingCalculator';

const basePrice = 57000;
const brand = "OnePlus";
const model = "OnePlus 15";

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
  validBill: true,
  eSim: null,
  mobileAge: "below 3 months",
  box: true
};

const case2: DiagnosticsType = {
  calls: true,
  touch: true,
  originalScreen: true,
  defects: [],
  screenCondition: null,
  screenSpots: null,
  screenLines: null,
  screenDiscoloration: null,
  bodyScratches: null,
  bodyDents: null,
  bodyPanel: null,
  bodyBent: null,
  hardware: ["front_camera"],
  accessories: ["box", "charger"],
  warranty: true,
  validBill: false,
  eSim: null,
  mobileAge: "below 3 months",
  box: true
};

const case3: DiagnosticsType = {
  calls: false,
  touch: true,
  originalScreen: true,
  defects: [],
  screenCondition: null,
  screenSpots: null,
  screenLines: null,
  screenDiscoloration: null,
  bodyScratches: null,
  bodyDents: null,
  bodyPanel: null,
  bodyBent: null,
  hardware: ["back_camera"],
  accessories: ["charger"],
  warranty: true,
  validBill: true,
  eSim: null,
  mobileAge: "3to6",
  box: false
};

console.log("Case 1 Expected: 30470, Got:", calculateFhoneifyPrice(brand, model, basePrice, case1).fhoneifyPrice);
console.log("Case 2 Expected: 44470, Got:", calculateFhoneifyPrice(brand, model, basePrice, case2).fhoneifyPrice);
console.log("Case 3 Expected: 1200, Got:", calculateFhoneifyPrice(brand, model, basePrice, case3).fhoneifyPrice);
