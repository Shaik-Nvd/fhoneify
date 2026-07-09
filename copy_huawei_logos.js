const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'huawei');
const destDir = path.join(__dirname, 'public', 'images', 'models');

if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

const files = fs.readdirSync(srcDir);

for (const file of files) {
    if (file.endsWith('.jpg') || file.endsWith('.png') || file.endsWith('.jpeg')) {
        let base = file.replace(/\.(jpg|jpeg|png)$/i, '');
        // Replace spaces and underscores with hyphens
        let newName = base.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.png';
        
        fs.copyFileSync(path.join(srcDir, file), path.join(destDir, newName));
        console.log(`Copied ${file} -> ${newName}`);
    }
}
