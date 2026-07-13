const config = require('./lib/pricingConfig.json');

const getAppleModelParams = (model) => {
  return { warrantyPenalty: 0.05, gstBillPenalty: 0.02, callsPenalty: 0.50, originalScreenPenalty: 0.782, touchPenalty: 0.635, functionalScale: 1.09, physicalScale: 1.08303, bodyScale: 0.9806, facePenalty: 0.257307 };
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
  const calculated = cashifyPrice * 1.04; 
    
  return { price: Math.max(Math.round(calculated), floor_price) };
}

const diag = { defects: ['screen_scratch'], screenCondition: 'Screen cracked/ glass broken', mobileAge: '6to11' };
console.log("With 1.08303:", calculateFhoneifyPrice('Apple', 'Apple iPhone 16 Pro Max', 93500, diag, 1.08303));