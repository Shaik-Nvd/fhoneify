import { SEED_DEVICES } from '../lib/seed_devices';
import { calculateFhoneifyPrice } from '../lib/pricingCalculator';

const runEvaluation = () => {
  const anomalies: any[] = [];
  let totalProcessed = 0;

  const testCases = [
    {
      name: 'Flawless',
      diagnostics: {
        calls: true, touch: true, originalScreen: true, warranty: true, validBill: true,
        mobileAge: 'below3', accessories: ['box', 'charger', 'bill'], defects: [], hardware: []
      }
    },
    {
      name: 'Out of Warranty, No Bill',
      diagnostics: {
        calls: true, touch: true, originalScreen: true, warranty: false, validBill: false,
        mobileAge: 'above11', accessories: ['box', 'charger'], defects: [], hardware: []
      }
    },
    {
      name: 'Dead Touch',
      diagnostics: {
        calls: true, touch: false, originalScreen: true, warranty: false, validBill: false,
        mobileAge: 'above11', accessories: [], defects: [], hardware: []
      }
    },
    {
      name: 'Shattered Screen + Missing Panel',
      diagnostics: {
        calls: true, touch: true, originalScreen: true, warranty: false, validBill: false,
        mobileAge: 'above11', accessories: [], defects: ['broken_screen', 'panel_missing'], hardware: []
      }
    },
    {
      name: 'Multiple Functional Defects',
      diagnostics: {
        calls: true, touch: true, originalScreen: true, warranty: false, validBill: false,
        mobileAge: 'above11', accessories: [], defects: [], hardware: ['fingerprint', 'speaker', 'wifi', 'charging']
      }
    },
    {
      name: 'No Calls + No Warranty',
      diagnostics: {
        calls: false, touch: true, originalScreen: true, warranty: false, validBill: false,
        mobileAge: 'above11', accessories: [], defects: [], hardware: []
      }
    }
  ];

  for (const device of SEED_DEVICES) {
    if (!device.basePrice) continue;
    
    for (const testCase of testCases) {
      try {
        const price = calculateFhoneifyPrice(device.brand, device.model, device.basePrice, testCase.diagnostics as any);
        
        let anomalyType = null;
        if (isNaN(price)) {
          anomalyType = 'NaN Price';
        } else if (price < 1200 && price > 0) { // Wait, the algorithm has a floor_price of 1200, so it shouldn't be < 1200
          // Actually let's just see if floor price logic is completely failing
          anomalyType = 'Below Floor Price';
        } else if (price < 0) {
          anomalyType = 'Negative Price';
        } else if (price > device.basePrice * 1.5) {
          anomalyType = 'Price Too High vs Base';
        }

        if (anomalyType) {
          anomalies.push({
            id: device.id,
            brand: device.brand,
            model: device.model,
            basePrice: device.basePrice,
            case: testCase.name,
            calculatedPrice: price,
            error: anomalyType
          });
        }
      } catch (err: any) {
        anomalies.push({
          id: device.id,
          brand: device.brand,
          model: device.model,
          basePrice: device.basePrice,
          case: testCase.name,
          error: err.message
        });
      }
      totalProcessed++;
    }
  }

  console.log(`Evaluated ${totalProcessed} combinations across ${SEED_DEVICES.length} models.`);
  console.log(`Found ${anomalies.length} anomalies.`);
  
  if (anomalies.length > 0) {
    // Print summary of errors
    const errorCounts = anomalies.reduce((acc, curr) => {
      acc[curr.error] = (acc[curr.error] || 0) + 1;
      return acc;
    }, {});
    console.log('Error Breakdown:', errorCounts);
    
    // Sample the first 10
    console.log('Sample Anomalies:', JSON.stringify(anomalies.slice(0, 10), null, 2));
  }
};

runEvaluation();
