import { calculateApplePrice } from "./pricingCalculator";

const basePrice = 52200;
const diagnostics = {
  calls: true,
  touch: true,
  originalScreen: true,
  warranty: true,
  validBill: true,
  defects: [],
  hardware: [],
  accessories: ["box"],
  mobileAge: "6 months-11 months",
  box: true,
  screenCondition: null,
  screenSpots: null,
  screenLines: null,
  screenDiscoloration: null,
  bodyScratches: null,
  bodyDents: null,
  bodyPanel: null,
  bodyBent: null,
  eSim: null,
};

const result = calculateApplePrice("Apple iPhone 17e", basePrice, diagnostics);
console.log(result);
