import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BRANDS = ['Apple', 'Samsung', 'OnePlus', 'Xiaomi', 'Realme', 'Google', 'Vivo', 'Oppo', 'Motorola', 'Nothing'];

const MODELS = {
  Apple: [
    { name: 'iPhone (1st Gen)', basePrice: 2000 },
    { name: 'iPhone 3G', basePrice: 2500 },
    { name: 'iPhone 3GS', basePrice: 3000 },
    { name: 'iPhone 4', basePrice: 4000 },
    { name: 'iPhone 4S', basePrice: 4500 },
    { name: 'iPhone 5', basePrice: 5000 },
    { name: 'iPhone 5c', basePrice: 5500 },
    { name: 'iPhone 5s', basePrice: 6000 },
    { name: 'iPhone 6', basePrice: 7000 },
    { name: 'iPhone 6 Plus', basePrice: 8000 },
    { name: 'iPhone 6s', basePrice: 9000 },
    { name: 'iPhone 6s Plus', basePrice: 10000 },
    { name: 'iPhone SE (1st Gen)', basePrice: 8500 },
    { name: 'iPhone 7', basePrice: 12000 },
    { name: 'iPhone 7 Plus', basePrice: 14000 },
    { name: 'iPhone 8', basePrice: 16000 },
    { name: 'iPhone 8 Plus', basePrice: 18000 },
    { name: 'iPhone X', basePrice: 22000 },
    { name: 'iPhone XR', basePrice: 24000 },
    { name: 'iPhone XS', basePrice: 26000 },
    { name: 'iPhone XS Max', basePrice: 28000 },
    { name: 'iPhone 11', basePrice: 30000 },
    { name: 'iPhone 11 Pro', basePrice: 35000 },
    { name: 'iPhone 11 Pro Max', basePrice: 40000 },
    { name: 'iPhone SE (2nd Gen)', basePrice: 22000 },
    { name: 'iPhone 12 mini', basePrice: 35000 },
    { name: 'iPhone 12', basePrice: 42000 },
    { name: 'iPhone 12 Pro', basePrice: 55000 },
    { name: 'iPhone 12 Pro Max', basePrice: 65000 },
    { name: 'iPhone 13 mini', basePrice: 45000 },
    { name: 'iPhone 13', basePrice: 52000 },
    { name: 'iPhone 13 Pro', basePrice: 70000 },
    { name: 'iPhone 13 Pro Max', basePrice: 80000 },
    { name: 'iPhone SE (3rd Gen)', basePrice: 35000 },
    { name: 'iPhone 14', basePrice: 65000 },
    { name: 'iPhone 14 Plus', basePrice: 75000 },
    { name: 'iPhone 14 Pro', basePrice: 95000 },
    { name: 'iPhone 14 Pro Max', basePrice: 105000 },
    { name: 'iPhone 15', basePrice: 75000 },
    { name: 'iPhone 15 Plus', basePrice: 85000 },
    { name: 'iPhone 15 Pro', basePrice: 120000 },
    { name: 'iPhone 15 Pro Max', basePrice: 140000 },
    { name: 'iPhone 16', basePrice: 85000 },
    { name: 'iPhone 16 Plus', basePrice: 95000 },
    { name: 'iPhone 16 Pro', basePrice: 130000 },
    { name: 'iPhone 16 Pro Max', basePrice: 150000 },
    { name: 'iPhone 17', basePrice: 95000 },
    { name: 'iPhone 17 Plus', basePrice: 105000 },
    { name: 'iPhone 17 Pro', basePrice: 140000 },
    { name: 'iPhone 17 Pro Max', basePrice: 160000 },
    { name: 'iPhone 18', basePrice: 105000 },
    { name: 'iPhone 18 Plus', basePrice: 115000 },
    { name: 'iPhone 18 Pro', basePrice: 150000 },
    { name: 'iPhone 18 Pro Max', basePrice: 170000 }
  ],
  Samsung: [
    { name: 'Galaxy S24 Ultra', basePrice: 110000 },
    { name: 'Galaxy S24+', basePrice: 85000 },
    { name: 'Galaxy S24', basePrice: 65000 },
    { name: 'Galaxy Z Fold5', basePrice: 120000 },
    { name: 'Galaxy Z Flip5', basePrice: 70000 },
    { name: 'Galaxy S23 Ultra', basePrice: 85000 },
    { name: 'Galaxy S23+', basePrice: 60000 },
    { name: 'Galaxy S23', basePrice: 48000 },
    { name: 'Galaxy A54', basePrice: 28000 },
    { name: 'Galaxy A34', basePrice: 22000 },
    { name: 'Galaxy M54', basePrice: 25000 },
    { name: 'Galaxy S21 FE', basePrice: 24000 }
  ],
  OnePlus: [
    { name: 'OnePlus 12', basePrice: 60000 },
    { name: 'OnePlus 12R', basePrice: 38000 },
    { name: 'OnePlus Open', basePrice: 110000 },
    { name: 'OnePlus 11', basePrice: 45000 },
    { name: 'OnePlus 11R', basePrice: 30000 },
    { name: 'OnePlus Nord 3', basePrice: 25000 },
    { name: 'OnePlus Nord CE 3 Lite', basePrice: 15000 }
  ],
  Google: [
    { name: 'Pixel 8 Pro', basePrice: 85000 },
    { name: 'Pixel 8', basePrice: 60000 },
    { name: 'Pixel 7 Pro', basePrice: 55000 },
    { name: 'Pixel 7', basePrice: 40000 },
    { name: 'Pixel 7a', basePrice: 32000 },
    { name: 'Pixel 6a', basePrice: 20000 }
  ],
  Xiaomi: [
    { name: 'Xiaomi 14 Ultra', basePrice: 90000 },
    { name: 'Xiaomi 14', basePrice: 60000 },
    { name: 'Xiaomi 13 Pro', basePrice: 55000 },
    { name: 'Redmi Note 13 Pro+', basePrice: 28000 },
    { name: 'Redmi Note 13 Pro', basePrice: 22000 },
    { name: 'Redmi Note 12 Pro+', basePrice: 20000 },
    { name: 'Redmi Note 12', basePrice: 12000 },
    { name: 'Poco X6 Pro', basePrice: 24000 },
    { name: 'Poco F5', basePrice: 26000 }
  ],
  Realme: [
    { name: 'Realme 12 Pro+', basePrice: 28000 },
    { name: 'Realme 12 Pro', basePrice: 23000 },
    { name: 'Realme GT 3', basePrice: 35000 },
    { name: 'Realme 11 Pro+', basePrice: 22000 },
    { name: 'Realme Narzo 60', basePrice: 15000 }
  ],
  Vivo: [
    { name: 'Vivo X100 Pro', basePrice: 80000 },
    { name: 'Vivo X100', basePrice: 58000 },
    { name: 'Vivo V30 Pro', basePrice: 38000 },
    { name: 'Vivo V29 Pro', basePrice: 32000 },
    { name: 'Vivo T2 Pro', basePrice: 21000 }
  ],
  Oppo: [
    { name: 'Oppo Find N3 Flip', basePrice: 75000 },
    { name: 'Oppo Reno 11 Pro', basePrice: 35000 },
    { name: 'Oppo Reno 10 Pro+', basePrice: 45000 },
    { name: 'Oppo F25 Pro', basePrice: 22000 }
  ],
  Motorola: [
    { name: 'Edge 50 Pro', basePrice: 30000 },
    { name: 'Edge 40 Neo', basePrice: 21000 },
    { name: 'Razr 40 Ultra', basePrice: 65000 },
    { name: 'Moto G84', basePrice: 16000 }
  ],
  Nothing: [
    { name: 'Nothing Phone (2)', basePrice: 38000 },
    { name: 'Nothing Phone (2a)', basePrice: 22000 },
    { name: 'Nothing Phone (1)', basePrice: 20000 }
  ]
};

