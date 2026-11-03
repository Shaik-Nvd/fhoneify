import { SEED_DEVICES } from './seed_devices';

export interface DetectedDevice {
  brand: string;
  model: string;
  storage: string;
  ram?: string;
  confidence: 'exact' | 'high' | 'approximate';
  deviceKey?: string;
  image?: string;
}

// Common Android hardware build model numbers mapped to human readable catalog names
// e.g. AC2001 -> OnePlus Nord
export const ANDROID_MODEL_MAP: Record<string, { brand: string; model: string }> = {
  // OnePlus Nord series
  'ac2001': { brand: 'OnePlus', model: 'OnePlus Nord' },
  'ac2003': { brand: 'OnePlus', model: 'OnePlus Nord' },
  'eb2101': { brand: 'OnePlus', model: 'OnePlus Nord CE 5G' },
  'eb2103': { brand: 'OnePlus', model: 'OnePlus Nord CE 5G' },
  'dn2101': { brand: 'OnePlus', model: 'OnePlus Nord 2 5G' },
  'dn2103': { brand: 'OnePlus', model: 'OnePlus Nord 2 5G' },
  'iv2201': { brand: 'OnePlus', model: 'OnePlus Nord CE 2 5G' },
  'cph2381': { brand: 'OnePlus', model: 'OnePlus Nord CE 2 Lite 5G' },
  'cph2401': { brand: 'OnePlus', model: 'OnePlus Nord 2T 5G' },
  'cph2467': { brand: 'OnePlus', model: 'OnePlus Nord CE 3 5G' },
  'cph2493': { brand: 'OnePlus', model: 'OnePlus Nord 3 5G' },
  'cph2613': { brand: 'OnePlus', model: 'OnePlus Nord CE4 5G' },
  'cph2629': { brand: 'OnePlus', model: 'OnePlus Nord 4' },

  // OnePlus Flagship & R series
  'gm1901': { brand: 'OnePlus', model: 'OnePlus 7' },
  'gm1911': { brand: 'OnePlus', model: 'OnePlus 7 Pro' },
  'hd1901': { brand: 'OnePlus', model: 'OnePlus 7T' },
  'hd1911': { brand: 'OnePlus', model: 'OnePlus 7T Pro' },
  'in2011': { brand: 'OnePlus', model: 'OnePlus 8' },
  'in2021': { brand: 'OnePlus', model: 'OnePlus 8 Pro' },
  'kb2001': { brand: 'OnePlus', model: 'OnePlus 8T' },
  'le2111': { brand: 'OnePlus', model: 'OnePlus 9' },
  'le2121': { brand: 'OnePlus', model: 'OnePlus 9 Pro' },
  'le2101': { brand: 'OnePlus', model: 'OnePlus 9R' },
  'le2101r': { brand: 'OnePlus', model: 'OnePlus 9RT' },
  'ne2211': { brand: 'OnePlus', model: 'OnePlus 10 Pro' },
  'cph2411': { brand: 'OnePlus', model: 'OnePlus 10R' },
  'cph2413': { brand: 'OnePlus', model: 'OnePlus 10T' },
  'cph2447': { brand: 'OnePlus', model: 'OnePlus 11' },
  'cph2487': { brand: 'OnePlus', model: 'OnePlus 11R' },
  'cph2573': { brand: 'OnePlus', model: 'OnePlus 12' },
  'cph2585': { brand: 'OnePlus', model: 'OnePlus 12R' },

  // Google Pixel series
  'pixel 4a': { brand: 'Google', model: 'Google Pixel 4a' },
  'pixel 6': { brand: 'Google', model: 'Google Pixel 6' },
  'pixel 6a': { brand: 'Google', model: 'Google Pixel 6a' },
  'pixel 6 pro': { brand: 'Google', model: 'Google Pixel 6 Pro' },
  'pixel 7': { brand: 'Google', model: 'Google Pixel 7' },
  'pixel 7a': { brand: 'Google', model: 'Google Pixel 7a' },
  'pixel 7 pro': { brand: 'Google', model: 'Google Pixel 7 Pro' },
  'pixel 8': { brand: 'Google', model: 'Google Pixel 8' },
  'pixel 8a': { brand: 'Google', model: 'Google Pixel 8a' },
  'pixel 8 pro': { brand: 'Google', model: 'Google Pixel 8 Pro' },
  'pixel 9': { brand: 'Google', model: 'Google Pixel 9' },
  'pixel 9 pro': { brand: 'Google', model: 'Google Pixel 9 Pro' },
  'pixel 9 pro xl': { brand: 'Google', model: 'Google Pixel 9 Pro XL' },
  'pixel 9 pro fold': { brand: 'Google', model: 'Google Pixel 9 Pro Fold' },

  // Samsung Galaxy S Series
  'sm-g991b': { brand: 'Samsung', model: 'Samsung Galaxy S21 5G' },
  'sm-g996b': { brand: 'Samsung', model: 'Samsung Galaxy S21 Plus 5G' },
  'sm-g998b': { brand: 'Samsung', model: 'Samsung Galaxy S21 Ultra 5G' },
  'sm-g990b': { brand: 'Samsung', model: 'Samsung Galaxy S21 FE 5G' },
  'sm-s901b': { brand: 'Samsung', model: 'Samsung Galaxy S22' },
  'sm-s906b': { brand: 'Samsung', model: 'Samsung Galaxy S22 Plus' },
  'sm-s908b': { brand: 'Samsung', model: 'Samsung Galaxy S22 Ultra 5G' },
  'sm-s711b': { brand: 'Samsung', model: 'Samsung Galaxy S23 FE' },
  'sm-s911b': { brand: 'Samsung', model: 'Samsung Galaxy S23 5G' },
  'sm-s916b': { brand: 'Samsung', model: 'Samsung Galaxy S23 Plus 5G' },
  'sm-s918b': { brand: 'Samsung', model: 'Samsung Galaxy S23 Ultra 5G' },
  'sm-s921b': { brand: 'Samsung', model: 'Samsung Galaxy S24' },
  'sm-s926b': { brand: 'Samsung', model: 'Samsung Galaxy S24 Plus' },
  'sm-s928b': { brand: 'Samsung', model: 'Samsung Galaxy S24 Ultra' },

  // Samsung Galaxy Z Series
  'sm-f711b': { brand: 'Samsung', model: 'Samsung Galaxy Z Flip 3 5G' },
  'sm-f926b': { brand: 'Samsung', model: 'Samsung Galaxy Z Fold 3 5G' },
  'sm-f721b': { brand: 'Samsung', model: 'Samsung Galaxy Z Flip 4 5G' },
  'sm-f936b': { brand: 'Samsung', model: 'Samsung Galaxy Z Fold 4 5G' },
  'sm-f731b': { brand: 'Samsung', model: 'Samsung Galaxy Z Flip 5' },
  'sm-f946b': { brand: 'Samsung', model: 'Samsung Galaxy Z Fold 5' },
  'sm-f741b': { brand: 'Samsung', model: 'Samsung Galaxy Z Flip 6' },
  'sm-f956b': { brand: 'Samsung', model: 'Samsung Galaxy Z Fold 6' },

  // Samsung Galaxy A Series & M Series common
  'sm-a525f': { brand: 'Samsung', model: 'Samsung Galaxy A52' },
  'sm-a526b': { brand: 'Samsung', model: 'Samsung Galaxy A52s 5G' },
  'sm-a536b': { brand: 'Samsung', model: 'Samsung Galaxy A53 5G' },
  'sm-a546e': { brand: 'Samsung', model: 'Samsung Galaxy A54 5G' },
  'sm-a556e': { brand: 'Samsung', model: 'Samsung Galaxy A55 5G' },
  'sm-a346e': { brand: 'Samsung', model: 'Samsung Galaxy A34 5G' },
  'sm-a356e': { brand: 'Samsung', model: 'Samsung Galaxy A35 5G' },
  'sm-m346b': { brand: 'Samsung', model: 'Samsung Galaxy M34 5G' },
  'sm-m546b': { brand: 'Samsung', model: 'Samsung Galaxy M54 5G' },

  // Xiaomi / Redmi / POCO
  '2201116sg': { brand: 'Xiaomi', model: 'Xiaomi Redmi Note 11 Pro 5G' },
  '22101316g': { brand: 'Xiaomi', model: 'Xiaomi Redmi Note 12 Pro 5G' },
  '2312draf3g': { brand: 'Xiaomi', model: 'Xiaomi Redmi Note 13 Pro 5G' },
  '23116pn5bc': { brand: 'Xiaomi', model: 'Xiaomi 14' },
  '24030pn60g': { brand: 'Xiaomi', model: 'Xiaomi 14 Ultra' },
  'm2012k11ag': { brand: 'POCO', model: 'POCO F3' },
  '22041216g': { brand: 'POCO', model: 'POCO F4 5G' },
  '23049pcd8g': { brand: 'POCO', model: 'POCO F5 5G' },
  '2311drk48g': { brand: 'POCO', model: 'POCO X6 Pro 5G' },

  // Vivo & iQOO
  'v2307': { brand: 'Vivo', model: 'Vivo X100 Pro' },
  'v2308': { brand: 'Vivo', model: 'Vivo X100' },
  'v2324': { brand: 'iQOO', model: 'iQOO 12' },
  'v2243': { brand: 'iQOO', model: 'iQOO Neo 7' },
  'i2214': { brand: 'iQOO', model: 'iQOO Neo 9 Pro' },

  // Nothing
  'a063': { brand: 'Nothing', model: 'Nothing Phone 1' },
  'a065': { brand: 'Nothing', model: 'Nothing Phone 2' },
  'a142': { brand: 'Nothing', model: 'Nothing Phone 2a' },
};

