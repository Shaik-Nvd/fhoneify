const fs = require('fs');
const path = './app/quote/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Change STAGE 7 -> 10
content = content.replace('{/* STAGE 7: LEAD CAPTURE MODAL */}', '{/* STAGE 10: LEAD CAPTURE MODAL */}');
content = content.replace('{step === 7 && (\\n        <div className="fixed inset-0 bg-black/80', '{step === 10 && (\\n        <div className="fixed inset-0 bg-black/80');

// Change STAGE 8 -> 11
content = content.replace('{/* STAGE 8: FINAL EXACT PRICE */}', '{/* STAGE 11: FINAL EXACT PRICE */}');
content = content.replace('{step === 8 && finalPrice != null && (', '{step === 11 && finalPrice != null && (');
content = content.replace('setStep(9)', 'setStep(12)'); // In the Schedule Pickup button!

// Change STAGE 9 -> 12
content = content.replace('{/* STAGE 9: PICKUP DETAILS FORM */}', '{/* STAGE 12: PICKUP DETAILS FORM */}');
content = content.replace('{step === 9 && (\\n        <div className="card flex flex-col', '{step === 12 && (\\n        <div className="card flex flex-col');

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully updated steps 10-12');
