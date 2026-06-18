const fs = require('fs');
const contentPath = 'C:\\Users\\Mubeen_Taj\\.gemini\\antigravity\\brain\\5a9df40b-ca62-414b-83a3-eec1f9e4c622\\.system_generated\\steps\\5916\\content.md';
const html = fs.readFileSync(contentPath, 'utf8');

const regex = /alt="([^"]+?)(?: - Refurbished)?"[^>]*>.*?₹(?:<!\-\-\s*\-\->)?([0-9,]+)/g;
const matches = [...html.matchAll(regex)];

const phones = [];
for (const match of matches) {
    const title = match[1].trim();
    // Exclude basic UI icons like "Apple iPhone 12" which might not be actual listings if they don't have prices or are in menus
    const price = parseInt(match[2].replace(/,/g, ''), 10);
    if (price > 1000) {
        phones.push({ title, price });
    }
}

// Deduplicate
const unique = [];
const seen = new Set();
for (const p of phones) {
    if (!seen.has(p.title)) {
        seen.add(p.title);
        unique.push(p);
    }
}

console.log(JSON.stringify(unique, null, 2));
console.log('Total found:', unique.length);
