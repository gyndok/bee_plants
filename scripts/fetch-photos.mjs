// Fetch one CC-licensed photo per plant from the iNaturalist API.
//
//   node scripts/fetch-photos.mjs
//
// Reads src/data/plants.ts (via the generated JSON shape), queries iNaturalist
// by scientific name, keeps only Creative-Commons-licensed photos, and writes
// scripts/photos-raw.json with the chosen photo + attribution for each plant.
// Run scripts/build-photos.mjs afterwards to download/optimize and emit the
// typed manifest.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const UA = "native-plants-for-bees/1.0 (https://github.com/gyndok/bee_plants)";
const OUT = path.join(__dirname, "photos-raw.json");

const isCC = (code) => typeof code === "string" && code.toLowerCase().startsWith("cc");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Pull the plant list out of the generated TS data module.
function loadPlants() {
  const ts = fs.readFileSync(path.join(ROOT, "src/data/plants.ts"), "utf8");
  const marker = "Plant[] =";
  const after = ts.indexOf(marker) + marker.length;
  const json = ts.slice(ts.indexOf("[", after), ts.lastIndexOf("]") + 1);
  return JSON.parse(json);
}

// "Gaura lindheimeri / Oenothera lindheimeri" -> "Gaura lindheimeri"
const queryName = (scientific) => scientific.split(" / ")[0].trim();

async function getJSON(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

function photoFrom(p, taxonId) {
  return {
    license: p.license_code,
    attribution: p.attribution,
    medium: p.medium_url || p.url?.replace("square", "medium"),
    square: p.square_url || p.url,
    sourceUrl: `https://www.inaturalist.org/taxa/${taxonId}`,
  };
}

async function resolvePhoto(scientific) {
  const q = queryName(scientific);
  const search = await getJSON(
    `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(q)}&per_page=5`
  );
  const results = search.results || [];
  if (!results.length) return { scientific, query: q, status: "no-taxon" };

  // Prefer an exact name match, else the first result.
  const exact = results.find((t) => t.name?.toLowerCase() === q.toLowerCase());
  const taxon = exact || results[0];

  // 1) default photo if it's CC.
  if (taxon.default_photo && isCC(taxon.default_photo.license_code)) {
    return { scientific, query: q, matched: taxon.name, status: "ok", ...photoFrom(taxon.default_photo, taxon.id) };
  }

  // 2) otherwise look through the taxon's other photos for a CC one.
  await sleep(500);
  const detail = await getJSON(`https://api.inaturalist.org/v1/taxa/${taxon.id}`);
  const tp = detail.results?.[0]?.taxon_photos || [];
  const cc = tp.map((x) => x.photo).find((p) => isCC(p?.license_code));
  if (cc) {
    return { scientific, query: q, matched: taxon.name, status: "ok-alt", ...photoFrom(cc, taxon.id) };
  }
  return { scientific, query: q, matched: taxon.name, status: "no-cc-photo", sourceUrl: `https://www.inaturalist.org/taxa/${taxon.id}` };
}

const plants = loadPlants();
const out = [];
let ok = 0, miss = 0;

for (let i = 0; i < plants.length; i++) {
  const p = plants[i];
  try {
    const r = await resolvePhoto(p.scientific);
    r.common = p.common;
    out.push(r);
    if (r.status.startsWith("ok")) ok++;
    else { miss++; console.log(`  MISS [${r.status}] ${p.common} (${p.scientific})`); }
  } catch (e) {
    out.push({ scientific: p.scientific, common: p.common, status: "error", error: String(e) });
    miss++;
    console.log(`  ERR  ${p.common}: ${e.message}`);
  }
  if ((i + 1) % 25 === 0) console.log(`…${i + 1}/${plants.length} (ok ${ok}, miss ${miss})`);
  await sleep(550);
}

fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
const lic = {};
for (const r of out) if (r.license) lic[r.license] = (lic[r.license] || 0) + 1;
console.log(`\nDone. ${ok} with photos, ${miss} without. -> ${path.relative(ROOT, OUT)}`);
console.log("License breakdown:", lic);
