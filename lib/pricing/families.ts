export interface PricingFamily {
  engine: string;
  family: string;
  ruleSource: string;
}

const lower = (value: unknown) => String(value ?? '').trim().toLowerCase();

/**
 * Reporting-only mirror of the dispatch and family predicates in
 * lib/pricingCalculator.ts. It does not participate in quote calculation.
 */
export function classifyPricingFamily(brand: string, model: string): PricingFamily {
  const b = lower(brand);
  const m = lower(model);

  if (b === 'apple' || m.includes('iphone')) {
    const generation = m.includes('17e') ? '17e'
      : (m.includes('17') || m.includes('air')) ? '17/air'
        : m.includes('16e') ? '16e'
          : m.includes('16') ? '16'
            : m.includes('15') ? '15'
              : m.includes('14') ? '14'
                : 'legacy';
    const form = m.includes('pro max') ? 'Pro Max'
      : m.includes('pro') ? 'Pro'
        : (m.includes('plus') || m.includes('air')) ? 'Plus/Air'
          : 'standard';
    return {
      engine: 'Apple',
      family: `${generation} ${form}`,
      ruleSource: `calculateApplePrice/getAppleModelParams:${generation}/${form}`,
    };
  }

  if (b === 'samsung' || m.includes('galaxy')) {
    const isA = m.includes('galaxy a') || /\ba\d\d\b/.test(m);
    const family = m.includes('a35') ? 'A35'
      : m.includes('a34') ? 'A34'
        : isA ? 'A-series'
          : m.includes('s24 ultra') ? 'S24 Ultra'
            : m.includes('s26 ultra') ? 'S26 Ultra'
              : m.includes('ultra') ? 'Ultra'
                : m.includes('edge') ? 'Edge'
                  : m.includes('fe') ? 'FE'
                    : (m.includes('fold') || m.includes('flip')) ? 'Fold/Flip'
                      : (m.includes('galaxy s') || /\bs\d/.test(m)) ? 'S/Plus slab'
                        : 'generic Samsung';
    return {
      engine: 'Samsung',
      family,
      ruleSource: `calculateSamsungPrice:${family}`,
    };
  }

  if (b === 'xiaomi' || b === 'redmi' || b === 'poco' || m.includes('xiaomi') || m.includes('redmi') || m.includes('poco')) {
    const family = m.includes('note') ? 'Note' : 'standard';
    return { engine: 'Xiaomi/Redmi/Poco', family, ruleSource: `calculateXiaomiPrice:${family}` };
  }

  if (b === 'vivo' || b === 'iqoo' || m.includes('vivo') || m.includes('iqoo')) {
    const family = m.includes('fold') ? 'Fold' : 'standard';
    return { engine: 'Vivo/iQOO', family, ruleSource: `calculateVivoPrice:${family}` };
  }

  if (b === 'oppo' || m.includes('oppo') || m.includes('reno') || m.includes('find x')) {
    const family = m.includes('find x9s') ? 'Find X9s'
      : m.includes('find x9 ultra') ? 'Find X9 Ultra'
        : m.includes('find x9 pro') ? 'Find X9 Pro'
          : m.includes('reno16c') ? 'Reno16c'
            : m.includes('reno16') ? 'Reno16'
              : 'standard';
    return { engine: 'Oppo', family, ruleSource: `calculateOppoPrice:${family}` };
  }

  if (b === 'oneplus' || m.includes('oneplus') || m.includes('nord')) {
    const proOrFold = m.includes('pro') || m.includes('open') || m.includes('fold');
    const override = m.includes('nord 5') ? 'Nord 5 bill override'
      : m.includes('15r') ? '15R bill override'
        : m.includes('15') ? '15 bill override'
          : null;
    const family = `${proOrFold ? 'Pro/fold' : 'standard/Nord'}${override ? ` + ${override}` : ''}`;
    return { engine: 'OnePlus', family, ruleSource: `calculateOnePlusPrice:${family}` };
  }

  if (b === 'nothing' || b === 'cmf' || m.includes('nothing') || m.includes('cmf')) {
    const family = m.includes('phone 1') || m.includes('phone (1)') ? 'Phone 1'
      : m.includes('phone 2') || m.includes('phone (2)') ? 'Phone 2'
        : 'other/CMF';
    return { engine: 'Nothing/CMF', family, ruleSource: `calculateNothingPrice:${family}` };
  }

  return { engine: 'Generic Android', family: 'shared fallback', ruleSource: 'calculateGenericAndroidPrice' };
}

export const pricingFamilyKey = (brand: string, model: string) => {
  const family = classifyPricingFamily(brand, model);
  return `${family.engine} / ${family.family}`;
};