const STORAGES = ['64GB', '128GB', '256GB', '512GB', '1TB'];
const RAMS = ['4GB', '6GB', '8GB', '12GB', '16GB'];
const COLORS = ['Black', 'White', 'Blue', 'Green', 'Titanium', 'Silver', 'Gold', 'Purple', 'Red'];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const devices = [];
let idCounter = 1;

for (let i = 0; i < 500; i++) {
  const brand = getRandomItem(BRANDS);
  const modelObj = getRandomItem(MODELS[brand]);
  const storageIndex = Math.floor(Math.random() * 4) + 1; // 128GB to 1TB mostly
  const storage = STORAGES[storageIndex];
  
  let ramIndex = Math.max(1, storageIndex - 1); // rough correlation between storage and ram
  if (brand === 'Apple') ramIndex = Math.max(0, storageIndex - 2); // Apples have less RAM nominally
  const ram = RAMS[Math.min(ramIndex + Math.floor(Math.random() * 2), RAMS.length - 1)];
  
  const color = getRandomItem(COLORS);
  
  devices.push({
    id: `d${idCounter++}`,
    brand: brand,
    model: modelObj.name,
    storage: storage,
    ram: ram,
    color: color,
    basePrice: Math.floor(modelObj.basePrice * (1 + (storageIndex * 0.15))) // simple price scaling based on storage
  });
}

// Generate the TypeScript file contents
const fileContent = `export interface Device {
  id: string;
  brand: string;
  model: string;
  storage: string;
  ram: string;
  color: string;
  basePrice?: number;
}

export const SEED_DEVICES: Device[] = ${JSON.stringify(devices, null, 2)};
`;

const outputPath = path.join(__dirname, '..', 'server', 'seed_devices.ts');
fs.writeFileSync(outputPath, fileContent);
console.log(`Successfully generated 500 devices in ${outputPath}`);
