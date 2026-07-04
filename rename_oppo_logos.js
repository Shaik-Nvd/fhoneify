const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, 'public', 'images', 'models');

const files = fs.readdirSync(modelsDir);

let count = 0;
for (const file of files) {
  if (!file.toLowerCase().includes('oppo')) continue;

  const ext = path.extname(file);
  const base = path.basename(file, ext);

  // The UI does: selectedModel.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.png'
  const newBase = base.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const newName = newBase + '.png';

  const oldPath = path.join(modelsDir, file);
  const newPath = path.join(modelsDir, newName);

  if (oldPath !== newPath) {
    fs.renameSync(oldPath, newPath);
    count++;
  }
}

console.log(`Renamed ${count} OPPO logos to standard format.`);
