#!/usr/bin/env node
/**
 * One-shot helper: dedupe VW stock sheet → SQL VALUES for migration.
 * Run: node scripts/gen-vw-inventory-migration.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const rows = [
  [1, 'AMAROK', 'Amarok DC Style 2.3 l TSI 222 KW 4W  hp', 257, 'Dark Gray Metallic', 2025, 159900],
  [2, 'CADDY GP DEL. VAN 1.6L', 'Caddy Cargo 1.6 l 81 kW PFI  hp', 257, 'Pure Gray', 2026, 74900],
  [3, 'CADDY GP DEL. VAN 1.6L', 'Caddy Cargo 1.6 l 81 kW PFI  hp', 214, 'Candy White', 2026, 74900],
  [4, 'JETTA', 'Jetta Highline 1.5L Sedan FWD 4Doors Jetta Highline 1.5L Sed', 240, 'Pure White', 2026, 104900],
  [5, 'JETTA', 'Jetta Trendline 1.5L Sedan FWD 4Doors Jetta Trendline 1.5L S', 214, 'Manganese Gray Metallic', 2026, 89900],
  [6, 'JETTA', 'Jetta Trendline 1.5L Sedan FWD 4Doors Jetta Trendline 1.5L S', 214, 'Gavial Green Metallic', 2026, 89900],
  [7, 'JETTA', 'Jetta Trendline 1.5L Sedan FWD 4Doors Jetta Trendline 1.5L S', 214, 'Shark Blue', 2026, 89900],
  [8, 'JETTA', 'Jetta Trendline 1.5L Sedan FWD 4Doors Jetta Trendline 1.5L S', 214, 'Manganese Gray Metallic', 2026, 89900],
  [9, 'JETTA', 'Jetta Trendline 1.5L Sedan FWD 4Doors Jetta Trendline 1.5L S', 214, 'Manganese Gray Metallic', 2026, 89900],
  [10, 'PASSAT', 'Passat A-Line 1.5L Sedan FWD Passat A-Line 1.5L Sedan FWD hp', 240, 'Grenadilla Black Metallic', 2026, 104900],
  [11, 'PASSAT', 'Passat A-Line 1.5L Sedan FWD Passat A-Line 1.5L Sedan FWD hp', 240, 'Grenadilla Black Metallic', 2026, 104900],
  [12, 'PASSAT', 'Passat A-Line 1.5L Sedan FWD Passat A-Line 1.5L Sedan FWD hp', 240, 'Grenadilla Black Metallic', 2026, 104900],
  [13, 'PASSAT', 'Passat A-Line 1.5L Sedan FWD Passat A-Line 1.5L Sedan FWD hp', 240, 'Grenadilla Black Metallic', 2026, 104900],
  [14, 'PASSAT', 'Passat A-Line 1.5L Sedan FWD Passat A-Line 1.5L Sedan FWD hp', 240, 'Grenadilla Black Metallic', 2026, 104900],
  [15, 'PASSAT', 'Passat A-Line 1.5L Sedan FWD Passat A-Line 1.5L Sedan FWD hp', 240, 'Grenadilla Black Metallic', 2026, 104900],
  [16, 'PASSAT', 'Passat A-Line 1.5L Sedan FWD Passat A-Line 1.5L Sedan FWD hp', 240, 'Grenadilla Black Metallic', 2026, 104900],
  [17, 'PASSAT', 'Passat A-Line 1.5L Sedan FWD Passat A-Line 1.5L Sedan FWD hp', 240, 'Grenadilla Black Metallic', 2026, 104900],
  [18, 'PASSAT', 'Passat A-Line 1.5L Sedan FWD Passat A-Line 1.5L Sedan FWD hp', 240, 'Grenadilla Black Metallic', 2026, 104900],
  [19, 'PASSAT', 'Passat A-Line 1.5L Sedan FWD Passat A-Line 1.5L Sedan FWD hp', 214, 'Bamboo Gray Metallic', 2026, 104900],
  [20, 'PASSAT', 'Passat A-Line 1.5L Sedan FWD Passat A-Line 1.5L Sedan FWD hp', 240, 'Grenadilla Black Metallic', 2026, 104900],
  [21, 'PASSAT', 'Passat A-Line 1.5L Sedan FWD Passat A-Line 1.5L Sedan FWD hp', 240, 'Grenadilla Black Metallic', 2026, 104900],
  [22, 'PASSAT', 'Passat A-Line 1.5L Sedan FWD Passat A-Line 1.5L Sedan FWD hp', 240, 'Grenadilla Black Metallic', 2026, 104900],
  [23, 'PASSAT', 'Passat A-Line 1.5L Sedan FWD Passat A-Line 1.5L Sedan FWD hp', 240, 'Grenadilla Black Metallic', 2026, 104900],
  [24, 'PASSAT', 'Passat A-Line 1.5L Sedan FWD Passat A-Line 1.5L Sedan FWD hp', 240, 'Grenadilla Black Metallic', 2026, 104900],
  [25, 'PASSAT', 'Passat A-Line 1.5L Sedan FWD Passat A-Line 1.5L Sedan FWD hp', 240, 'Grenadilla Black Metallic', 2026, 104900],
  [26, 'PASSAT', 'Passat A-Line 1.5L Sedan FWD Passat A-Line 1.5L Sedan FWD hp', 240, 'Grenadilla Black Metallic', 2026, 104900],
  [27, 'PASSAT', 'Passat A-Line 1.5L Sedan FWD Passat A-Line 1.5L Sedan FWD hp', 214, 'Silver Leaf Metallic', 2026, 104900],
  [28, 'PASSAT', 'Passat A-Line 1.5L Sedan FWD Passat A-Line 1.5L Sedan FWD hp', 214, 'Bamboo Gray Metallic', 2026, 104900],
  [29, 'PASSAT', 'Passat A-Line 1.5L Sedan FWD Passat A-Line 1.5L Sedan FWD hp', 240, 'Grenadilla Black Metallic', 2026, 104900],
  [30, 'PASSAT', 'Passat A-Line 1.5L Sedan FWD Passat A-Line 1.5L Sedan FWD hp', 240, 'Grenadilla Black Metallic', 2026, 104900],
  [31, 'PASSAT', 'Passat A-Line 1.5L Sedan FWD Passat A-Line 1.5L Sedan FWD hp', 240, 'Grenadilla Black Metallic', 2026, 104900],
  [32, 'PASSAT', 'Passat A-Line 1.5L Sedan FWD Passat A-Line 1.5L Sedan FWD hp', 240, 'Grenadilla Black Metallic', 2026, 104900],
  [33, 'PASSAT', 'Passat A-Line 1.5L Sedan FWD Passat A-Line 1.5L Sedan FWD hp', 240, 'Grenadilla Black Metallic', 2026, 104900],
  [34, 'PASSAT', 'Passat B-Line 1.5L Sedan FWD Passat B-Line 1.5L Sedan FWD hp', 214, 'Deepest Ocean Blue Metallic', 2026, 114900],
  [35, 'PASSAT', 'Passat B-Line 1.5L Sedan FWD Passat B-Line 1.5L Sedan FWD hp', 214, 'Deepest Ocean Blue Metallic', 2026, 114900],
  [36, 'PASSAT', 'Passat B-Line 1.5L Sedan FWD Passat B-Line 1.5L Sedan FWD hp', 214, 'Bamboo Gray Metallic', 2026, 114900],
  [37, 'PASSAT', 'Passat B-Line 1.5L Sedan FWD Passat B-Line 1.5L Sedan FWD hp', 214, 'Bamboo Gray Metallic', 2026, 114900],
  [38, 'PASSAT', 'Passat B-Line 1.5L Sedan FWD Passat B-Line 1.5L Sedan FWD hp', 214, 'Bamboo Gray Metallic', 2026, 114900],
  [39, 'PASSAT', 'Passat B-Line 1.5L Sedan FWD Passat B-Line 1.5L Sedan FWD hp', 214, 'Bamboo Gray Metallic', 2026, 114900],
  [40, 'T-ROC', 'T-Roc Life 1.4 L T-Roc Life 1.4 L hp', 286, 'Grenadilla Black Metallic', 2026, 89900],
  [41, 'T-ROC', 'T-Roc Life 1.4 L T-Roc Life 1.4 L hp', 286, 'Grenadilla Black Metallic', 2026, 89900],
  [42, 'T-ROC', 'T-Roc Life 1.4 L T-Roc Life 1.4 L hp', 286, 'Pure White', 2026, 89900],
  [43, 'T-ROC', 'T-Roc Life 1.4 L T-Roc Life 1.4 L hp', 286, 'Pure White', 2026, 89900],
  [44, 'T-ROC', 'T-Roc Life 1.4 L T-Roc Life 1.4 L hp', 286, 'Grenadilla Black Metallic', 2026, 89900],
  [45, 'T-ROC', 'T-Roc Life 1.4 L T-Roc Life 1.4 L hp', 286, 'Pure White', 2026, 89900],
  [46, 'T-ROC', 'T-Roc Life 1.4 L T-Roc Life 1.4 L hp', 245, 'Pure White', 2026, 89900],
  [47, 'T-ROC', 'T-Roc Life 1.4 l TSI 110 kW (150 PS) 8-speed automatic trans', 482, 'Indium Gray Metallic', 2025, 89900],
  [48, 'TERAMONT', 'Teramont Comfortline 2.0L Teramont Comfortline 2.0L hp', 263, 'Avocado Green Metallic', 2026, 209900],
  [49, 'TERAMONT', 'Teramont Comfortline 2.0L Teramont Comfortline 2.0L hp', 263, 'Pure Gray', 2026, 209900],
  [50, 'TERAMONT', 'Teramont Comfortline 2.0L Teramont Comfortline 2.0L hp', 382, 'Avocado Green Metallic', 2025, 209900],
  [51, 'TERAMONT', 'Teramont Comfortline 2.0L Teramont Comfortline 2.0L hp', 263, 'Silverbird Metallic', 2026, 209900],
  [52, 'TERAMONT', 'Teramont Comfortline 2.0L Teramont Comfortline 2.0L hp', 340, 'Pure Gray', 2025, 209900],
  [53, 'TERAMONT', 'Teramont Comfortline 2.0L Teramont Comfortline 2.0L hp', 382, 'Platinum Gray Metallic', 2025, 209900],
  [54, 'TERAMONT', 'Teramont Comfortline 2.0L Teramont Comfortline 2.0L hp', 263, 'Silverbird Metallic', 2026, 209900],
  [55, 'TERAMONT', 'Teramont R-Line 2.0L Teramont R-Line 2.0L hp', 382, 'Platinum Gray Metallic', 2025, 259900],
  [56, 'TERAMONT', 'Teramont R-Line 2.0L Teramont R-Line 2.0L hp', 382, 'Pure Gray', 2025, 259900],
  [57, 'TERAMONT', 'Teramont Trendline 2.0L Teramont Trendline 2.0L hp', 263, 'Silverbird Metallic', 2026, 179900],
  [58, 'TERAMONT', 'Teramont Trendline 2.0L Teramont Trendline 2.0L hp', 263, 'Pure Gray', 2026, 179900],
  [59, 'TERAMONT', 'Teramont Trendline 2.0L Teramont Trendline 2.0L hp', 263, 'Pure Gray', 2026, 179900],
  [60, 'TERAMONT', 'Teramont Trendline 2.0L Teramont Trendline 2.0L hp', 340, 'Pure Gray', 2025, 179900],
  [61, 'TIGUAN', 'Tiguan Elegance 1.4 I TSI Tiguan Elegance 1.4 I TSI hp', 312, 'Oyster Silver Metallic', 2025, 169900],
  [62, 'TIGUAN', 'Tiguan Life 1.4 I TSI Tiguan Life 1.4 I TSI hp', 263, 'Pure White', 2026, 119900],
  [63, 'TIGUAN', 'Tiguan Life 1.4 I TSI Tiguan Life 1.4 I TSI hp', 236, 'Dolphin Gray Metallic', 2026, 119900],
  [64, 'TIGUAN', 'Tiguan Life 1.4 I TSI Tiguan Life 1.4 I TSI hp', 257, 'Nightshade Blue Metallic', 2026, 119900],
  [65, 'TIGUAN', 'Tiguan Life 1.4 I TSI Tiguan Life 1.4 I TSI hp', 236, 'Nightshade Blue Metallic', 2026, 119900],
  [66, 'TIGUAN', 'Tiguan Life 1.4 I TSI Tiguan Life 1.4 I TSI hp', 263, 'Pure White', 2026, 119900],
  [67, 'TIGUAN', 'Tiguan Life 1.4 I TSI Tiguan Life 1.4 I TSI hp', 214, 'Pure White', 2026, 119900],
  [68, 'TIGUAN', 'Tiguan Life 1.4 I TSI Tiguan Life 1.4 I TSI hp', 257, 'Dolphin Gray Metallic', 2026, 119900],
  [69, 'TIGUAN', 'Tiguan Life 1.4 I TSI Tiguan Life 1.4 I TSI hp', 236, 'Nightshade Blue Metallic', 2026, 119900],
  [70, 'TIGUAN', 'Tiguan Life 1.4 I TSI Tiguan Life 1.4 I TSI hp', 257, 'Dolphin Gray Metallic', 2026, 119900],
  [71, 'TIGUAN', 'Tiguan Life 1.4 I TSI Tiguan Life 1.4 I TSI hp', 263, 'Pure White', 2026, 119900],
  [72, 'TIGUAN', 'Tiguan Life 1.4 I TSI Tiguan Life 1.4 I TSI hp', 257, 'Nightshade Blue Metallic', 2026, 119900],
  [73, 'TIGUAN', 'Tiguan Life 1.4 I TSI Tiguan Life 1.4 I TSI hp', 257, 'Cipressino-Green Metallic', 2026, 119900],
  [74, 'TIGUAN', 'Tiguan Life 1.4 I TSI Tiguan Life 1.4 I TSI hp', 263, 'Dolphin Gray Metallic', 2026, 119900],
  [75, 'TIGUAN', 'Tiguan Life 1.4 I TSI Tiguan Life 1.4 I TSI hp', 263, 'Cipressino-Green Metallic', 2026, 119900],
  [76, 'TIGUAN', 'Tiguan Life 1.4 I TSI Tiguan Life 1.4 I TSI hp', 245, 'Pure White', 2026, 119900],
  [77, 'TIGUAN', 'Tiguan Life 1.4 I TSI Tiguan Life 1.4 I TSI hp', 263, 'Dolphin Gray Metallic', 2026, 119900],
  [78, 'TIGUAN', 'Tiguan Life 1.4 I TSI Tiguan Life 1.4 I TSI hp', 236, 'Urano Gray', 2026, 119900],
  [79, 'TIGUAN', 'Tiguan Life 1.4 I TSI Tiguan Life 1.4 I TSI hp', 236, 'Urano Gray', 2026, 119900],
  [80, 'TIGUAN', 'Tiguan Life 1.4 I TSI Tiguan Life 1.4 I TSI hp', 257, 'Nightshade Blue Metallic', 2026, 119900],
  [81, 'TIGUAN', 'Tiguan Life 1.4 I TSI Tiguan Life 1.4 I TSI hp', 257, 'Nightshade Blue Metallic', 2026, 119900],
  [82, 'TIGUAN', 'Tiguan Life 1.4 I TSI Tiguan Life 1.4 I TSI hp', 263, 'Pure White', 2026, 119900],
  [83, 'TIGUAN', 'Tiguan Life 1.4 I TSI Tiguan Life 1.4 I TSI hp', 236, 'Urano Gray', 2026, 119900],
  [84, 'TIGUAN', 'Tiguan Life 1.4 I TSI Tiguan Life 1.4 I TSI hp', 257, 'Nightshade Blue Metallic', 2026, 119900],
  [85, 'TIGUAN', 'Tiguan Life 1.4 I TSI Tiguan Life 1.4 I TSI hp', 263, 'Pure White', 2026, 119900],
  [86, 'TIGUAN', 'Tiguan Life 1.4 I TSI Tiguan Life 1.4 I TSI hp', 236, 'Urano Gray', 2026, 119900],
];

function slug(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function modelName(raw) {
  const m = raw.toUpperCase();
  if (m.startsWith('AMAROK')) return 'Amarok';
  if (m.startsWith('CADDY')) return 'Caddy';
  if (m.startsWith('JETTA')) return 'Jetta';
  if (m.startsWith('PASSAT')) return 'Passat';
  if (m.startsWith('T-ROC') || m.startsWith('TROC')) return 'T-Roc';
  if (m.startsWith('TERAMONT')) return 'Teramont';
  if (m.startsWith('TIGUAN')) return 'Tiguan';
  return raw;
}

function trimFromDesc(desc) {
  if (/Amarok DC Style/i.test(desc)) return 'DC Style 2.3 l TSI 222 KW 4W';
  if (/Caddy Cargo/i.test(desc)) return 'Cargo 1.6 l 81 kW PFI';
  if (/Jetta Highline/i.test(desc)) return 'Highline 1.5L Sedan FWD';
  if (/Jetta Trendline/i.test(desc)) return 'Trendline 1.5L Sedan FWD';
  if (/Passat A-Line/i.test(desc)) return 'A-Line 1.5L Sedan FWD';
  if (/Passat B-Line/i.test(desc)) return 'B-Line 1.5L Sedan FWD';
  if (/T-Roc Life 1\.4 l TSI/i.test(desc)) return 'Life 1.4 l TSI 110 kW';
  if (/T-Roc Life 1\.4 L/i.test(desc)) return 'Life 1.4 L';
  if (/Teramont Comfortline/i.test(desc)) return 'Comfortline 2.0L';
  if (/Teramont R-Line/i.test(desc)) return 'R-Line 2.0L';
  if (/Teramont Trendline/i.test(desc)) return 'Trendline 2.0L';
  if (/Tiguan Elegance/i.test(desc)) return 'Elegance 1.4 I TSI';
  if (/Tiguan Life/i.test(desc)) return 'Life 1.4 I TSI';
  return desc.slice(0, 80);
}

function engineFromTrim(trim) {
  if (/222 KW/i.test(trim)) return '2.3 l TSI 222 KW';
  if (/81 kW/i.test(trim)) return '1.6 l 81 kW PFI';
  if (/110 kW/i.test(trim)) return '1.4 l TSI 110 kW';
  if (/1\.5L/i.test(trim)) return '1.5L';
  if (/1\.4 L/i.test(trim)) return '1.4 L';
  if (/2\.0L/i.test(trim)) return '2.0L';
  if (/1\.4 I TSI/i.test(trim)) return '1.4 I TSI';
  return '';
}

function cleanDesc(desc) {
  let d = desc.replace(/\s+hp\s*$/i, '').replace(/\s{2,}/g, ' ').trim();
  const pairs = [
    ['Passat A-Line 1.5L Sedan FWD', 'Passat A-Line 1.5L Sedan FWD'],
    ['Passat B-Line 1.5L Sedan FWD', 'Passat B-Line 1.5L Sedan FWD'],
    ['T-Roc Life 1.4 L', 'T-Roc Life 1.4 L'],
    ['Teramont Comfortline 2.0L', 'Teramont Comfortline 2.0L'],
    ['Teramont R-Line 2.0L', 'Teramont R-Line 2.0L'],
    ['Teramont Trendline 2.0L', 'Teramont Trendline 2.0L'],
    ['Tiguan Elegance 1.4 I TSI', 'Tiguan Elegance 1.4 I TSI'],
    ['Tiguan Life 1.4 I TSI', 'Tiguan Life 1.4 I TSI'],
  ];
  for (const [a] of pairs) {
    if (d.startsWith(a)) return a;
  }
  if (/Jetta Highline/i.test(d)) return 'Jetta Highline 1.5L Sedan FWD 4Doors';
  if (/Jetta Trendline/i.test(d)) return 'Jetta Trendline 1.5L Sedan FWD 4Doors';
  if (/Amarok DC Style/i.test(d)) return 'Amarok DC Style 2.3 l TSI 222 KW 4W';
  if (/Caddy Cargo/i.test(d)) return 'Caddy Cargo 1.6 l 81 kW PFI';
  if (/T-Roc Life 1\.4 l TSI/i.test(d)) {
    return 'T-Roc Life 1.4 l TSI 110 kW (150 PS) 8-speed automatic';
  }
  return d;
}

function sqlStr(s) {
  return `'${String(s).replace(/'/g, "''")}'`;
}

function attrs(id, family, qty, minAge) {
  return `'[{"id":"model_family_key","name":"model_family_key","value":${JSON.stringify(family)}},{"id":"sku_key","name":"sku_key","value":${JSON.stringify(id)}},{"id":"stock_qty","name":"stock_qty","value":${JSON.stringify(String(qty))}},{"id":"inventory_age_days","name":"inventory_age_days","value":${JSON.stringify(String(minAge))}}]'::jsonb`;
}

const map = new Map();
for (const [, modelRaw, desc, age, color, my, price] of rows) {
  const model = modelName(modelRaw);
  const trim = trimFromDesc(desc);
  const key = [model, trim, color, my, price].join('|');
  if (!map.has(key)) {
    map.set(key, {
      model,
      trim,
      color,
      my,
      price,
      desc: cleanDesc(desc),
      ages: [],
      qty: 0,
    });
  }
  const e = map.get(key);
  e.qty += 1;
  e.ages.push(age);
}

const skus = [...map.values()].map((e) => {
  const family = slug(e.model);
  const id = `vw-${slug([e.model, e.trim, e.color, String(e.my)].join('-'))}`;
  return {
    id,
    ...e,
    family,
    engine: engineFromTrim(e.trim),
    minAge: Math.min(...e.ages),
  };
});

console.error(`SKU count: ${skus.length}; total qty: ${skus.reduce((a, s) => a + s.qty, 0)}`);

const values = skus
  .map((s) => {
    return `    (${sqlStr(s.id)}, 'Volkswagen', ${sqlStr(s.model)}, ${sqlStr(s.trim)}, ${s.my}, 'new', ${sqlStr(s.engine)}, ${sqlStr(s.color)}, 0, ${s.price}, 'active',
      '[]'::jsonb, '[]'::jsonb,
      ${attrs(s.id, s.family, s.qty, s.minAge)},
      ${sqlStr(s.desc)}, v_vw, now(), now())`;
  })
  .join(',\n');

const outValues = path.join(__dirname, 'vw-sku-values.sql');
fs.writeFileSync(outValues, values + '\n', 'utf8');
console.error('Wrote', outValues);
