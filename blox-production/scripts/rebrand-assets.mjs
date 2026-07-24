/**
 * Rebuild logo PNGs for Blox_Branding.pdf v1.0 teal stack
 * and purge old lime rgba(218,255,1) from package sources.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PNG } from 'pngjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const DEEP = { r: 0x16, g: 0x53, b: 0x5b }; // #16535B
const EMERALD = { r: 0x00, g: 0xcf, b: 0xa2 }; // #00CFA2
const WHITE = { r: 0xff, g: 0xff, b: 0xff };
const LIME = { r: 0xdb, g: 0xff, b: 0x00 }; // #DBFF00

function readPng(file) {
  return PNG.sync.read(fs.readFileSync(file));
}

function writePng(file, png) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, PNG.sync.write(png));
}

function clonePng(src) {
  const out = new PNG({ width: src.width, height: src.height });
  src.data.copy(out.data);
  return out;
}

function isNearBlack(r, g, b, a) {
  return a < 20 || (r < 40 && g < 40 && b < 40);
}

function isTealAccent(r, g, b) {
  // Emerald / mint accent in existing logos (not white, not black)
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return g > 140 && b > 100 && r < 120 && max - min > 40;
}

function isLightMark(r, g, b, a) {
  return a > 20 && r > 180 && g > 180 && b > 180;
}

/** White + emerald on transparent — for deep-green / dark chrome */
function makeLightOnTransparent(src) {
  const out = clonePng(src);
  for (let i = 0; i < out.data.length; i += 4) {
    const r = out.data[i];
    const g = out.data[i + 1];
    const b = out.data[i + 2];
    const a = out.data[i + 3];
    if (isNearBlack(r, g, b, a)) {
      out.data[i + 3] = 0;
      continue;
    }
    if (isTealAccent(r, g, b)) {
      out.data[i] = EMERALD.r;
      out.data[i + 1] = EMERALD.g;
      out.data[i + 2] = EMERALD.b;
      out.data[i + 3] = 255;
      continue;
    }
    if (isLightMark(r, g, b, a) || a > 20) {
      out.data[i] = WHITE.r;
      out.data[i + 1] = WHITE.g;
      out.data[i + 2] = WHITE.b;
      out.data[i + 3] = Math.max(a, 255);
    }
  }
  return out;
}

/** Deep green + emerald on transparent — for white / light surfaces */
function makeDarkOnTransparent(src) {
  const out = clonePng(src);
  for (let i = 0; i < out.data.length; i += 4) {
    const r = out.data[i];
    const g = out.data[i + 1];
    const b = out.data[i + 2];
    const a = out.data[i + 3];
    if (isNearBlack(r, g, b, a)) {
      out.data[i + 3] = 0;
      continue;
    }
    if (isTealAccent(r, g, b)) {
      out.data[i] = EMERALD.r;
      out.data[i + 1] = EMERALD.g;
      out.data[i + 2] = EMERALD.b;
      out.data[i + 3] = 255;
      continue;
    }
    if (a > 20) {
      out.data[i] = DEEP.r;
      out.data[i + 1] = DEEP.g;
      out.data[i + 2] = DEEP.b;
      out.data[i + 3] = 255;
    }
  }
  return out;
}

/** Lime + deep-green accent on transparent — optional CTA mark */
function makeLimeOnTransparent(src) {
  const out = clonePng(src);
  for (let i = 0; i < out.data.length; i += 4) {
    const r = out.data[i];
    const g = out.data[i + 1];
    const b = out.data[i + 2];
    const a = out.data[i + 3];
    if (isNearBlack(r, g, b, a)) {
      out.data[i + 3] = 0;
      continue;
    }
    if (isTealAccent(r, g, b)) {
      out.data[i] = EMERALD.r;
      out.data[i + 1] = EMERALD.g;
      out.data[i + 2] = EMERALD.b;
      out.data[i + 3] = 255;
      continue;
    }
    if (a > 20) {
      out.data[i] = LIME.r;
      out.data[i + 1] = LIME.g;
      out.data[i + 2] = LIME.b;
      out.data[i + 3] = 255;
    }
  }
  return out;
}

function copyTo(targets, buffer) {
  for (const t of targets) {
    fs.mkdirSync(path.dirname(t), { recursive: true });
    fs.writeFileSync(t, buffer);
    console.log('wrote', path.relative(root, t));
  }
}

// Prefer the fuller wordmark asset
const sourcePath = path.join(root, 'packages/admin/public/BloxLogo.png');
const src = readPng(sourcePath);

const light = makeLightOnTransparent(src); // white + emerald
const dark = makeDarkOnTransparent(src); // deep green + emerald
const lime = makeLimeOnTransparent(src);

