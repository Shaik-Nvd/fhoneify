const fs = require('fs');

const file = 'c:/Users/Mubeen_Taj/Downloads/Fhone/server/seed_devices.ts';
let content = fs.readFileSync(file, 'utf8');

const rawData = [
  { model: 'Apple iPhone 6', storage: '16GB', price: 1670 },
  { model: 'Apple iPhone 6', storage: '32GB', price: 1890 },
  { model: 'Apple iPhone 6', storage: '64GB', price: 2120 },
  { model: 'Apple iPhone 6', storage: '128GB', price: 2320 },

  { model: 'Apple iPhone 7', storage: '32GB', price: 4430 },
  { model: 'Apple iPhone 7', storage: '128GB', price: 4660 },
  { model: 'Apple iPhone 7', storage: '256GB', price: 4770 },
  { model: 'Apple iPhone 7 Plus', storage: '32GB', price: 5190 },
  { model: 'Apple iPhone 7 Plus', storage: '128GB', price: 5590 },
  { model: 'Apple iPhone 7 Plus', storage: '256GB', price: 6100 },

  { model: 'Apple iPhone 8', storage: '64GB', price: 5870 },
  { model: 'Apple iPhone 8', storage: '128GB', price: 6210 },
  { model: 'Apple iPhone 8', storage: '256GB', price: 6480 },
  { model: 'Apple iPhone 8 Plus', storage: '64GB', price: 7120 },
  { model: 'Apple iPhone 8 Plus', storage: '128GB', price: 7230 },
  { model: 'Apple iPhone 8 Plus', storage: '256GB', price: 7750 },

  { model: 'Apple iPhone SE (1st Gen)', storage: '32GB', price: 2050 },
  { model: 'Apple iPhone SE (1st Gen)', storage: '64GB', price: 2200 },
  { model: 'Apple iPhone SE (1st Gen)', storage: '128GB', price: 2270 },

  { model: 'Apple iPhone SE (2022 / 3rd Gen)', storage: '64GB', price: 11690 },
  { model: 'Apple iPhone SE (2022 / 3rd Gen)', storage: '128GB', price: 12250 },
  { model: 'Apple iPhone SE (2022 / 3rd Gen)', storage: '256GB', price: 12810 },

  { model: 'Apple iPhone X', storage: '64GB', price: 9670 },
  { model: 'Apple iPhone X', storage: '256GB', price: 10240 },

  { model: 'Apple iPhone XR', storage: '64GB', price: 9850 },
  { model: 'Apple iPhone XR', storage: '128GB', price: 10710 },
  { model: 'Apple iPhone XR', storage: '256GB', price: 11160 },

  { model: 'Apple iPhone XS', storage: '64GB', price: 10640 },
  { model: 'Apple iPhone XS', storage: '256GB', price: 12100 },
  { model: 'Apple iPhone XS', storage: '512GB', price: 12230 },

  { model: 'Apple iPhone XS Max', storage: '64GB', price: 12240 },
  { model: 'Apple iPhone XS Max', storage: '256GB', price: 13050 },
  { model: 'Apple iPhone XS Max', storage: '512GB', price: 13530 },

  { model: 'Apple iPhone 11', storage: '64GB', price: 13220 },
  { model: 'Apple iPhone 11', storage: '128GB', price: 14020 },
  { model: 'Apple iPhone 11', storage: '256GB', price: 14680 },

  { model: 'Apple iPhone 11 Pro', storage: '64GB', price: 15840 },
  { model: 'Apple iPhone 11 Pro', storage: '256GB', price: 17580 },
  { model: 'Apple iPhone 11 Pro', storage: '512GB', price: 18310 },

  { model: 'Apple iPhone 11 Pro Max', storage: '64GB', price: 17120 },
  { model: 'Apple iPhone 11 Pro Max', storage: '256GB', price: 19220 },
  { model: 'Apple iPhone 11 Pro Max', storage: '512GB', price: 19950 },

  { model: 'Apple iPhone 12 Mini', storage: '64GB', price: 13860 },
  { model: 'Apple iPhone 12 Mini', storage: '128GB', price: 15810 },
  { model: 'Apple iPhone 12 Mini', storage: '256GB', price: 16490 },

  { model: 'Apple iPhone 12', storage: '64GB', price: 16850 },
  { model: 'Apple iPhone 12', storage: '128GB', price: 17580 },
  { model: 'Apple iPhone 12', storage: '256GB', price: 19320 },

  { model: 'Apple iPhone 12 Pro', storage: '128GB', price: 23450 },
  { model: 'Apple iPhone 12 Pro', storage: '256GB', price: 25110 },
  { model: 'Apple iPhone 12 Pro', storage: '512GB', price: 26400 },

  { model: 'Apple iPhone 12 Pro Max', storage: '128GB', price: 25600 },
  { model: 'Apple iPhone 12 Pro Max', storage: '256GB', price: 26650 },
  { model: 'Apple iPhone 12 Pro Max', storage: '512GB', price: 27620 },

  { model: 'Apple iPhone 13 Mini', storage: '128GB', price: 21710 },
  { model: 'Apple iPhone 13 Mini', storage: '256GB', price: 22080 },
  { model: 'Apple iPhone 13 Mini', storage: '512GB', price: 22270 },

  { model: 'Apple iPhone 13', storage: '128GB', price: 23950 },
  { model: 'Apple iPhone 13', storage: '256GB', price: 25490 },
  { model: 'Apple iPhone 13', storage: '512GB', price: 25980 },

  { model: 'Apple iPhone 13 Pro', storage: '128GB', price: 33100 },
  { model: 'Apple iPhone 13 Pro', storage: '256GB', price: 34880 },
  { model: 'Apple iPhone 13 Pro', storage: '512GB', price: 36020 },

  { model: 'Apple iPhone 13 Pro Max', storage: '128GB', price: 35890 },
  { model: 'Apple iPhone 13 Pro Max', storage: '256GB', price: 37670 },
  { model: 'Apple iPhone 13 Pro Max', storage: '512GB', price: 38610 },

  { model: 'Apple iPhone 14', storage: '128GB', price: 26730 },
  { model: 'Apple iPhone 14', storage: '256GB', price: 28590 },
  { model: 'Apple iPhone 14', storage: '512GB', price: 28750 },

  { model: 'Apple iPhone 14 Plus', storage: '128GB', price: 29120 },
  { model: 'Apple iPhone 14 Plus', storage: '256GB', price: 30290 },
  { model: 'Apple iPhone 14 Plus', storage: '512GB', price: 31270 },

  { model: 'Apple iPhone 14 Pro', storage: '128GB', price: 41150 },
  { model: 'Apple iPhone 14 Pro', storage: '256GB', price: 43580 },
  { model: 'Apple iPhone 14 Pro', storage: '512GB', price: 45690 },

  { model: 'Apple iPhone 14 Pro Max', storage: '128GB', price: 43780 },
  { model: 'Apple iPhone 14 Pro Max', storage: '256GB', price: 46290 },
  { model: 'Apple iPhone 14 Pro Max', storage: '512GB', price: 47020 },

  { model: 'Apple iPhone 15', storage: '128GB', price: 38040 },
  { model: 'Apple iPhone 15', storage: '256GB', price: 43600 },
  { model: 'Apple iPhone 15', storage: '512GB', price: 45570 },

  { model: 'Apple iPhone 15 Plus', storage: '128GB', price: 44730 },
  { model: 'Apple iPhone 15 Plus', storage: '256GB', price: 48480 },
  { model: 'Apple iPhone 15 Plus', storage: '512GB', price: 49250 },

  { model: 'Apple iPhone 15 Pro', storage: '128GB', price: 62600 },
  { model: 'Apple iPhone 15 Pro', storage: '256GB', price: 66790 },
  { model: 'Apple iPhone 15 Pro', storage: '512GB', price: 69030 },

  { model: 'Apple iPhone 15 Pro Max', storage: '256GB', price: 73610 },
  { model: 'Apple iPhone 15 Pro Max', storage: '512GB', price: 75950 },

  { model: 'Apple iPhone 16e', storage: '128GB', price: 36270 },
  { model: 'Apple iPhone 16e', storage: '256GB', price: 39000 },
  { model: 'Apple iPhone 16e', storage: '512GB', price: 41600 },

  { model: 'Apple iPhone 16', storage: '128GB', price: 46550 },
  { model: 'Apple iPhone 16', storage: '256GB', price: 50960 },
  { model: 'Apple iPhone 16', storage: '512GB', price: 52470 },

  { model: 'Apple iPhone 16 Plus', storage: '128GB', price: 52820 },
  { model: 'Apple iPhone 16 Plus', storage: '256GB', price: 53020 },
  { model: 'Apple iPhone 16 Plus', storage: '512GB', price: 55040 },

  { model: 'Apple iPhone 16 Pro', storage: '128GB', price: 71900 },
  { model: 'Apple iPhone 16 Pro', storage: '256GB', price: 77000 },
  { model: 'Apple iPhone 16 Pro', storage: '512GB', price: 79000 },

  { model: 'Apple iPhone 16 Pro Max', storage: '256GB', price: 87300 },
  { model: 'Apple iPhone 16 Pro Max', storage: '512GB', price: 90300 },
  { model: 'Apple iPhone 16 Pro Max', storage: '1TB', price: 93500 },

  { model: 'Apple iPhone 17e', storage: '256GB', price: 45200 },
  { model: 'Apple iPhone 17e', storage: '512GB', price: 53200 },

  { model: 'Apple iPhone 17', storage: '256GB', price: 56500 },
  { model: 'Apple iPhone 17', storage: '512GB', price: 65000 },

  { model: 'Apple iPhone 17 Pro', storage: '256GB', price: 102000 },
  { model: 'Apple iPhone 17 Pro', storage: '512GB', price: 106500 },

  { model: 'Apple iPhone 17 Pro Max', storage: '256GB', price: 107500 },
  { model: 'Apple iPhone 17 Pro Max', storage: '512GB', price: 114500 },
];

let updatedCount = 0;

rawData.forEach(u => {
  // Be safe with regex special characters (escape parens)
  const escapedModel = u.model.replace(/[()]/g, '\\$&');
  const regex = new RegExp(`{\\s*["']id["']:\\s*['"][^'"]+['"],\\s*["']brand["']:\\s*['"]Apple['"],\\s*["']model["']:\\s*['"]${escapedModel}['"],\\s*["']storage["']:\\s*['"]${u.storage}['"],\\s*["']ram["']:\\s*['"][^'"]+['"],\\s*["']color["']:\\s*['"][^'"]+['"],\\s*["']basePrice["']:\\s*(\\d+)\\s*}`, 'g');
  
  content = content.replace(regex, (match, currentPrice) => {
    if (parseInt(currentPrice, 10) !== u.price) {
      updatedCount++;
      console.log(`Updated ${u.model} ${u.storage} from ${currentPrice} to ${u.price}`);
      return match.replace(/"basePrice":\s*\d+/, `"basePrice": ${u.price}`);
    }
    return match;
  });
});

fs.writeFileSync(file, content, 'utf8');
console.log(`Finished. Updated ${updatedCount} entries.`);
