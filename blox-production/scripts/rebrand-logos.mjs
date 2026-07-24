/**
 * Rebuild logo PNGs with true transparency + brand colors.
 * Source: packages/admin/public/BloxLogo.png (original baked asset before we overwrite).
 * We keep a backup once; if already overwritten, regenerate from current pixels.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PNG } from 'pngjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const adminPublic = path.join(root, 'packages/admin/public');
const backup = path.join(adminPublic, 'BloxLogo.source.png');
const current = path.join(adminPublic, 'BloxLogo.png');

// Restore from git if we have a backup of the pre-script original
if (!fs.existsSync(backup)) {
  // Prefer git show of original if available
  try {
    const { execSync } = await import('child_process');
    const buf = execSync('git show HEAD:blox-production/packages/admin/public/BloxLogo.png', {
      cwd: path.resolve(root, '..'),
      maxBuffer: 10 * 1024 * 1024,
    });
    fs.writeFileSync(backup, buf);
    console.log('Restored source logo from git → BloxLogo.source.png');
  } catch {
    fs.copyFileSync(current, backup);
    console.log('Using current BloxLogo.png as source backup');
  }
}

const DEEP = [0x16, 0x53, 0x5b];
const EMERALD = [0x00, 0xcf, 0xa2];
const WHITE = [0xff, 0xff, 0xff];
const LIME = [0xdb, 0xff, 0x00];

function readPng(file) {
  return PNG.sync.read(fs.readFileSync(file));
}

function luminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function sampleCornerBg(png) {
  const samples = [
    [0, 0],
    [png.width - 1, 0],
    [0, png.height - 1],
    [png.width - 1, png.height - 1],
    [2, 2],
    [png.width - 3, 2],
  ];
  let r = 0, g = 0, b = 0, n = 0;
  for (const [x, y] of samples) {
    const i = (png.width * y + x) << 2;
    r += png.data[i];
    g += png.data[i + 1];
    b += png.data[i + 2];
    n++;
  }
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
}

function dist(a, b) {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function isAccent(r, g, b) {
  // Mint/teal accent: green-dominant, not near-white, not near-black
  return g > 120 && b > 80 && r < 140 && g - r > 40 && luminance(r, g, b) > 60 && luminance(r, g, b) < 230;
}

function recolor(src, mode) {
  const bg = sampleCornerBg(src);
  const out = new PNG({ width: src.width, height: src.height, colorType: 6 });
  let transparent = 0;
  let accent = 0;
  let mark = 0;

  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const i = (src.width * y + x) << 2;
      const r = src.data[i];
      const g = src.data[i + 1];
      const b = src.data[i + 2];
      const a = src.data[i + 3];

      // Background → transparent (generous threshold for near-black bake)
      const nearBg = dist([r, g, b], bg) < 55 || (luminance(r, g, b) < 28 && a > 0);
      if (a < 10 || nearBg) {
        out.data[i] = 0;
        out.data[i + 1] = 0;
        out.data[i + 2] = 0;
        out.data[i + 3] = 0;
        transparent++;
        continue;
      }

      let nr, ng, nb;
      if (isAccent(r, g, b)) {
        [nr, ng, nb] = EMERALD;
        accent++;
      } else if (mode === 'light') {
        [nr, ng, nb] = WHITE;
        mark++;
      } else if (mode === 'lime') {
        [nr, ng, nb] = LIME;
        mark++;
      } else {
        [nr, ng, nb] = DEEP;
        mark++;
      }

      out.data[i] = nr;
      out.data[i + 1] = ng;
      out.data[i + 2] = nb;
      out.data[i + 3] = 255;
    }
  }

  console.log(`mode=${mode} bg=${bg} transparent=${transparent} accent=${accent} mark=${mark}`);
  return out;
}

function writeAll(targets, png) {
  const buf = PNG.sync.write(png, { colorType: 6 });
  for (const t of targets) {
    fs.mkdirSync(path.dirname(t), { recursive: true });
    fs.writeFileSync(t, buf);
    console.log('wrote', t);
  }
}

const src = readPng(backup);
const light = recolor(src, 'light'); // white + emerald — dark chrome
const dark = recolor(src, 'dark'); // deep green + emerald — light chrome
const lime = recolor(src, 'lime'); // lime + emerald

const flutterRoot = path.resolve(root, '../../blox-app');
// workspace may be blox-vercel/blox-production → blox-app is sibling of blox-vercel? 
// From earlier: C:\Users\TS\Downloads\blox-app and C:\Users\TS\Downloads\blox-vercel
const appRoot = path.resolve(root, '..', '..', 'blox-app');
const appRootAlt = path.resolve(root, '..', 'blox-app');
const flutter = fs.existsSync(path.join(appRoot, 'lib'))
  ? appRoot
  : fs.existsSync(path.join(appRootAlt, 'lib'))
    ? appRootAlt
    : path.resolve('C:/Users/TS/Downloads/blox-app');

writeAll(
  [
    path.join(adminPublic, 'BloxLogoNav.png'),
    path.join(root, 'packages/customer/public/BloxLogoNav.png'),
    path.join(root, 'packages/shared/public/BloxLogoNav.png'),
    path.join(root, 'packages/super-admin/public/BloxLogoNav.png'),
    path.join(flutter, 'lib/assets/BloxLogoNav.png'),
    path.join(flutter, 'assets/brand/BloxLogoNav.png'),
  ],
  light,
);

writeAll(
  [
    path.join(adminPublic, 'BloxLogo.png'),
    path.join(root, 'packages/customer/public/BloxLogo.png'),
  ],
  dark,
);

writeAll(
  [
    path.join(adminPublic, 'BloxLogoDark.png'),
    path.join(root, 'packages/customer/public/BloxLogoDark.png'),
  ],
  lime,
);

// Favicon SVG
const fav = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#16535B"/>
  <circle cx="22" cy="28" r="7" fill="#DBFF00"/>
  <circle cx="42" cy="28" r="7" fill="#DBFF00"/>
  <circle cx="32" cy="40" r="7" fill="#00CFA2"/>
</svg>`;
for (const p of [
  path.join(adminPublic, 'BloxMark.svg'),
  path.join(root, 'packages/customer/public/BloxMark.svg'),
  path.join(root, 'packages/super-admin/public/BloxMark.svg'),
]) {
  fs.writeFileSync(p, fav);
}

console.log('DONE');
