import { calculateFhoneifyPrice, DiagnosticsType } from '../lib/pricingCalculator';

const basePrice = 57000;
const brand = "OnePlus";
const model = "OnePlus 15";

const caseBase: DiagnosticsType = {
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
  mobileAge: "below3",
  box: true
};

const price = calculateFhoneifyPrice(brand, model, basePrice, caseBase).fhoneifyPrice;
console.log("Expected Fhoneify Price for this setup:", price);

// Reverse engineer 28305
const target = 28305;
const cashifyBase = target / 1.04;
const raw = cashifyBase - 380; // assuming they got the box bonus
const ageMult = 0.98;
const penaltyMultiplier = raw / (57000 * ageMult); // this is (1 - total_penalty)
const total_penalty = 1 - penaltyMultiplier;
console.log(`To get ${target}, total penalty must be: ${total_penalty}`);
console.log(`Current total penalty in my code: ${1 - (price/1.04 - 380) / (57000 * ageMult)}`);
