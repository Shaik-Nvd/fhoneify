import fs from 'fs';
let c = fs.readFileSync('lib/seed_devices.ts', 'utf8');
let updated = false;
c = c.replace(
  /(\"model\": \"Samsung Galaxy On8\",[\s\n]*\"storage\": \"6 GB\/128 GB\",[\s\n]*\"color\": \"Midnight\",[\s\n]*\"basePrice\": )\d+/g,
  (match, p1) => { updated = true; return p1 + '5400'; }
);
if (updated) {
  fs.writeFileSync('lib/seed_devices.ts', c);
  fs.writeFileSync('server/seed_devices.ts', c);
  console.log('Updated On8 6 GB/128 GB to 5400');
} else {
  console.log('Could not find On8 6 GB/128 GB to update.');
}
