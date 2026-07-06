import { scrapeCashifyPrice } from './server/modules/quote/cashifyScraper';

const appleModels = [
  { brand: 'Apple', model: 'iPhone 13', storage: '128GB', internalBase: 30000 },
  { brand: 'Apple', model: 'iPhone 14 Pro Max', storage: '256GB', internalBase: 70000 },
  { brand: 'Apple', model: 'iPhone 11', storage: '64GB', internalBase: 15000 },
  { brand: 'Apple', model: 'iPhone 12 Mini', storage: '128GB', internalBase: 20000 },
  { brand: 'Apple', model: 'iPhone SE 2022', storage: '64GB', internalBase: 12000 },
  { brand: 'Apple', model: 'iPhone 15', storage: '128GB', internalBase: 50000 },
  { brand: 'Apple', model: 'iPhone 13 Pro', storage: '128GB', internalBase: 45000 },
  { brand: 'Apple', model: 'iPhone XR', storage: '128GB', internalBase: 10000 },
  { brand: 'Apple', model: 'iPhone 14', storage: '128GB', internalBase: 40000 },
  { brand: 'Apple', model: 'iPhone 12', storage: '64GB', internalBase: 18000 }
];

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

function getRandomBoolean() {
  return Math.random() > 0.5;
}

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomSubArray(arr) {
  const result = [];
  for (const item of arr) {
    if (getRandomBoolean()) {
      result.push(item);
    }
  }
  return result;
}

const defectOptions = ['screen_scratch', 'screen_spot', 'body_scratch', 'panel_missing'];
const hardwareOptions = ['front_camera', 'back_camera', 'volume', 'fingerprint', 'wifi', 'speaker', 'silent', 'face', 'power', 'charging', 'audio_receiver', 'camera_glass', 'microphone', 'bluetooth', 'vibrator', 'proximity', 'battery_service'];
const accessoryOptions = ['box', 'bill', 'charger'];

async function runRandomTests() {
  console.log('--- STARTING 10 RANDOM TESTS FOR APPLE MODELS ---');
  for (let i = 0; i < 10; i++) {
    const phone = appleModels[i];
    
    // Generate random diagnostics
    const defects = getRandomSubArray(defectOptions);
    const hardware = getRandomSubArray(hardwareOptions);
    const accessories = getRandomSubArray(accessoryOptions);
    
    // Set up sub-page specific inputs
    const screenCondition = defects.includes('screen_scratch') ? getRandomItem([
      'Screen cracked/ glass broken',
      'Chipped/cracked outside display area',
      'More than 2 scratches on screen',
      '1-2 scratches on screen'
    ]) : null;
    
    const bodyScratches = defects.includes('body_scratch') ? getRandomItem([
      'More than 2 scratches',
      '1-2 scratches',
      'No scratches'
    ]) : null;
    
    const bodyDents = defects.includes('body_scratch') ? getRandomItem([
      'Major dent(s) or more than 2',
      '1-2 minor dents',
      'No dents'
    ]) : null;

    const warranty = getRandomBoolean();
    const validBill = warranty ? true : getRandomBoolean(); // Ensure valid bill if warranty is selected
    
    const diagnostics = {
      calls: getRandomBoolean(),
      touch: getRandomBoolean(),
      originalScreen: getRandomBoolean(),
      defects,
      screenCondition,
      bodyScratches,
      bodyDents,
      hardware,
      accessories,
      warranty,
      validBill,
      mobileAge: warranty ? '6to11' : null
    };

    console.log(`\\nTest ${i+1}: ${phone.brand} ${phone.model} (${phone.storage})`);
    console.log(`Inputs: `, JSON.stringify(diagnostics, null, 2));
    
    try {
      const result = await scrapeCashifyPrice({
        brand: phone.brand,
        model: phone.model,
        storage: phone.storage,
        answers: diagnostics
      });
      
      console.log(`✅ Final Scraped Price: ${result.price ? '₹'+result.price : 'null (Fallbacks applied)'}`);
      console.log(`Status: ${result.success ? 'Success' : 'Failed'}`);
    } catch (err: any) {
      console.error(`❌ Error testing ${phone.model}:`, err.message);
    }
    
    // Adding delay to avoid rate limiting
    console.log('Waiting 5 seconds to prevent rate limits...');
    await delay(5000);
  }
  
  console.log('\\n--- TESTS COMPLETED ---');
  process.exit(0);
}

runRandomTests();
