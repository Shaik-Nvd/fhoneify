const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'oneplus_logos');
const destDir = path.join(__dirname, 'public', 'images', 'models');

if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

const files = fs.readdirSync(srcDir);
let count = 0;
files.forEach(file => {
    if (file.endsWith('.jpg') || file.endsWith('.png')) {
        const nameWithoutExt = file.replace(/\.[^/.]+$/, "");
        const newName = nameWithoutExt.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.png';
        
        const srcPath = path.join(srcDir, file);
        const destPath = path.join(destDir, newName);
        
        fs.copyFileSync(srcPath, destPath);
        console.log(`Copied ${file} to ${newName}`);
        count++;
    }
});
console.log(`Successfully copied ${count} logos.`);
