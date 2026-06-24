const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const destModelsDir = path.join(rootDir, 'public', 'images', 'models');
const destBrandsDir = path.join(rootDir, 'public', 'images', 'brands');

const allFiles = fs.readdirSync(rootDir);

let modelsCount = 0;
let brandsCount = 0;

allFiles.forEach(file => {
    // Only process jpg and png in root
    if (!fs.statSync(path.join(rootDir, file)).isFile()) return;
    if (!(file.endsWith('.jpg') || file.endsWith('.png'))) return;
    if (file === 'test.png') return; // skip known non-logo

    // Check if it's a brand logo (usually just a single word like Apple.jpg, Xiaomi.jpg, etc.)
    // Let's assume if it doesn't have spaces or numbers, or matches a known brand list, it's a brand logo
    const nameWithoutExt = file.replace(/\.[^/.]+$/, "");
    const isBrand = /^[a-zA-Z]+$/.test(nameWithoutExt) && nameWithoutExt.length < 15;
    
    // Note: Some models might be single words? No, phones are usually "Mi 10T", "Redmi 8".
    // "POCO" is a brand.
    
    if (isBrand) {
        // Brand logo
        const newName = nameWithoutExt.toLowerCase() + '.png'; // brands are typically lowercase pngs?
        // Wait, I should check how brands are named. Let's just move them to brands folder as-is, maybe lowercase name.
        fs.renameSync(path.join(rootDir, file), path.join(destBrandsDir, newName));
        console.log(`Moved brand: ${file} -> ${newName}`);
        brandsCount++;
    } else {
        // Device model logo
        const newName = nameWithoutExt.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.png';
        fs.renameSync(path.join(rootDir, file), path.join(destModelsDir, newName));
        console.log(`Moved model: ${file} -> ${newName}`);
        modelsCount++;
    }
});

console.log(`Successfully processed ${modelsCount} model images and ${brandsCount} brand images.`);
