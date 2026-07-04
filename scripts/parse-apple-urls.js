const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '../server/data/apple_prices.json');
const outputFile = path.join(__dirname, '../server/data/apple_urls.json');

const text = fs.readFileSync(inputFile, 'utf-8');
const lines = text.split('\n');

const urlMap = {};
let currentModel = null;

for (const line of lines) {
  if (line.includes('Sell Old ')) {
    // Extract the model name after "Sell Old "
    // Note: there are weird characters in the line, so we match "Sell Old " and take everything after
    const match = line.match(/Sell Old (.*?)\s*$/);
    if (match && !line.includes('(')) { // Ignore the variant lines that have (3 GB/64 GB)
      currentModel = match[1].trim();
    }
  } else if (line.startsWith('link : ') && currentModel) {
    const url = line.replace('link : ', '').trim();
    // Normalize key to lower case for easy lookup
    const key = currentModel.toLowerCase().trim();
    urlMap[key] = url;
    currentModel = null; // reset
  }
}

fs.writeFileSync(outputFile, JSON.stringify(urlMap, null, 2));
console.log(`Generated ${outputFile} with ${Object.keys(urlMap).length} models.`);
