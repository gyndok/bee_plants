"use client";

import { useMemo, useState } from "react";
import type { Plant } from "@/data/plants";

const MONTH_LABELS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const MONTH_FULL = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const SEASONS = [
  { key: "late-winter", label: "Late Winter – Early Spring", short: "Late Winter", color: "#5b9bc4" },
  { key: "spring", label: "Spring", short: "Spring", color: "#6fae54" },
  { key: "summer", label: "Summer", short: "Summer", color: "#e0a416" },
  { key: "fall", label: "Fall", short: "Fall", color: "#c2703a" },
] as const;

const seasonColor = (key: string) =>
  SEASONS.find((s) => s.key === key)?.color ?? "#6fae54";

const TYPES = ["Tree", "Shrub", "Herb", "Vine", "Grass-like"];
const LIGHTS = ["Sun", "Part shade", "Shade"];
const SOILS = ["Dry", "Moist", "Wet"];
const LIFESPANS = ["Perennial", "Annual", "Biennial"];

// "Sun - Part shade" -> ["Sun", "Part shade"]
const tokens = (s: string) => s.split(" - ").map((t) => t.trim());

type SortKey = "name" | "bloom" | "caterpillar";

function toggle<T>(set: T[], value: T): T[] {
  return set.includes(value) ? set.filter((v) => v !== value) : [...set, value];
}

export default function BloomCalendar({ plants }: { plants: Plant[] }) {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"cards" | "timeline">("cards");
  const [seasons, setSeasons] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [lights, setLights] = useState<string[]>([]);
  const [soils, setSoils] = useState<string[]>([]);
  const [lifespans, setLifespans] = useState<string[]>([]);
  const [hummingbird, setHummingbird] = useState(false);
  const [caterpillar, setCaterpillar] = useState(false);
  const [sort, setSort] = useState<SortKey>("bloom");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = plants.filter((p) => {
      if (q && !p.common.toLowerCase().includes(q) && !p.scientific.toLowerCase().includes(q))
        return false;
      if (seasons.length && !seasons.includes(p.seasonKey)) return false;
      if (types.length && !types.some((t) => tokens(p.type).includes(t))) return false;
      if (lights.length && !lights.some((l) => tokens(p.light).includes(l))) return false;
      if (soils.length && !soils.some((s) => tokens(p.soil).includes(s))) return false;
      if (lifespans.length && !lifespans.includes(p.lifespan)) return false;
      if (hummingbird && !p.hummingbird) return false;
      if (caterpillar && !p.caterpillar) return false;
      return true;
    });
    result.sort((a, b) => {
      if (sort === "name") return a.common.localeCompare(b.common);
      if (sort === "caterpillar") return (b.caterpillar ?? -1) - (a.caterpillar ?? -1);
      // bloom: by start month, then end, then name
      return (
        a.bloomStart - b.bloomStart ||
        a.bloomEnd - b.bloomEnd ||
        a.common.localeCompare(b.common)
      );
    });
    return result;
  }, [plants, query, seasons, types, lights, soils, lifespans, hummingbird, caterpillar, sort]);

  const activeFilters =
    seasons.length + types.length + lights.length + soils.length + lifespans.length +
    (hummingbird ? 1 : 0) + (caterpillar ? 1 : 0) + (query ? 1 : 0);

  const clearAll = () => {
    setQuery("");
    setSeasons([]);
    setTypes([]);
    setLights([]);
    setSoils([]);
    setLifespans([]);
    setHummingbird(false);
    setCaterpillar(false);
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6">
      <Header total={plants.length} />

      {/* Controls */}
      <div className="sticky top-0 z-20 -mx-4 mb-6 border-b border-border bg-background/85 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by common or scientific name…"
                className="w-full rounded-full border border-border bg-card px-4 py-2.5 pr-10 text-sm outline-none transition-colors focus:border-leaf"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center rounded-full border border-border bg-card p-1 text-sm">
              {(["cards", "timeline"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`rounded-full px-3.5 py-1.5 font-medium capitalize transition-colors ${
                    view === v ? "bg-leaf text-white" : "text-muted hover:text-foreground"
                  }`}
                >
                  {v === "cards" ? "Cards" : "Bloom timeline"}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-2 text-sm text-muted">
              Sort
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-foreground outline-none focus:border-leaf"
              >
                <option value="bloom">Bloom start</option>
                <option value="name">Name (A–Z)</option>
                <option value="caterpillar">Caterpillar value</option>
              </select>
            </label>
          </div>

          {/* Filter chips */}
          <div className="flex flex-col gap-2.5">
            <FilterRow label="Season">
              {SEASONS.map((s) => (
                <Chip
                  key={s.key}
                  active={seasons.includes(s.key)}
                  onClick={() => setSeasons((p) => toggle(p, s.key))}
                  dot={s.color}
                >
                  {s.short}
                </Chip>
              ))}
            </FilterRow>
            <FilterRow label="Type">
              {TYPES.map((t) => (
                <Chip key={t} active={types.includes(t)} onClick={() => setTypes((p) => toggle(p, t))}>
                  {t}
                </Chip>
              ))}
            </FilterRow>
            <FilterRow label="Light">
              {LIGHTS.map((l) => (
                <Chip key={l} active={lights.includes(l)} onClick={() => setLights((p) => toggle(p, l))}>
                  {l}
                </Chip>
              ))}
            </FilterRow>
            <FilterRow label="Soil">
              {SOILS.map((s) => (
                <Chip key={s} active={soils.includes(s)} onClick={() => setSoils((p) => toggle(p, s))}>
                  {s}
                </Chip>
              ))}
            </FilterRow>
            <FilterRow label="More">
              {LIFESPANS.map((l) => (
                <Chip key={l} active={lifespans.includes(l)} onClick={() => setLifespans((p) => toggle(p, l))}>
                  {l}
                </Chip>
              ))}
              <Chip active={hummingbird} onClick={() => setHummingbird((v) => !v)}>
                Hummingbirds
              </Chip>
              <Chip active={caterpillar} onClick={() => setCaterpillar((v) => !v)}>
                Caterpillar host
              </Chip>
            </FilterRow>
          </div>

          <div className="flex items-center justify-between text-sm text-muted">
            <span>
              <strong className="text-foreground">{filtered.length}</strong> of {plants.length} plants
            </span>
            {activeFilters > 0 && (
              <button onClick={clearAll} className="font-medium text-leaf hover:underline">
                Clear all filters
              </button>
            )}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-20 text-center text-muted">
          No plants match these filters. Try clearing a few.
        </p>
      ) : view === "cards" ? (
        <CardsView plants={filtered} />
      ) : (
        <TimelineView plants={filtered} />
      )}
    </div>
  );
}

