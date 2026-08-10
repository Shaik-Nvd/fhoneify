import { calculateFhoneifyPrice, DiagnosticsType } from '../lib/pricingCalculator';

const basePrice = 57000;
const brand = "OnePlus";
const model = "OnePlus 15";

const caseBase: DiagnosticsType = {
  calls: true,
  touch: true,
  originalScreen: false,
  defects: [],
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

const bools = [true, false];
const defectsOptions = [["screen_scratch"], ["broken_screen", "screen_scratch"], ["body_scratch", "screen_scratch"], ["broken_screen"], []];

for (const bill of bools) {
  for (const box of bools) {
    for (const defects of defectsOptions) {
      const testCase = { ...caseBase, validBill: bill, box, defects, accessories: box ? ["box"] : [] };
      const price = calculateFhoneifyPrice(brand, model, basePrice, testCase).fhoneifyPrice;
      console.log(`Bill: ${bill}, Box: ${box}, Defects: ${defects} -> ${price}`);
    }
  }
}