// Clean string helper for fuzzy matching
function clean(str: unknown): string {
  if (typeof str !== 'string') return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Searches SEED_DEVICES for the best matching device based on brand and model name
 */
export function findMatchingCatalogDevice(
  brand: string,
  modelName: string,
  preferredStorage?: string
): { brand: string; model: string; storage: string } | null {
  const brandClean = clean(brand);
  const targetClean = clean(modelName);

  // Filter devices by brand
  const brandMatches = SEED_DEVICES.filter((d) => clean(d.brand) === brandClean);
  if (brandMatches.length === 0) return null;

  // 1. Exact model match
  let matched = brandMatches.filter(
    (d) => clean(d.model) === targetClean || clean(`${d.brand} ${d.model}`) === targetClean
  );

  // 2. Contains match if exact not found
  if (matched.length === 0) {
    matched = brandMatches.filter(
      (d) =>
        clean(d.model).includes(targetClean) ||
        targetClean.includes(clean(d.model))
    );
  }

  if (matched.length === 0) return null;

  // Pick preferred storage if available, else pick the middle/popular variant
  let selected = matched[0];
  if (preferredStorage) {
    const withStorage = matched.find((d) => clean(d.storage) === clean(preferredStorage));
    if (withStorage) selected = withStorage;
  } else {
    // If multiple storage options, e.g. 8 GB/128 GB is typically the mid variant
    const midIndex = Math.floor(matched.length / 2);
    selected = matched[midIndex] || matched[0];
  }

  return {
    brand: selected.brand,
    model: selected.model,
    storage: selected.storage,
  };
}

export interface DetectionInput {
  userAgent?: string;
  clientHintsModel?: string;
  clientHintsPlatform?: string;
  screen?: { width: number; height: number; devicePixelRatio: number };
  webglRenderer?: string;
}

/**
 * Detects device brand and model from user agent & client hints
 */
export function detectDeviceFromInput(input: DetectionInput): DetectedDevice | null {
  const chModel = (input.clientHintsModel || '').trim();
  const ua = (input.userAgent || '').trim();

  // 1. High-Entropy Client Hints Model (Direct hardware identifier from Chrome on Android)
  if (chModel) {
    const key = chModel.toLowerCase();
    if (ANDROID_MODEL_MAP[key]) {
      const { brand, model } = ANDROID_MODEL_MAP[key];
      const catalog = findMatchingCatalogDevice(brand, model);
      if (catalog) {
        return {
          brand: catalog.brand,
          model: catalog.model,
          storage: catalog.storage,
          confidence: 'exact',
        };
      }
    }

    // Try finding by model name directly if the model string contains text like "OnePlus Nord"
    for (const b of ['OnePlus', 'Samsung', 'Google', 'Xiaomi', 'Vivo', 'Oppo', 'Realme', 'POCO', 'iQOO', 'Nothing', 'Apple']) {
      if (clean(chModel).includes(clean(b))) {
        const catalog = findMatchingCatalogDevice(b, chModel);
        if (catalog) {
          return {
            brand: catalog.brand,
            model: catalog.model,
            storage: catalog.storage,
            confidence: 'high',
          };
        }
      }
    }
  }

  // 2. Parse User-Agent for Android build model (e.g., "... Android 12; AC2001 Build/..." or "SM-S918B")
  if (ua.includes('Android')) {
    // Look for model in UA: "Android [version]; <Model> Build/" or "Android [version]; <Model>)"
    const androidMatch = ua.match(/Android\s+[^;]+;\s*([^;)]+?)(?:\s+Build|\s*\))/i);
    if (androidMatch && androidMatch[1]) {
      const rawModel = androidMatch[1].trim().toLowerCase();
      
      // Check in direct map
      if (ANDROID_MODEL_MAP[rawModel]) {
        const { brand, model } = ANDROID_MODEL_MAP[rawModel];
        const catalog = findMatchingCatalogDevice(brand, model);
        if (catalog) {
          return {
            brand: catalog.brand,
            model: catalog.model,
            storage: catalog.storage,
            confidence: 'exact',
          };
        }
      }

      // Check known brand prefixes in model name
      for (const b of ['OnePlus', 'Samsung', 'Google', 'Xiaomi', 'Vivo', 'Oppo', 'Realme', 'POCO', 'iQOO', 'Nothing']) {
        if (rawModel.includes(b.toLowerCase())) {
          const catalog = findMatchingCatalogDevice(b, rawModel);
          if (catalog) {
            return {
              brand: catalog.brand,
              model: catalog.model,
              storage: catalog.storage,
              confidence: 'high',
            };
          }
        }
      }
    }
  }

  // 3. Apple iOS (iPhone) detection via User-Agent, Screen Dimension & WebGL Renderer heuristic
  if (ua.includes('iPhone')) {
    // iOS Safari conceals the exact model in the UA string ("iPhone; CPU iPhone OS..."),
    // but screen resolution + devicePixelRatio uniquely identifies iPhone screen classes:
    const screen = input.screen;
    const renderer = (input.webglRenderer || '').toLowerCase();
    let modelName = 'Apple iPhone 13'; // Popular baseline fallback
    let storage = '128 GB';

    if (screen) {
      const w = Math.min(screen.width, screen.height);
      const h = Math.max(screen.width, screen.height);
      const dpr = screen.devicePixelRatio || 2;

      // Match physical screen dimensions
      if (w === 430 && h === 932 && dpr === 3) {
        modelName = 'Apple iPhone 15 Pro Max';
        storage = '256 GB';
      } else if (w === 393 && h === 852 && dpr === 3) {
        // Dynamic Island standard screen (iPhone 15 / 16 / 15 Pro)
        modelName = renderer.includes('a17') ? 'Apple iPhone 15 Pro' : 'Apple iPhone 15';
        storage = '128 GB';
      } else if (w === 390 && h === 844 && dpr === 3) {
        // iPhone 12, iPhone 13, and iPhone 14 all share 390x844 @3x.
        // Check WebGL renderer heuristic:
        // A14 GPU -> iPhone 12
        // A15 4-core GPU -> iPhone 13
        // A15 5-core GPU -> iPhone 13 Pro / iPhone 14
        if (renderer.includes('a14')) {
          modelName = 'Apple iPhone 12';
        } else if (renderer.includes('a15')) {
          // If 5-core or specifically indicates 14/pro
          if (renderer.includes('5-core') || renderer.includes('iphone14')) {
            modelName = 'Apple iPhone 14';
          } else {
            modelName = 'Apple iPhone 13';
          }
        } else {
          // When renderer is generic Apple GPU, iPhone 13 is the most common device in this form factor
          modelName = 'Apple iPhone 13';
        }
        storage = '128 GB';
      } else if (w === 428 && h === 926 && dpr === 3) {
        modelName = renderer.includes('a14') ? 'Apple iPhone 12 Pro Max' : 'Apple iPhone 14 Plus';
        storage = '128 GB';
      } else if (w === 375 && h === 812 && dpr === 3) {
        modelName = 'Apple iPhone 12 mini';
        storage = '64 GB';
      } else if (w === 414 && h === 896 && dpr === 2) {
        modelName = 'Apple iPhone 11';
        storage = '64 GB';
      } else if (w === 375 && h === 667 && dpr === 2) {
        modelName = 'Apple iPhone SE 2020';
        storage = '64 GB';
      }
    }

    const catalog = findMatchingCatalogDevice('Apple', modelName, storage);
    if (catalog) {
      return {
        brand: catalog.brand,
        model: catalog.model,
        storage: catalog.storage,
        confidence: 'approximate',
      };
    }
  }

  return null;
}
