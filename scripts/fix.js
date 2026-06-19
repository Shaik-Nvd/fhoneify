const fs = require('fs');
let content = fs.readFileSync('server/seed_devices.ts', 'utf8');

// Replace string literal "\n" with actual newline
content = content.replace(/\\n/g, '\n');

// Fix the trailing commas at the start
content = content.replace(/,\n\n,\n{/g, ',\n{');

fs.writeFileSync('server/seed_devices.ts', content);
console.log('Fixed syntax errors.');
