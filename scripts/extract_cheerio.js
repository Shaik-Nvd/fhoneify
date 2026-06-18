const fs = require('fs');
const cheerio = require('cheerio');

const contentPath = 'C:\\Users\\Mubeen_Taj\\.gemini\\antigravity\\brain\\5a9df40b-ca62-414b-83a3-eec1f9e4c622\\.system_generated\\steps\\5916\\content.md';
const html = fs.readFileSync(contentPath, 'utf8');
const $ = cheerio.load(html);

const phones = [];

// Try to find products by common classes or links
$('a[href*="/buy-refurbished-mobile-phones/"]').each((i, el) => {
  const text = $(el).text();
  const titleMatch = text.match(/(Apple iPhone|Samsung Galaxy|OnePlus|Xiaomi|Redmi|Poco|Vivo|Oppo|Realme|Motorola)[\sA-Za-z0-9]+/i);
  if (titleMatch) {
     const title = titleMatch[0].trim();
     let price = 0;
     const priceTextMatch = text.match(/₹[\s]*([\d,]+)/);
     if (priceTextMatch) {
       price = parseInt(priceTextMatch[1].replace(/,/g, ''), 10);
     }
     
     if (title && price) {
        phones.push({ title, price, rawText: text.substring(0, 50) });
     }
  }
});

console.log(JSON.stringify(phones.slice(0, 10), null, 2));
console.log('Total found:', phones.length);
