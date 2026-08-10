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

const ages = ["below3", "3to6", "6to11", "above11"];
const bools = [true, false];
const defectsOptions = [["screen_scratch"]];

let found = false;
for (const age of ages) {
  for (const bill of bools) {
    for (const box of bools) {
      for (const warranty of bools) {
        for (const defects of defectsOptions) {
          const testCase = { ...caseBase, mobileAge: age as any, validBill: bill, box, defects, accessories: box ? ["box"] : [] };
          const price = calculateFhoneifyPrice(brand, model, basePrice, testCase).fhoneifyPrice;
          if (price >= 28200 && price <= 28400) {
             console.log(`Found! Age: ${age}, Bill: ${bill}, Box: ${box}, Warranty: ${warranty}, Defects: ${defects} -> ${price}`);
             found = true;
          }
        }
      }
    }
  }
}
if (!found) console.log("Not found with current parameters.");
