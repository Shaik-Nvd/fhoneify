const fs = require('fs');
const path = require('path');

const content = fs.readFileSync('server/seed_devices.ts', 'utf8');
const regex = /"brand":\s*"Samsung",\s*"model":\s*"([^"]+)"/g;

const models = new Set();
let match;
while ((match = regex.exec(content)) !== null) {
  models.add(match[1]);
}

const sourceImage = 'C:\\Users\\Mubeen_Taj\\.gemini\\antigravity\\brain\\9f412a25-b9e6-4fdf-aa64-9904e1180a1f\\samsung_placeholder_1781813097681.png';
const targetDir = 'public/images/models';

let count = 0;
Array.from(models).forEach(m => {
  const filename = m.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.png';
  const targetPath = path.join(targetDir, filename);
  fs.copyFileSync(sourceImage, targetPath);
  count++;
});

console.log(`Copied placeholder image to ${count} Samsung model files.`);
