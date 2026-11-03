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

// Android hardware build / model numbers mapped to verified catalog entries
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
  'cph2613': { brand: 'OnePlus', model: 'Oneplus Nord CE4 5G' },
  'cph2629': { brand: 'OnePlus', model: 'OnePlus Nord 4' },

  // OnePlus Flagship & R series
  'gm1901': { brand: 'OnePlus', model: 'OnePlus 7' },
  'gm1911': { brand: 'OnePlus', model: 'OnePlus 7 Pro' },
  'hd1901': { brand: 'OnePlus', model: 'OnePlus 7T' },
  'hd1911': { brand: 'OnePlus', model: 'OnePlus 7T Pro' },
  'in2011': { brand: 'OnePlus', model: 'OnePlus 8' },
  'in2021': { brand: 'OnePlus', model: 'OnePlus 8 Pro' },
  'kb2001': { brand: 'OnePlus', model: 'OnePlus 8T' },
  'le2111': { brand: 'OnePlus', model: 'OnePlus 9 5G' },
  'le2121': { brand: 'OnePlus', model: 'OnePlus 9 Pro 5G' },
  'le2101': { brand: 'OnePlus', model: 'OnePlus 9R 5G' },
  'le2101r': { brand: 'OnePlus', model: 'OnePlus 9RT 5G' },
  'ne2211': { brand: 'OnePlus', model: 'OnePlus 10 Pro 5G' },
  'cph2411': { brand: 'OnePlus', model: 'OnePlus 10R 5G' },
  'cph2413': { brand: 'OnePlus', model: 'OnePlus 10T 5G' },
  'cph2447': { brand: 'OnePlus', model: 'OnePlus 11 5G' },
  'cph2487': { brand: 'OnePlus', model: 'OnePlus 11R 5G' },
  'cph2573': { brand: 'OnePlus', model: 'OnePlus 12' },
  'cph2585': { brand: 'OnePlus', model: 'OnePlus 12R' },

  // Google Pixel series
  'pixel 4a': { brand: 'Google', model: 'Google Pixel 4A' },
  'pixel 6a': { brand: 'Google', model: 'Google Pixel 6a' },
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
  'sm-g991': { brand: 'Samsung', model: 'Samsung Galaxy S21 5G' },
  'sm-g996': { brand: 'Samsung', model: 'Samsung Galaxy S21 Plus 5G' },
  'sm-g998': { brand: 'Samsung', model: 'Samsung Galaxy S21 Ultra 5G' },
  'sm-g990': { brand: 'Samsung', model: 'Samsung Galaxy S21 FE 5G' },
  'sm-s901': { brand: 'Samsung', model: 'Samsung Galaxy S22 5G' },
  'sm-s906': { brand: 'Samsung', model: 'Samsung Galaxy S22 Plus 5G' },
  'sm-s908': { brand: 'Samsung', model: 'Samsung Galaxy S22 Ultra 5G' },
  'sm-s711': { brand: 'Samsung', model: 'Samsung Galaxy S23 FE 5G' },
  'sm-s911': { brand: 'Samsung', model: 'Samsung Galaxy S23 5G' },
  'sm-s916': { brand: 'Samsung', model: 'Samsung Galaxy S23 Plus 5G' },
  'sm-s918': { brand: 'Samsung', model: 'Samsung Galaxy S23 Ultra 5G' },
  'sm-s921': { brand: 'Samsung', model: 'Samsung Galaxy S24 5G' },
  'sm-s926': { brand: 'Samsung', model: 'Samsung Galaxy S24 Plus 5G' },
  'sm-s928': { brand: 'Samsung', model: 'Samsung Galaxy S24 Ultra 5G' },
  'sm-g780': { brand: 'Samsung', model: 'Samsung Galaxy S20 FE' },
  'sm-g781': { brand: 'Samsung', model: 'Samsung Galaxy S20 FE 5G' },
  'sm-g985': { brand: 'Samsung', model: 'Samsung Galaxy S20 Plus' },
  'sm-g988': { brand: 'Samsung', model: 'Samsung Galaxy S20 Ultra 5G' },
  'sm-g973': { brand: 'Samsung', model: 'Samsung Galaxy S10' },
  'sm-g975': { brand: 'Samsung', model: 'Samsung Galaxy S10 Plus' },
  'sm-g970': { brand: 'Samsung', model: 'Samsung Galaxy S10e' },

  // Samsung Galaxy Note Series
  'sm-n981': { brand: 'Samsung', model: 'Samsung Galaxy Note 20' },
  'sm-n770': { brand: 'Samsung', model: 'Samsung Galaxy Note 10 Lite' },
  'sm-n975': { brand: 'Samsung', model: 'Samsung Galaxy Note 10 Plus' },

  // Samsung Galaxy Z Series
  'sm-f711': { brand: 'Samsung', model: 'Samsung Galaxy Z Flip3 5G' },
  'sm-f926': { brand: 'Samsung', model: 'Samsung Galaxy Z Fold3 5G' },
  'sm-f721': { brand: 'Samsung', model: 'Samsung Galaxy Z Flip4' },
  'sm-f936': { brand: 'Samsung', model: 'Samsung Galaxy Z Fold4' },
  'sm-f731': { brand: 'Samsung', model: 'Samsung Galaxy Z Flip5' },
  'sm-f946': { brand: 'Samsung', model: 'Samsung Galaxy Z Fold5' },
  'sm-f741': { brand: 'Samsung', model: 'Samsung Galaxy Z Flip6 5G' },
  'sm-f956': { brand: 'Samsung', model: 'Samsung Galaxy Z Fold6 5G' },

  // Samsung Galaxy A Series
  'sm-a146': { brand: 'Samsung', model: 'Samsung Galaxy A14 5G' },
  'sm-a145': { brand: 'Samsung', model: 'Samsung Galaxy A14' },
  'sm-a156': { brand: 'Samsung', model: 'Samsung Galaxy A15 5G' },
  'sm-a166': { brand: 'Samsung', model: 'Samsung Galaxy A16 5G' },
  'sm-a135': { brand: 'Samsung', model: 'Samsung Galaxy A13' },
  'sm-a127': { brand: 'Samsung', model: 'Samsung Galaxy A12' },
  'sm-a125': { brand: 'Samsung', model: 'Samsung Galaxy A12' },
  'sm-a226': { brand: 'Samsung', model: 'Samsung Galaxy A22 5G' },
  'sm-a225': { brand: 'Samsung', model: 'Samsung Galaxy A22' },
  'sm-a236': { brand: 'Samsung', model: 'Samsung Galaxy A23 5G' },
  'sm-a235': { brand: 'Samsung', model: 'Samsung Galaxy A23' },
  'sm-a256': { brand: 'Samsung', model: 'Samsung Galaxy A25 5G' },
  'sm-a336': { brand: 'Samsung', model: 'Samsung Galaxy A33 5G' },
  'sm-a505': { brand: 'Samsung', model: 'Samsung Galaxy A50' },
  'sm-a515': { brand: 'Samsung', model: 'Samsung Galaxy A51' },
  'sm-a525': { brand: 'Samsung', model: 'Samsung Galaxy A52' },
  'sm-a526': { brand: 'Samsung', model: 'Samsung Galaxy A52s 5G' },
  'sm-a536': { brand: 'Samsung', model: 'Samsung Galaxy A53 5G' },
  'sm-a546': { brand: 'Samsung', model: 'Samsung Galaxy A54 5G' },
  'sm-a715': { brand: 'Samsung', model: 'Samsung Galaxy A71' },
  'sm-a725': { brand: 'Samsung', model: 'Samsung Galaxy A72' },
  'sm-a736': { brand: 'Samsung', model: 'Samsung Galaxy A73 5G' },
  'sm-a035': { brand: 'Samsung', model: 'Samsung Galaxy A03' },
  'sm-a037': { brand: 'Samsung', model: 'Samsung Galaxy A03s' },
  'sm-a042': { brand: 'Samsung', model: 'Samsung Galaxy A04' },
  'sm-a045': { brand: 'Samsung', model: 'Samsung Galaxy A04' },
  'sm-a047': { brand: 'Samsung', model: 'Samsung Galaxy A04s' },
  'sm-a055': { brand: 'Samsung', model: 'Samsung Galaxy A05' },
  'sm-a057': { brand: 'Samsung', model: 'Samsung Galaxy A05s' },
  'sm-a065': { brand: 'Samsung', model: 'Samsung Galaxy A06' },
  'sm-a066': { brand: 'Samsung', model: 'Samsung Galaxy A06 5G' },
  'sm-a075': { brand: 'Samsung', model: 'Samsung Galaxy A07 5G' },
  'sm-a076': { brand: 'Samsung', model: 'Samsung Galaxy A07 5G' },
  'sm-a077': { brand: 'Samsung', model: 'Samsung Galaxy A07 5G' },

  // Samsung Galaxy M & F Series
  'sm-m127': { brand: 'Samsung', model: 'Samsung Galaxy M12' },
  'sm-m136': { brand: 'Samsung', model: 'Samsung Galaxy M13 5G' },
  'sm-m145': { brand: 'Samsung', model: 'Samsung Galaxy M14 4G' },
  'sm-m215': { brand: 'Samsung', model: 'Samsung Galaxy M21' },
  'sm-m315': { brand: 'Samsung', model: 'Samsung Galaxy M31' },
  'sm-m325': { brand: 'Samsung', model: 'Samsung Galaxy M32' },
  'sm-m336': { brand: 'Samsung', model: 'Samsung Galaxy M33 5G' },
  'sm-m515': { brand: 'Samsung', model: 'Samsung Galaxy M51' },
  'sm-m526': { brand: 'Samsung', model: 'Samsung Galaxy M52 5G' },
  'sm-m536': { brand: 'Samsung', model: 'Samsung Galaxy M53 5G' },
  'sm-e146': { brand: 'Samsung', model: 'Samsung Galaxy F14 5G' },

  // Xiaomi / Redmi / POCO
  '2201116sg': { brand: 'Xiaomi', model: 'Xiaomi Redmi Note 11 Pro Plus 5G' },
  '22101316g': { brand: 'Xiaomi', model: 'Xiaomi Redmi Note 12 Pro 5G' },
  '2312draf3g': { brand: 'Xiaomi', model: 'Xiaomi Redmi Note 13 Pro 5G' },
  '23116pn5bc': { brand: 'Xiaomi', model: 'Xiaomi 14' },
  '24030pn60g': { brand: 'Xiaomi', model: 'Xiaomi 14 Ultra' },
  'm2012k11ag': { brand: 'POCO', model: 'POCO F3 GT' },
  '22041216g': { brand: 'POCO', model: 'POCO F4 5G' },
  '23049pcd8g': { brand: 'POCO', model: 'POCO F5 5G' },
  '2311drk48g': { brand: 'POCO', model: 'POCO X6 Pro 5G' },

  // Vivo & iQOO
  'v2307': { brand: 'Vivo', model: 'Vivo X100 Pro' },
  'v2308': { brand: 'Vivo', model: 'Vivo X100' },
  'v2324': { brand: 'iQOO', model: 'iQOO 12 5G' },
  'v2243': { brand: 'iQOO', model: 'iQOO Neo 7 5G' },
  'i2214': { brand: 'iQOO', model: 'iQOO Neo 9 Pro 5G' },

  // Nothing
  'a063': { brand: 'Nothing', model: 'Nothing Phone 1' },
  'a065': { brand: 'Nothing', model: 'Nothing Phone 2' },
  'a142': { brand: 'Nothing', model: 'Nothing Phone 2a 5G' },
};

