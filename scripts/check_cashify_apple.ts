import { SEED_DEVICES } from '../lib/seed_devices';
import { calculateFhoneifyPrice } from '../lib/pricingCalculator';

const fetchCashifyPrice = async (url: string) => {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'text/html,application/xhtml+xml',
      }
    });
    if (!response.ok) return null;
    const html = await response.text();
    const match = html.match(/"exactPrice":(\d+)/) || html.match(/"basePrice":(\d+)/) || html.match(/"maxPrice":(\d+)/);
    if (match) return parseInt(match[1]);
    return null;
  } catch (e) {
    return null;
  }
};

const run = async () => {
  const appleModels = SEED_DEVICES.filter(d => d.brand === 'Apple' && (d.model.includes('iPhone 15') || d.model.includes('iPhone 14'))).slice(0, 10);
  
  console.log(`Checking ${appleModels.length} Apple models against Cashify URLs...`);
  
  for (const device of appleModels) {
    let urlSlug = `used-${device.model.toLowerCase().replace(/ /g, '-')}`;
    let capacityMatch = device.storage ? `-${device.storage.toLowerCase().replace('gb', '-gb').replace('tb', '-tb')}` : '';
    let ramMatch = device.ram ? `-${device.ram.toLowerCase().replace('gb', '-gb')}` : '';
    
    const url = `https://www.cashify.in/sell-old-mobile-phone/${urlSlug}${ramMatch}${capacityMatch}`;
    
    console.log(`\nModel: ${device.model} (${device.ram}/${device.storage})`);
    console.log(`Cashify URL: ${url}`);
    
    const cashifyPrice = await fetchCashifyPrice(url);
    const flawlessDiagnostics = {
      calls: true, touch: true, originalScreen: true, warranty: true, validBill: true,
      mobileAge: 'below3', accessories: ['box', 'charger', 'bill'], defects: [], hardware: []
    };
    const fhoneifyPrice = calculateFhoneifyPrice(device.brand, device.model, device.basePrice || 0, flawlessDiagnostics as any);
    
    console.log(`Cashify Extracted Base Price: ${cashifyPrice ? 'Rs. ' + cashifyPrice : 'Not Found/Blocked'}`);
    console.log(`Fhoneify Calculated Price (Flawless): Rs. ${fhoneifyPrice}`);
    console.log(`Our DB Base Price: Rs. ${device.basePrice}`);
    
    await new Promise(r => setTimeout(r, 1000));
  }
};

run();
