/**
 * Convert customer public/vehicles PNGs → WebP, archive originals out of deploy.
 * Syncs WebP catalog into admin/public/vehicles for dealer/credit publicDir.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const customerVehicles = path.join(root, 'packages/customer/public/vehicles');
const adminVehicles = path.join(root, 'packages/admin/public/vehicles');
const archiveDir = path.join(root, 'scripts/catalog-png-archive');

const MAX_WIDTH = 1200;
const QUALITY = 78;

if (!fs.existsSync(customerVehicles)) {
  console.error('Missing source:', customerVehicles);
  process.exit(1);
}

fs.mkdirSync(archiveDir, { recursive: true });
fs.mkdirSync(adminVehicles, { recursive: true });

const pngs = fs.readdirSync(customerVehicles).filter((f) => f.toLowerCase().endsWith('.png'));
let before = 0;
let after = 0;

for (const file of pngs) {
  const src = path.join(customerVehicles, file);
  const base = file.replace(/\.png$/i, '');
  const dest = path.join(customerVehicles, `${base}.webp`);
  const adminDest = path.join(adminVehicles, `${base}.webp`);
  const archive = path.join(archiveDir, file);

  const srcStat = fs.statSync(src);
  before += srcStat.size;

  await sharp(src)
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY, effort: 4 })
    .toFile(dest);

  const webpStat = fs.statSync(dest);
  after += webpStat.size;
  fs.copyFileSync(dest, adminDest);

  if (!fs.existsSync(archive)) {
    fs.renameSync(src, archive);
  } else {
    fs.unlinkSync(src);
  }

  console.log(
    `${file} → ${base}.webp (${Math.round(srcStat.size / 1024)}KB → ${Math.round(webpStat.size / 1024)}KB)`
  );
}

console.log(
  `\nDone. Catalog: ${(before / 1024 / 1024).toFixed(2)} MB PNG → ${(after / 1024 / 1024).toFixed(2)} MB WebP`
);