// WebGL GPU Renderer to Android device family heuristics (used when User-Agent is frozen to 'Android 10; K')
export const ANDROID_GPU_HEURISTICS: Array<{ match: RegExp; brand: string; model: string }> = [
  // Snapdragon 765G -> OnePlus Nord
  { match: /adreno\s*(?:\(tm\))?\s*620/i, brand: 'OnePlus', model: 'OnePlus Nord' },
  // Snapdragon 855 / 855+ -> OnePlus 7T
  { match: /adreno\s*(?:\(tm\))?\s*640/i, brand: 'OnePlus', model: 'OnePlus 7T' },
  // Snapdragon 865 -> OnePlus 8T
  { match: /adreno\s*(?:\(tm\))?\s*650/i, brand: 'OnePlus', model: 'OnePlus 8T' },
  // Snapdragon 888 -> OnePlus 9 Pro 5G
  { match: /adreno\s*(?:\(tm\))?\s*660/i, brand: 'OnePlus', model: 'OnePlus 9 Pro 5G' },
  // Snapdragon 8 Gen 1 -> OnePlus 10 Pro 5G
  { match: /adreno\s*(?:\(tm\))?\s*730/i, brand: 'OnePlus', model: 'OnePlus 10 Pro 5G' },
  // Snapdragon 8 Gen 2 -> Samsung Galaxy S23 Ultra 5G
  { match: /adreno\s*(?:\(tm\))?\s*740/i, brand: 'Samsung', model: 'Samsung Galaxy S23 Ultra 5G' },
  // Snapdragon 8 Gen 3 -> Samsung Galaxy S24 Ultra 5G
  { match: /adreno\s*(?:\(tm\))?\s*750/i, brand: 'Samsung', model: 'Samsung Galaxy S24 Ultra 5G' },
  // Snapdragon 7s Gen 2 -> Xiaomi Redmi Note 13 Pro 5G
  { match: /adreno\s*(?:\(tm\))?\s*710/i, brand: 'Xiaomi', model: 'Xiaomi Redmi Note 13 Pro 5G' },
  // Snapdragon 7 Gen 3 -> OnePlus Nord CE4 5G
  { match: /adreno\s*(?:\(tm\))?\s*720/i, brand: 'OnePlus', model: 'Oneplus Nord CE4 5G' },
  // Snapdragon 695 -> OnePlus Nord CE 2 Lite 5G
  { match: /adreno\s*(?:\(tm\))?\s*619/i, brand: 'OnePlus', model: 'OnePlus Nord CE 2 Lite 5G' },
  // MediaTek Dimensity 1200 -> OnePlus Nord 2 5G
  { match: /mali-g77/i, brand: 'OnePlus', model: 'OnePlus Nord 2 5G' },
  // MediaTek Dimensity 7200 Pro -> Nothing Phone 2a 5G
  { match: /mali-g610/i, brand: 'Nothing', model: 'Nothing Phone 2a 5G' },
  // MediaTek Dimensity 9300 -> Vivo X100
  { match: /immortalis-g720|mali-g715/i, brand: 'Vivo', model: 'Vivo X100' },
  // Exynos 2100 -> Samsung Galaxy S21 5G
  { match: /mali-g78/i, brand: 'Samsung', model: 'Samsung Galaxy S21 5G' },
  // Exynos 1280 -> Samsung Galaxy A53 5G
  { match: /mali-g68/i, brand: 'Samsung', model: 'Samsung Galaxy A53 5G' },
  // Mali-G57 (Dimensity 700 / Exynos 1330) -> Samsung Galaxy A14 5G (top selling Indian 5G budget smartphone)
  { match: /mali-g57/i, brand: 'Samsung', model: 'Samsung Galaxy A14 5G' },
  // Mali-G52 -> Samsung Galaxy A13 / A12
  { match: /mali-g52/i, brand: 'Samsung', model: 'Samsung Galaxy A13' },
];

