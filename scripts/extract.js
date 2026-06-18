const fs = require('fs');

const contentPath = 'C:\\Users\\Mubeen_Taj\\.gemini\\antigravity\\brain\\5a9df40b-ca62-414b-83a3-eec1f9e4c622\\.system_generated\\steps\\5916\\content.md';
const html = fs.readFileSync(contentPath, 'utf8');

const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
if (match) {
  const data = JSON.parse(match[1]);
  fs.writeFileSync('cashify_refurbished.json', JSON.stringify(data, null, 2));
  console.log('Saved data to cashify_refurbished.json');
} else {
  console.log('__NEXT_DATA__ not found');
}
