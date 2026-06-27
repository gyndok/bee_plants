# 🐝 Native Plants for Bees — 2026 Bloom Calendar

An interactive bloom calendar of **225 native plants** for bees, hummingbirds,
and caterpillars. It turns a static print PDF into a searchable, filterable web
app so you can plan year-round forage at a glance.

**Live:** https://native-plants-for-bees.vercel.app

## Features

- **Card grid** — every plant with a mini 12-month bloom bar, plus type, light,
  soil, height, and lifespan, and 🐝 / 🐦 hummingbird / 🐛 caterpillar-host value
  badges (with the number of caterpillar species each hosts).
- **Bloom timeline** — a Gantt-style view laying each plant's flowering window
  across the year, so gaps in forage are easy to spot.
- **Faceted filtering** — season, plant type, light, soil, lifespan, and
  hummingbird / caterpillar-host toggles, all combinable.
- **Live search** by common or scientific name, and **sorting** by bloom start,
  name, or caterpillar value.
- Responsive layout with automatic light/dark mode.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router) + React 19
- [Tailwind CSS v4](https://tailwindcss.com)
- TypeScript
- Statically prerendered — no server runtime needed
- Deployed on [Vercel](https://vercel.com) (auto-deploys on push to `main`)

## Local development

```bash
npm install
npm run dev
# open http://localhost:3000
```

Other scripts:

```bash
npm run build   # production build
npm run start   # serve the production build
npm run lint    # eslint
```

## Project structure

```
src/
  app/
    layout.tsx              # root layout + metadata
    page.tsx                # server component, passes data to the calendar
    globals.css            # theme tokens (light/dark)
  components/
    BloomCalendar.tsx       # client component: search, filters, cards, timeline
  data/
    plants.ts               # AUTO-GENERATED typed plant data (225 entries)
    photos.ts               # AUTO-GENERATED photo manifest (credit/license)
public/
  photos/                   # optimized plant photos (one .jpg per species)
scripts/
  parse-pdf.mjs             # regenerates the plant dataset from the PDF text
  fetch-photos.mjs          # finds one CC photo per plant on iNaturalist
  fetch-missing.mjs         # targeted re-fetch for any misses
  build-photos.mjs          # downloads/optimizes photos + writes photos.ts
```

## Regenerating the data

`src/data/plants.ts` is generated from the source PDF — don't edit it by hand.
The pipeline is:

1. Extract the PDF text with layout preserved (requires
   [`poppler`](https://poppler.freedesktop.org/) for `pdftotext`):

   ```bash
   pdftotext -layout "Native Plants for Bees 2026 - Bloom Calendar.pdf" bees.txt
   ```

2. Parse the text into structured JSON:

   ```bash
   node scripts/parse-pdf.mjs bees.txt bees.json
   ```

   The parser tokenizes each row into the column fields, derives numeric bloom
   start/end months (used by the timeline), and reports the per-season counts
   (64 Late Winter · 90 Spring · 60 Summer · 11 Fall = 225).

3. Wrap the JSON as the typed `plants` export in `src/data/plants.ts`.

> Note: common/scientific names are preserved exactly as printed in the source
> PDF, including a couple of original typos (e.g. *Hymenocallis liriosme*).

## Plant photos

Each plant has one representative photo, shown as a thumbnail on its card and in
the timeline, and full-size in the detail modal (click any plant).

- **Source:** the [iNaturalist API](https://api.inaturalist.org/v1/docs/),
  matched by scientific name.
- **Licensing:** only Creative Commons / CC0 photos are used; the photographer
  credit, license code, and source link are stored per photo in `photos.ts` and
  shown in the detail modal.
- **Coverage:** all 225 plants have a photo. Plants without one fall back to a
  season-colored placeholder tile.
- **Display:** served through `next/image` (lazy-loaded, responsive, optimized),
  so the grid stays fast despite 225 images.

To regenerate the photo set:

```bash
node scripts/fetch-photos.mjs    # query iNaturalist, write photos-raw.json
node scripts/fetch-missing.mjs   # optional: retry any misses with fixes
node scripts/build-photos.mjs    # download + optimize + write photos.ts
```

`build-photos.mjs` uses the built-in macOS `sips` tool to resize/recompress, so
no extra image dependencies are required.

## Data fields

Each plant record includes: `common`, `scientific`, `type`, `light`, `soil`,
`lifespan`, `height`, `bloom`, `window` (bloom/seed window), `season`,
`seasonKey`, `bee`, `hummingbird`, `caterpillar` (host species count, nullable),
and the derived `bloomStart` / `bloomEnd` month numbers.