// Clean string helper for fuzzy matching
function clean(str: unknown): string {
  if (typeof str !== 'string') return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Parses storage string to MB/GB order for variant sorting
function parseStorageCapacity(storageStr: string): number {
  const part = storageStr.includes('/') ? storageStr.split('/').pop()?.trim() || '' : storageStr.trim();
  const tb = part.match(/(\d+)\s*tb/i);
  if (tb) return parseInt(tb[1], 10) * 1024;
  const gb = part.match(/(\d+)\s*gb/i);
  if (gb) return parseInt(gb[1], 10);
  const mb = part.match(/(\d+)\s*mb/i);
  if (mb) return parseInt(mb[1], 10) / 1024;
  return 0;
}

/**
 * Normalizes an Android model string (e.g., 'SM-A146B/DS', 'sm-s9180' -> 'sm-a146', 'sm-s918')
 */
export function normalizeAndroidModelKey(raw: string): string {
  const s = raw.toLowerCase().trim();

  // Strip dual-SIM or carrier postfixes like '/ds', '/duos', '_ds'
  const withoutDs = s.replace(/[\/_](ds|duos)$/i, '').trim();

  // Check Samsung model pattern: sm-s918b, sm-a146b, sm-g991b -> sm-s918, sm-a146, sm-g991
  const smMatch = withoutDs.match(/^(sm-[a-z]\d{3})[a-z0-9]*/i);
  if (smMatch) {
    return smMatch[1].toLowerCase();
  }

  // Also check without hyphen: sma146b -> sm-a146
  const smNoHyphen = withoutDs.match(/^sm([a-z]\d{3})[a-z0-9]*/i);
  if (smNoHyphen) {
    return `sm-${smNoHyphen[1].toLowerCase()}`;
  }

  return clean(withoutDs);
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
  const brandMatches = SEED_DEVICES.filter((d) => d && d.brand && clean(d.brand) === brandClean);
  if (brandMatches.length === 0) return null;

  // 1. Exact model match
  let matched = brandMatches.filter(
    (d) => d && d.model && (clean(d.model) === targetClean || clean(`${d.brand} ${d.model}`) === targetClean)
  );

  // 2. Contains match if exact not found
  if (matched.length === 0) {
    matched = brandMatches.filter(
      (d) =>
        d &&
        d.model &&
        (clean(d.model).includes(targetClean) ||
          targetClean.includes(clean(d.model)))
    );
  }

  if (matched.length === 0) return null;

  // Pick preferred storage if available
  if (preferredStorage) {
    const withStorage = matched.find((d) => d && d.storage && clean(d.storage) === clean(preferredStorage));
    if (withStorage) {
      return {
        brand: withStorage.brand,
        model: withStorage.model,
        storage: withStorage.storage,
      };
    }
  }

  // Sort matched variants in ascending storage capacity (e.g. 64GB, 128GB, 256GB)
  const sortedVariants = [...matched].sort((a, b) => {
    return parseStorageCapacity(a.storage || '') - parseStorageCapacity(b.storage || '');
  });

  // Pick the mid/most popular variant (e.g., for 3 variants: [64, 128, 256] -> index 1 (128GB))
  const midIndex = Math.floor(sortedVariants.length / 2);
  const selected = sortedVariants[midIndex] || sortedVariants[0];

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
  preferredStorage?: string;
}

/**
 * Detects device brand and model from user agent & client hints
 */
export function detectDeviceFromInput(input: DetectionInput): DetectedDevice | null {
  const chModel = (input.clientHintsModel || '').trim();
  const ua = (input.userAgent || '').trim();
  const renderer = (input.webglRenderer || '').trim();
  const isAndroid =
    (input.clientHintsPlatform || '').toLowerCase() === 'android' ||
    ua.includes('Android') ||
    /linux\s+arm/i.test(ua);

  // 1. High-Entropy Client Hints Model (Direct hardware identifier from Chrome on Android)
  if (chModel && chModel !== 'K' && chModel !== 'unknown') {
    const rawKey = chModel.toLowerCase();
    const normalizedKey = normalizeAndroidModelKey(chModel);

    // Direct lookup or normalized lookup
    const mapEntry = ANDROID_MODEL_MAP[rawKey] || ANDROID_MODEL_MAP[normalizedKey];
    if (mapEntry) {
      const catalog = findMatchingCatalogDevice(mapEntry.brand, mapEntry.model, input.preferredStorage);
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
        const catalog = findMatchingCatalogDevice(b, chModel, input.preferredStorage);
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
  if (isAndroid) {
    // Look for model in UA: "Android [version]; <Model> Build/" or "Android [version]; <Model>)"
    const androidMatch = ua.match(/Android\s+[^;]+;\s*([^;)]+?)(?:\s+Build|\s*\))/i);
    if (androidMatch && androidMatch[1]) {
      const rawModel = androidMatch[1].trim();

      // Modern Chrome freezes model to 'K'. Only use if not 'K'
      if (rawModel !== 'K' && rawModel.length > 1) {
        const rawKey = rawModel.toLowerCase();
        const normalizedKey = normalizeAndroidModelKey(rawModel);

        const mapEntry = ANDROID_MODEL_MAP[rawKey] || ANDROID_MODEL_MAP[normalizedKey];
        if (mapEntry) {
          const catalog = findMatchingCatalogDevice(mapEntry.brand, mapEntry.model, input.preferredStorage);
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
          if (clean(rawModel).includes(clean(b))) {
            const catalog = findMatchingCatalogDevice(b, rawModel, input.preferredStorage);
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

    // 2b. Android WebGL GPU Renderer Heuristic (Crucial fallback when Chrome UA is frozen to 'Android 10; K')
    if (renderer) {
      for (const h of ANDROID_GPU_HEURISTICS) {
        if (h.match.test(renderer)) {
          const catalog = findMatchingCatalogDevice(h.brand, h.model, input.preferredStorage);
          if (catalog) {
            return {
              brand: catalog.brand,
              model: catalog.model,
              storage: catalog.storage,
              confidence: 'approximate',
            };
          }
        }
      }
    }

    // 2c. Android Fallback for active mobile visitors when UA is completely frozen and GPU is generic
    // Display the most popular Android resale hero device (Samsung Galaxy A14 5G)
    const fallbackCatalog = findMatchingCatalogDevice('Samsung', 'Samsung Galaxy A14 5G', input.preferredStorage || '4 GB/64 GB');
    if (fallbackCatalog) {
      return {
        brand: fallbackCatalog.brand,
        model: fallbackCatalog.model,
        storage: fallbackCatalog.storage,
        confidence: 'approximate',
      };
    }
  }

  // 3. Apple iOS (iPhone) detection via User-Agent, Screen Dimension & WebGL Renderer heuristic
  if (ua.includes('iPhone')) {
    const screen = input.screen;
    const webgl = renderer.toLowerCase();
    let modelName = 'Apple iPhone 13'; // Popular baseline fallback
    let defaultStorage = '128 GB';

    if (screen) {
      const w = Math.min(screen.width, screen.height);
      const h = Math.max(screen.width, screen.height);
      const dpr = screen.devicePixelRatio || 2;

      // Match physical screen dimensions
      if (w === 430 && h === 932 && dpr === 3) {
        modelName = 'Apple iPhone 15 Pro Max';
        defaultStorage = '256 GB';
      } else if (w === 393 && h === 852 && dpr === 3) {
        // Dynamic Island standard screen (iPhone 15 / 16 / 15 Pro)
        modelName = webgl.includes('a17') ? 'Apple iPhone 15 Pro' : 'Apple iPhone 15';
        defaultStorage = '128 GB';
      } else if (w === 390 && h === 844 && dpr === 3) {
        // iPhone 12, iPhone 13, and iPhone 14 all share 390x844 @3x.
        if (webgl.includes('a14')) {
          modelName = 'Apple iPhone 12';
        } else if (webgl.includes('a15')) {
          if (webgl.includes('5-core') || webgl.includes('iphone14')) {
            modelName = 'Apple iPhone 14';
          } else {
            modelName = 'Apple iPhone 13';
          }
        } else {
          modelName = 'Apple iPhone 13';
        }
        defaultStorage = '128 GB';
      } else if (w === 428 && h === 926 && dpr === 3) {
        modelName = webgl.includes('a14') ? 'Apple iPhone 12 Pro Max' : 'Apple iPhone 14 Plus';
        defaultStorage = '128 GB';
      } else if (w === 375 && h === 812 && dpr === 3) {
        modelName = 'Apple iPhone 12 mini';
        defaultStorage = '64 GB';
      } else if (w === 414 && h === 896 && dpr === 2) {
        modelName = 'Apple iPhone 11';
        defaultStorage = '64 GB';
      } else if (w === 375 && h === 667 && dpr === 2) {
        modelName = 'Apple iPhone SE 2020';
        defaultStorage = '64 GB';
      }
    }

    const catalog = findMatchingCatalogDevice('Apple', modelName, input.preferredStorage || defaultStorage);
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