function Header({ total }: { total: number }) {
  return (
    <header className="py-10 sm:py-14">
      <div className="flex items-center gap-2 text-sm font-medium text-leaf">
        <span aria-hidden>🐝</span> 2026 Bloom Calendar
      </div>
      <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
        Native Plants for Bees
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">
        {total} native plants organized by bloom season — so something is always
        flowering for the bees. Filter by season, light, soil, and plant type, or
        switch to the bloom timeline to plan year-round forage.
      </p>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
        <span><span aria-hidden>🐝</span> Bee value</span>
        <span><span aria-hidden>🐦</span> Supports hummingbirds</span>
        <span><span aria-hidden>🐛</span> Caterpillar host (number of species)</span>
      </div>
    </header>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-12 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </span>
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
  dot,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  dot?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors ${
        active
          ? "border-leaf bg-leaf text-white"
          : "border-border bg-card text-foreground hover:border-leaf"
      }`}
    >
      {dot && (
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: active ? "white" : dot }}
        />
      )}
      {children}
    </button>
  );
}

function ValueBadges({ plant }: { plant: Plant }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span title="Bee value" aria-hidden>🐝</span>
      {plant.hummingbird && <span title="Supports hummingbirds" aria-hidden>🐦</span>}
      {plant.caterpillar != null && (
        <span className="inline-flex items-center gap-0.5 text-muted" title={`Host to ${plant.caterpillar} caterpillar species`}>
          <span aria-hidden>🐛</span>
          {plant.caterpillar}
        </span>
      )}
    </div>
  );
}

function CardsView({ plants }: { plants: Plant[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {plants.map((p) => (
        <article
          key={p.common + p.scientific}
          className="group flex flex-col rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold leading-tight">{p.common}</h3>
              <p className="mt-0.5 text-sm italic text-muted">{p.scientific}</p>
            </div>
            <span
              className="mt-1 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium text-white"
              style={{ background: seasonColor(p.seasonKey) }}
            >
              {SEASONS.find((s) => s.key === p.seasonKey)?.short}
            </span>
          </div>

          <MiniBar start={p.bloomStart} end={p.bloomEnd} color={seasonColor(p.seasonKey)} />
          <p className="mt-1 text-xs text-muted">
            Blooms {p.bloom === "Late summer" || p.bloom === "Fall" ? p.bloom : monthRange(p.bloomStart, p.bloomEnd)}
          </p>

          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
            <Meta label="Type" value={p.type} />
            <Meta label="Height" value={p.height} />
            <Meta label="Light" value={p.light} />
            <Meta label="Soil" value={p.soil} />
            <Meta label="Lifespan" value={p.lifespan} />
          </dl>

          <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
            <ValueBadges plant={p} />
          </div>
        </article>
      ))}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function MiniBar({ start, end, color }: { start: number; end: number; color: string }) {
  return (
    <div className="mt-3 grid grid-cols-12 gap-px overflow-hidden rounded">
      {MONTH_LABELS.map((_, i) => {
        const m = i + 1;
        const on = m >= start && m <= end;
        return (
          <div
            key={i}
            className="h-2"
            style={{ background: on ? color : "var(--leaf-soft)" }}
          />
        );
      })}
    </div>
  );
}

function monthRange(start: number, end: number) {
  return start === end ? MONTH_FULL[start - 1] : `${MONTH_FULL[start - 1]}–${MONTH_FULL[end - 1]}`;
}

function TimelineView({ plants }: { plants: Plant[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <div className="min-w-[760px]">
        {/* Month header */}
        <div className="sticky top-0 grid grid-cols-[220px_repeat(12,1fr)] border-b border-border bg-card text-center text-xs font-semibold text-muted">
          <div className="px-4 py-2 text-left">Plant</div>
          {MONTH_FULL.map((m) => (
            <div key={m} className="py-2">{m}</div>
          ))}
        </div>
        {plants.map((p, idx) => (
          <div
            key={p.common + p.scientific}
            className={`grid grid-cols-[220px_repeat(12,1fr)] items-center ${
              idx % 2 ? "bg-leaf-soft/40" : ""
            }`}
          >
            <div className="px-4 py-2">
              <div className="truncate text-sm font-medium">{p.common}</div>
              <div className="truncate text-xs italic text-muted">{p.scientific}</div>
            </div>
            <div className="col-span-12 grid grid-cols-12 gap-px py-2 pr-3">
              <div
                className="flex h-5 items-center rounded-full"
                style={{
                  gridColumn: `${p.bloomStart} / ${p.bloomEnd + 1}`,
                  background: seasonColor(p.seasonKey),
                }}
                title={`${p.common}: ${monthRange(p.bloomStart, p.bloomEnd)}`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
