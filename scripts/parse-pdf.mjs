import fs from 'node:fs';

const txt = fs.readFileSync(process.argv[2], 'utf8');
const lines = txt.split('\n');

const SECTIONS = [
  { re: /Late Winter .* — \d+ plants/, season: 'Late Winter – Early Spring', key: 'late-winter' },
  { re: /^\s*Spring \(first bloom/, season: 'Spring', key: 'spring' },
  { re: /^\s*Summer \(first bloom/, season: 'Summer', key: 'summer' },
  { re: /^\s*Fall \(first bloom/, season: 'Fall', key: 'fall' },
];

const TYPE = '(Shrub - Tree|Grass-like|Vine|Tree|Herb|Shrub)';
const LIGHT = '(Sun - Part shade|Sun - Shade|Part shade - Shade|Sun|Part shade|Shade)';
const SOIL = '(Dry - Moist|Dry - Wet|Moist - Wet|Dry|Moist|Wet)';
const LIFE = '(Perennial|Annual|Biennial)';
// height like 12'-40' or 0'-1'
const dataRe = new RegExp(
  `^(.*?)\\s{2,}${TYPE}\\s+${LIGHT}\\s+${SOIL}\\s+${LIFE}\\s+(\\S+)\\s+(Late summer|\\S+)\\s+(Late summer\\/Fall|\\S+)\\s+(X.*)$`
);

function parseTail(tail) {
  const xs = (tail.match(/X/g) || []).length;
  const num = tail.match(/(\d+)\s*$/);
  return {
    bee: xs >= 1,
    hummingbird: xs >= 2,
    caterpillar: num ? parseInt(num[1], 10) : null,
  };
}

const isFooter = (l) => /Native Plants for Bees 2026 · page/.test(l);
const isColHeader = (l) => /^\s*Plant\s+Type\s+Light/.test(l);
const isBlank = (l) => l.trim() === '';

const plants = [];
let season = null, seasonKey = null;
const unparsed = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (isBlank(line) || isFooter(line) || isColHeader(line)) continue;
  const sec = SECTIONS.find((s) => s.re.test(line));
  if (sec) { season = sec.season; seasonKey = sec.key; continue; }
  if (/Native Plants for Bees 2026$/.test(line) || /Organized by bloom season/.test(line)) continue;

  const m = line.match(dataRe);
  if (m) {
    let [, common, type, light, soil, lifespan, height, bloom, window, tail] = m;
    common = common.trim();
    // find scientific name: next non-blank line(s) that aren't data/header/footer
    let sci = '';
    for (let j = i + 1; j < lines.length; j++) {
      const nx = lines[j];
      if (isBlank(nx)) break;
      if (isFooter(nx) || isColHeader(nx) || SECTIONS.find((s) => s.re.test(nx))) break;
      if (dataRe.test(nx)) break;
      sci += (sci ? ' ' : '') + nx.trim();
      // stop after grabbing continuation lines until blank/data
    }
    plants.push({
      common, scientific: sci.trim(), type, light, soil, lifespan,
      height, bloom, window, season, seasonKey, ...parseTail(tail),
    });
  } else {
    unparsed.push({ n: i + 1, line });
  }
}

const MONTHS = { Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12 };
function bloomMonths(bloom) {
  if (bloom === 'Fall') return [9, 11];
  if (bloom === 'Late summer') return [8, 9];
  const parts = bloom.split('-');
  const s = MONTHS[parts[0]];
  const e = MONTHS[parts[1] ?? parts[0]];
  if (!s) return [null, null];
  return [s, e ?? s];
}
for (const p of plants) {
  const [s, e] = bloomMonths(p.bloom);
  p.bloomStart = s;
  p.bloomEnd = e;
}

// Fix two plants whose common name printed on its own line (so the data
// row's first column captured the scientific name instead).
const fixups = {
  'Gaura lindheimeri / Oenothera': {
    common: "Lindheimer's beeblossom",
    scientific: 'Gaura lindheimeri / Oenothera lindheimeri',
  },
  'Lantana urticoides / Lantana': {
    common: 'Texas lantana',
    scientific: 'Lantana urticoides / Lantana horrida',
  },
};
for (const p of plants) {
  if (fixups[p.common]) Object.assign(p, fixups[p.common]);
}

fs.writeFileSync(process.argv[3], JSON.stringify(plants, null, 2));
console.log('Parsed plants:', plants.length);
const counts = {};
for (const p of plants) counts[p.season] = (counts[p.season] || 0) + 1;
console.log('By season:', counts);
console.log('Unparsed non-trivial lines:');
for (const u of unparsed) console.log(' ', u.n, JSON.stringify(u.line.slice(0, 60)));
