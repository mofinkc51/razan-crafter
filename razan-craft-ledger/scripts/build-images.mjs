// Scans images/ and writes data/images.json  ->  { "Zinc Ore": "images/Zinc Ore.png", ... }
// The site matches each file name (without extension) to an item name, ignoring case; _ and - count as spaces.
import { readdirSync, statSync, writeFileSync } from "node:fs";
import { join, extname, basename } from "node:path";

const ROOT = "images";
const OUT = "data/images.json";
const EXTS = /\.(png|jpe?g|gif|webp|svg)$/i;
const found = {};

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (EXTS.test(name)) found[basename(name, extname(name))] = p.split("\\").join("/");
  }
}

try { walk(ROOT); } catch { /* no images folder yet */ }
const sorted = Object.fromEntries(Object.entries(found).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(OUT, JSON.stringify(sorted, null, 1) + "\n");
console.log(`images.json: ${Object.keys(sorted).length} images`);
