const fs = require('fs');

const fileContent = fs.readFileSync('lib/seed_devices.ts', 'utf-8');

// Replace multiple consecutive commas with a single comma
let fixedContent = fileContent.replace(/,[\s\r\n]*,/g, ',');
// Replace trailing commas before array end
fixedContent = fixedContent.replace(/,[\s\r\n]*]/g, '\n]');
// Replace leading commas after array start
fixedContent = fixedContent.replace(/\[[\s\r\n]*,/g, '[\n');

fs.writeFileSync('lib/seed_devices.ts', fixedContent);
console.log('Fixed syntax errors in seed_devices.ts');
