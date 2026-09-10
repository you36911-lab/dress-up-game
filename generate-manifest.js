#!/usr/bin/env node
/**
 * Scans assets/<category>/ for image files and writes assets/manifest.json.
 * Run this any time you add, remove, or rename files in assets/:
 *
 *   node generate-manifest.js
 *
 * No dependencies — just Node.js built-ins.
 */

const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, 'assets');

const CATEGORIES = [
  'blazer', 'blouse', 'cardigan', 'coat', 'dress',
  'hoodie', 'hooded_zip_up', 'jacket', 'jeans', 'pants',
  'polo_shirt', 'poncho', 'romper', 'shirt', 'shorts',
  'skirt', 'sweater', 'sweatshirt', 'swimsuit', 't_shirt',
  'top', 'vest', 'shoes',
  'bag', 'glasses'
];

const IMAGE_EXT = /\.(png|webp)$/i;

function toDisplayName(filename) {
  return filename
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

const manifest = {};
let total = 0;

for (const cat of CATEGORIES) {
  const dir = path.join(ASSETS_DIR, cat);
  if (!fs.existsSync(dir)) {
    manifest[cat] = [];
    continue;
  }
  const files = fs.readdirSync(dir)
    .filter(f => IMAGE_EXT.test(f))
    .sort((a, b) => a.localeCompare(b));

  manifest[cat] = files.map(f => ({
    id: `${cat}_${f.replace(/\.[^.]+$/, '')}`,
    name: toDisplayName(f),
    src: `assets/${cat}/${f}`
  }));

  total += files.length;
}

fs.writeFileSync(
  path.join(ASSETS_DIR, 'manifest.json'),
  JSON.stringify(manifest, null, 2)
);

console.log(`assets/manifest.json updated — ${total} image(s) across ${CATEGORIES.length} categories.`);
