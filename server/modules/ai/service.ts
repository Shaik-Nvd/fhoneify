export const AIService = {
  // Simulate AI evaluating an image
  async evaluateImage(imageUrl: string, deviceId: string) {
    // Artificial delay to simulate processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate some logic
    const random = Math.random();
    let condition = 'flawless';
    let confidence = 0.95;
    let issues: string[] = [];

    if (random > 0.8) {
      condition = 'broken';
      confidence = 0.89;
      issues = ['Screen crack detected', 'Deep scratch on back glass'];
    } else if (random > 0.5) {
      condition = 'good';
      confidence = 0.92;
      issues = ['Minor scuffs on edges'];
    }

    return {
      condition,
      confidence,
      issues
    };
  },

  // Simulate AI generating a dynamic quote based on market conditions
  async predictPrice(basePrice: number, aiCondition: string) {
    let multiplier = 1.0;
    
    if (aiCondition === 'flawless') multiplier = 1.05; // 5% bonus for flawless AI verification
    if (aiCondition === 'good') multiplier = 0.85;
    if (aiCondition === 'broken') multiplier = 0.40;

    // Simulate market fluctuation (+/- 2%)
    const marketFluctuation = 1 + ((Math.random() - 0.5) * 0.04);
    
    return Math.round(basePrice * multiplier * marketFluctuation);
  },

  // Simulate AI Fraud Detection
  async checkFraud(userId: string, imei: string, ipAddress: string) {
    // In a real app, this would query databases, ML models, and blacklists.
    await new Promise(resolve => setTimeout(resolve, 800));

    const isSuspiciousIMEI = imei.startsWith('999');
    const hasMultipleAccountsOnIp = Math.random() > 0.9;

    let score = 'Low';
    let flags: string[] = [];

    if (isSuspiciousIMEI) {
      score = 'High';
      flags.push('IMEI found on potential blacklist pattern');
    }
    
    if (hasMultipleAccountsOnIp) {
      score = score === 'High' ? 'Critical' : 'Medium';
      flags.push('Multiple accounts active from this IP address');
    }

    return {
      score,
      flags,
      timestamp: new Date().toISOString()
    };
  }
};
