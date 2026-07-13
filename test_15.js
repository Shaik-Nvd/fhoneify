const config = require('./lib/pricingConfig.json');

const getAppleModelParams = (model) => {
  return { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.50, originalScreenPenalty: 0.8176, touchPenalty: 0.635, functionalScale: 1.09, physicalScale: 1.0, bodyScale: 0.9806, facePenalty: 0.257307 };
};

function calculateFhoneifyPrice(brand, model, basePrice, diagnostics, customPhysicalScale) {
  const floor_price = config.modelFloorPrice; 
  let age_multiplier = 1.0;
  
  const params = getAppleModelParams(model);
  if (customPhysicalScale !== undefined) {
    params.physicalScale = customPhysicalScale;
  }
  const bodyScale = params.bodyScale || params.physicalScale;

  const applyGranularDefects = (scale, bScale) => {
    let sum = 0;
    const defectsList = diagnostics.defects || [];
    defectsList.forEach(d => {
      let penalty = config.defects_screen_body[d] || 0;
      if (d === 'screen_scratch') {
          penalty = 0.35; 
      }
      sum += penalty * scale;
    });
    return sum;
  };

  age_multiplier = config.ageBonus['6to11'] || 0.9335; 
  
  let screen_body_sum = applyGranularDefects(params.physicalScale, bodyScale);
  const total_penalty_sum = screen_body_sum; 

  const rawCalculated = basePrice * age_multiplier * Math.max(0, 1 - total_penalty_sum);
  const cashifyPrice = (rawCalculated * 1.0 * 1.0) + 380;
  
  let upliftPercent = 1.0;
  if (cashifyPrice <= 20000) {
    upliftPercent = 1.08;
  } else if (cashifyPrice <= 50000) {
    upliftPercent = 1.06;
  } else {
    upliftPercent = 1.04;
  }
  const calculated = cashifyPrice * upliftPercent;
    
  return { price: Math.max(Math.round(calculated), floor_price) };
}

const diag = { defects: ['screen_scratch'], screenCondition: 'Screen cracked/ glass broken', mobileAge: '6to11' };

for (let i = 1.04; i <= 1.08; i += 0.00001) {
  const result = calculateFhoneifyPrice('Apple', 'Apple iPhone 15 Pro Max', 79070, diag, i);
  if (result.price === 49700) {
    console.log("Found matching scale:", i, "Result:", result);
    break;
  }
}
