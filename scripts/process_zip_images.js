const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '..', 'temp_icons4');
const targetDir = path.join(__dirname, '..', 'public', 'images', 'models');

if (!fs.existsSync(sourceDir)) {
    console.error("Source dir not found:", sourceDir);
    process.exit(1);
}

const files = fs.readdirSync(sourceDir);

// Read the generic placeholder size to know which ones to overwrite
const placeholderSize = 520356; 

let count = 0;
files.forEach(file => {
    if (file.startsWith('.') || (!file.toLowerCase().endsWith('.png') && !file.toLowerCase().endsWith('.jpg') && !file.toLowerCase().endsWith('.jpeg'))) {
        return;
    }
    
    const ext = path.extname(file);
    const basename = path.basename(file, ext);
    
    // Slugify the basename
    const slugified = basename.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const newFileName = slugified + '.png'; 
    const destPath = path.join(targetDir, newFileName);
    
    // Check if we should skip
    // Skip if it exists AND it's NOT the placeholder size (meaning it's a real image we already have)
    if (fs.existsSync(destPath)) {
        const stats = fs.statSync(destPath);
        if (stats.size !== placeholderSize) {
            // It's a real custom image from a previous upload, skip it
            return;
        }
    }
    
    fs.copyFileSync(path.join(sourceDir, file), destPath);
    count++;
});

console.log(`Successfully mapped and copied ${count} NEW missing images from temp_icons4.`);
