const fs = require('fs');
const content = fs.readFileSync('test_price.js', 'utf8');
eval(content);

const brand = "Xiaomi";
const model = "Xiaomi 17 Ultra";
const basePrice = 77150;
const diagnostics = { 
  calls: true, 
  touch: true, 
  originalScreen: true, 
  warranty: true, 
  validBill: true, 
  defects: ["body_scratch"], 
  accessories: ["box"], 
  mobileAge: "3to6" 
};

console.log(calculateFhoneifyPrice(brand, model, basePrice, diagnostics));
