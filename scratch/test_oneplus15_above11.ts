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
  mobileAge: "above11",
  box: true
};

console.log("Expected Fhoneify: 22608, Got:", calculateFhoneifyPrice(brand, model, basePrice, case1).fhoneifyPrice);
