// Targeted re-fetch for the handful of plants the bulk run missed.
// Tries the taxa endpoint with a corrected query, then falls back to
// CC-licensed *observation* photos. Patches scripts/photos-raw.json in place.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW = path.join(__dirname, "photos-raw.json");
const UA = "native-plants-for-bees/1.0 (https://github.com/gyndok/bee_plants)";
const CC = ["cc0", "cc-by", "cc-by-sa", "cc-by-nc", "cc-by-nc-sa", "cc-by-nd", "cc-by-nc-nd"];
const isCC = (c) => typeof c === "string" && c.toLowerCase().startsWith("cc");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const targets = [
  { rawKey: "Bouteloua rigidiseta Texas lantana", scientific: "Bouteloua rigidiseta", query: "Bouteloua rigidiseta" },
  { rawKey: "Monarda lindheimerii", scientific: "Monarda lindheimerii", query: "Monarda lindheimeri" },
  { rawKey: "Carex perdentata", scientific: "Carex perdentata", query: "Carex perdentata" },
  { rawKey: "Croton capitatus", scientific: "Croton capitatus", query: "Croton capitatus" },
  { rawKey: "Sagittaria lancifolia", scientific: "Sagittaria lancifolia", query: "Sagittaria lancifolia" },
];

const getJSON = async (url) => {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

async function viaTaxa(query) {
  const s = await getJSON(`https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(query)}&per_page=5`);
  const t = (s.results || []).find((x) => x.name?.toLowerCase() === query.toLowerCase()) || s.results?.[0];
  if (t?.default_photo && isCC(t.default_photo.license_code)) {
    const p = t.default_photo;
    return { medium: p.medium_url, square: p.square_url, license: p.license_code, attribution: p.attribution, sourceUrl: `https://www.inaturalist.org/taxa/${t.id}` };
  }
  return null;
}

async function viaObservations(query) {
  const url =
    `https://api.inaturalist.org/v1/observations?taxon_name=${encodeURIComponent(query)}` +
    `&photos=true&photo_license=${CC.join(",")}&quality_grade=research&order_by=votes&per_page=5`;
  const s = await getJSON(url);
  for (const obs of s.results || []) {
    const ph = (obs.photos || []).find((p) => isCC(p.license_code));
    if (ph) {
      const base = ph.url.replace(/square\.(jpe?g|png)/i, "medium.$1");
      return {
        medium: base,
        square: ph.url,
        license: ph.license_code,
        attribution: ph.attribution || `(c) ${obs.user?.login ?? "iNaturalist user"}`,
        sourceUrl: `https://www.inaturalist.org/observations/${obs.id}`,
      };
    }
  }
  return null;
}

const raw = JSON.parse(fs.readFileSync(RAW, "utf8"));
const byKey = new Map(raw.map((r) => [r.scientific, r]));

for (const t of targets) {
  let photo = await viaTaxa(t.query);
  if (!photo) { await sleep(500); photo = await viaObservations(t.query); }
  const entry = byKey.get(t.rawKey);
  if (!entry) { console.log(`  (no raw entry for ${t.rawKey})`); continue; }
  entry.scientific = t.scientific; // normalize key to match plants.ts
  if (photo) {
    Object.assign(entry, photo, { status: "ok-fixed" });
    console.log(`  OK   ${t.scientific} <- ${photo.license} (${photo.sourceUrl.includes("observations") ? "obs" : "taxon"})`);
  } else {
    console.log(`  STILL MISSING ${t.scientific}`);
  }
  await sleep(600);
}

fs.writeFileSync(RAW, JSON.stringify(raw, null, 2));
console.log("Patched photos-raw.json");
