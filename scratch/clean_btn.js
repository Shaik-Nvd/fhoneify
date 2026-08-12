const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'app', 'quote', 'page.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/,\s*background:\s*'var\(--gold\)'/g, '');
content = content.replace(/background:\s*'var\(--gold\)',\s*/g, '');
content = content.replace(/,\s*color:\s*'var\(--foreground\)'/g, '');
content = content.replace(/color:\s*'var\(--foreground\)',\s*/g, '');

fs.writeFileSync(file, content);
console.log('Fixed btn-primary styles in quote/page.tsx');
