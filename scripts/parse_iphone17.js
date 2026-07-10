const fs = require('fs');

const path = 'C:\\Users\\Mubeen_Taj\\.gemini\\antigravity\\brain\\aa027d71-8c2c-4234-b9c1-91b5121a267c\\.system_generated\\steps\\236\\content.md';
const html = fs.readFileSync(path, 'utf8');

const match = html.match(/"exactPrice":(\d+)/g);
console.log('exactPrice matches:', match);

const matchBase = html.match(/"basePrice":(\d+)/g);
console.log('basePrice matches:', matchBase);

const matchMax = html.match(/"maxPrice":(\d+)/g);
console.log('maxPrice matches:', matchMax);

const aiMatch = html.match(/Ai generated/gi);
console.log('Ai generated matches:', aiMatch);

const __NEXT_DATA__ = html.match(/<script id="__NEXT_DATA__".*?>(.*?)<\/script>/);
if (__NEXT_DATA__) {
    const data = JSON.parse(__NEXT_DATA__[1]);
    console.log(Object.keys(data.props.pageProps));
}