const lightBuf = PNG.sync.write(light);
const darkBuf = PNG.sync.write(dark);
const limeBuf = PNG.sync.write(lime);

// Nav / dark chrome → light mark
copyTo(
  [
    'packages/admin/public/BloxLogoNav.png',
    'packages/customer/public/BloxLogoNav.png',
    'packages/shared/public/BloxLogoNav.png',
    'packages/super-admin/public/BloxLogoNav.png',
    path.resolve(root, '../blox-app/lib/assets/BloxLogoNav.png'),
    path.resolve(root, '../blox-app/assets/brand/BloxLogoNav.png'),
  ].map((p) => (path.isAbsolute(p) ? p : path.join(root, p))),
  lightBuf,
);

// Primary mark for light UI / favicon base → dark mark
copyTo(
  [
    'packages/admin/public/BloxLogo.png',
    'packages/customer/public/BloxLogo.png',
  ].map((p) => path.join(root, p)),
  darkBuf,
);

// Dark-named asset → lime+emerald for accents / dark tiles if needed
copyTo(
  [
    'packages/admin/public/BloxLogoDark.png',
    'packages/customer/public/BloxLogoDark.png',
  ].map((p) => path.join(root, p)),
  limeBuf,
);

// Also write SVG wordmark helpers for favicons
const svgLight = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 48" role="img" aria-label="BLOX">
  <text x="0" y="34" font-family="IBM Plex Sans, Arial, sans-serif" font-size="36" font-weight="700" fill="#FFFFFF" letter-spacing="-0.04em">BLOX</text>
  <rect x="0" y="40" width="120" height="5" rx="2.5" fill="#00CFA2"/>
</svg>`;
const svgDark = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 48" role="img" aria-label="BLOX">
  <text x="0" y="34" font-family="IBM Plex Sans, Arial, sans-serif" font-size="36" font-weight="700" fill="#16535B" letter-spacing="-0.04em">BLOX</text>
  <rect x="0" y="40" width="120" height="5" rx="2.5" fill="#00CFA2"/>
</svg>`;
const svgFav = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="BLOX">
  <rect width="64" height="64" rx="14" fill="#16535B"/>
  <text x="32" y="42" text-anchor="middle" font-family="IBM Plex Sans, Arial, sans-serif" font-size="28" font-weight="800" fill="#DBFF00" letter-spacing="-0.06em">bx</text>
</svg>`;

for (const [rel, content] of [
  ['packages/admin/public/BloxLogoNav.svg', svgLight],
  ['packages/customer/public/BloxLogoNav.svg', svgLight],
  ['packages/admin/public/BloxMark.svg', svgFav],
  ['packages/customer/public/BloxMark.svg', svgFav],
  ['docs/blox-logo.svg', svgDark],
  ['docs/blox-logo-light.svg', svgLight],
]) {
  const p = path.join(root, rel);
  fs.writeFileSync(p, content);
  console.log('wrote', rel);
}

// Purge old lime rgba / rgb arrays in source
const exts = new Set(['.ts', '.tsx', '.scss', '.css', '.html', '.mjs', '.js']);
const skip = new Set(['node_modules', 'dist', 'build', '.git', 'coverage']);
const replacements = [
  [/rgba\(\s*218\s*,\s*255\s*,\s*1\s*,/g, 'rgba(219, 255, 0,'],
  [/rgb\(\s*218\s*,\s*255\s*,\s*1\s*\)/g, 'rgb(219, 255, 0)'],
  [/\[\s*218\s*,\s*255\s*,\s*1\s*\]/g, '[219, 255, 0]'],
  [/#10[Bb]981/g, '#00CFA2'],
  [/#E4EBEB/g, '#E0E8E8'],
  [/#00A884/g, '#00A884'], // keep unless we remap below
];

// Remap secondary emerald shades in theme to in-palette approximations
replacements[replacements.length - 1] = [/#00A884/g, '#00B894'];
replacements.push([/#33D9B5/g, '#33D9B5']); // leave — close enough; or #4DD9B8

let filesChanged = 0;
function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walk(full);
      continue;
    }
    if (!exts.has(path.extname(ent.name))) continue;
    let text = fs.readFileSync(full, 'utf8');
    const orig = text;
    for (const [re, to] of replacements) {
      if (to === '#33D9B5') continue;
      text = text.replace(re, to);
    }
    text = text.replace(/#33D9B5/g, '#4DD9B8');
    if (text !== orig) {
      fs.writeFileSync(full, text);
      filesChanged++;
      console.log('patched', path.relative(root, full));
    }
  }
}

walk(path.join(root, 'packages'));
walk(path.join(root, 'supabase/functions/_shared'));
walk(path.join(root, 'docs/auth-email-templates'));

console.log(`DONE logos + ${filesChanged} source files patched`);
