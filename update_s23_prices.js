const fs = require('fs');

const files = [
  'lib/seed_devices.ts',
  'server/seed_devices.ts',
  'samsung/samsung_prices.json'
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace 256GB
    content = content.replace(/"model": "Samsung Galaxy S23 Ultra 5G",\s*"storage": "12 GB\/256 GB",\s*"ram": "12 GB",\s*"color": "Default",\s*"basePrice": \d+/g, '"model": "Samsung Galaxy S23 Ultra 5G",\n    "storage": "12 GB/256 GB",\n    "ram": "12 GB",\n    "color": "Default",\n    "basePrice": 36210');
    
    // Replace 512GB
    content = content.replace(/"model": "Samsung Galaxy S23 Ultra 5G",\s*"storage": "12 GB\/512 GB",\s*"ram": "12 GB",\s*"color": "Default",\s*"basePrice": \d+/g, '"model": "Samsung Galaxy S23 Ultra 5G",\n    "storage": "12 GB/512 GB",\n    "ram": "12 GB",\n    "color": "Default",\n    "basePrice": 37430');
    
    // Replace 1TB
    content = content.replace(/"model": "Samsung Galaxy S23 Ultra 5G",\s*"storage": "12 GB\/1 TB",\s*"ram": "12 GB",\s*"color": "Default",\s*"basePrice": \d+/g, '"model": "Samsung Galaxy S23 Ultra 5G",\n    "storage": "12 GB/1 TB",\n    "ram": "12 GB",\n    "color": "Default",\n    "basePrice": 39900');
    
    // For samsung_prices.json which might not have the exact same formatting
    // Let's also do a generic replace just in case
    if (file.endsWith('.json')) {
      const data = JSON.parse(content);
      for (const model of data) {
        if (model.model === "Samsung Galaxy S23 Ultra 5G") {
          if (model.storage === "12 GB/256 GB") model.basePrice = 36210;
          if (model.storage === "12 GB/512 GB") model.basePrice = 37430;
          if (model.storage === "12 GB/1 TB") model.basePrice = 39900;
        }
      }
      content = JSON.stringify(data, null, 2);
    }
    
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
}
