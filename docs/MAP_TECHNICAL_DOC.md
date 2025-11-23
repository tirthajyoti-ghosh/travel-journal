# Map Technical Design & Implementation Guide

**Interactive illustrated map with unlockable regions, polaroid pins, zoom/pan, doodles, and cloud→notebook transitions**

This document collects research, libraries, implementation patterns, code snippets, data models, asset/tooling requirements, known caveats, and a staged plan so you can implement the illustrated map exactly as we discussed.

---

# Contents

1. Goals & feature checklist
2. Libraries & tools (what to use and why)
3. Data model (regions, stories, pins)
4. Asset pipeline (SVG/TopoJSON/PNG conversion & tools)
5. High-level architecture & component breakdown
6. Key implementation patterns & code samples
7. UX & animation notes (clouds, zoom, transitions)
8. Lock / unlock strategy & persistence
9. Marker (pin) placement and scaling on zoom
10. Doodles, decorative layers, and layering strategy
11. Performance, accessibility & test considerations
12. Hosting, build & CI considerations
13. Caveats & tradeoffs (what to watch out for)
14. Step-by-step implementation plan (phases)
15. Useful tools & resources

---

# 1 — Goals & feature checklist

Implement an illustrated, SVG/Canvas-based interactive map that supports:

* SVG-based base map (illustrated watercolor style)
* Smooth pan & zoom (user-controlled) constrained to allowed extents
* Clickable regions (continent/country/region) with lock/unlock visuals
* City-level pins (polaroid-style markers) placed accurately using coordinates
* Marker clustering / stacking for multiple stories per city
* Visual lock/unlock animations (color wash, doodle outline)
* Decorative doodle layers and overlays (icons, paths) on top of map
* Polaroid → cloud → notebook transition on pin click
* Programmatic zoom-to-city / focus / centering
* Option to swap from programmatic Topo/GeoJSON to pure illustrated SVG if desired
* Persisted unlock state (local or remote) and story metadata storage

---

# 2 — Libraries & tools (what to use and why)

## Core map libraries

**Primary recommendation: `react-simple-maps`**

* Renders geographies as SVG `<path>` elements (Geography component).
* Built-in `ZoomableGroup` for pan/zoom and `Marker` for lat/lon markers.
* Works with TopoJSON / GeoJSON world/region shapes.
* Pros: SVG output (styleable), easy markers, projection-aware, React-friendly.

Useful packages:

* `react-simple-maps` — map rendering
* `d3-geo` — projections if needed
* `topojson-client` — if converting/extracting topologies

**Alternative (if full artistic SVG is required): `react-svg-pan-zoom`**

* Use when you want to import a fully hand-painted single SVG and manage zoom/pan on that.
* Pros: pixel-perfect art fidelity.
* Cons: no geospatial coordinate system; you must manage x/y mapping for pins.

**Advanced / custom option: `d3` + TopoJSON**

* Full power and control; steeper learning curve. Use if you need custom projection math or advanced geospatial ops.

## Animation & UX

* `framer-motion` — animations, transitions, cloud motion, pin lifts.
* CSS transitions for simple fades and transforms.

## Asset & conversion tools

* **Figma / Illustrator / Inkscape** — draw/export SVG map and region paths.
* **mapshaper** — convert SVG to GeoJSON/TopoJSON or edit TopoJSON shapes.
* **TopoJSON CLI / GDAL** — convert shapefiles if needed.
* `svgo` — optimize SVG files.
* `imagemin` / WebP — compress raster textures (watercolor PNGs).

## Data storage

* Local JSON files during prototype (stories/regions.json).
* Optional backend: lightweight DB (Supabase / Firestore) for persisted unlocks and story metadata if you want sync across devices.

---

# 3 — Data model (suggested JSON schema)

Store story & map data in a small JSON model (or DB table). Examples:

```jsonc
// regions.json
{
  "regions": {
    "se_asia": {
      "id": "se_asia",
      "name": "Southeast Asia",
      "center": [100.0, 15.0],
      "zoomDefault": 3.2,
      "unlocked": true
    },
    "india": {
      "id": "india",
      "name": "India",
      "center": [78.9629, 20.5937],
      "zoomDefault": 3.1,
      "unlocked": false
    }
  }
}
```

```jsonc
// stories.json (or as frontmatter inside story markdown)
[
  {
    "id": "bangkok-morning",
    "title": "Slow Morning in Bangkok",
    "date": "2025-03-28",
    "region": "se_asia",
    "location": "Bangkok",
    "coordinates": [100.5018, 13.7563],
    "coverUrl": "https://photos.app.goo.gl/abc",
    "albumShareUrl": "https://photos.app.goo.gl/abcd",
    "slug": "2025-03-28-bangkok-morning",
    "unlocked": true
  }
]
```

Note: coordinates are `[longitude, latitude]` (geo order) for `react-simple-maps`.

---

# 4 — Asset pipeline: SVG / TopoJSON / PNG

You’ll likely iterate between art and code. Recommended pipeline:

1. **Design map art** in Illustrator/Figma/Procreate: create layers for land, water, borders, doodles, icons. Keep vector shapes for regions as paths if possible.
2. **Export an SVG** with named `<path id="region_id">` for regions. If you keep geo-like shapes, you can convert these to TopoJSON using mapshaper or manually create GeoJSON polygon approximations.
3. **If using react-simple-maps**, prefer TopoJSON/GeoJSON. Use `mapshaper` to convert SVG → GeoJSON → TopoJSON:

   * `mapshaper map.svg -simplify dp 5% -o format=topojson world-topo.json`
   * Or prepare world 110m topo and style it to match your palette.
4. **Textures** (watercolor grain) — export raster layers (PNG/WebP) to overlay or use as SVG `<pattern>` fills. Keep them lightweight (<=200KB ideally).
5. **Optimize** with `svgo` and `imagemin`.

If you choose to use fully artistic SVG without geodata, store the mapping of pin positions as percentages relative to the SVG `viewBox` (or pixel coordinates normalized to `viewBox`).

---

# 5 — High-level architecture & component breakdown

### Key UI components

* `MapScene` — root map component (ComposableMap wrapper)
* `Region` — visual geometry / Geography wrapper (handles lock/unlock style)
* `PinMarker` — polaroid pin component (renders SVG/IMG, handles click)
* `DoodleLayer` — decorative SVG layer for icons and paths
* `CloudOverlay` — cloud animation + loading surface
* `MapControls` — optional zoom in/out, reset center (minimal UI)
* `MapStateProvider` — context for zoom, center, selectedPin, regionLock state

### Data flow

* Map loads Geo/TopoJSON + `regions.json` + `stories.json`
* `MapScene` renders `Geographies` for each region; applies styling based on `regions[regionId].unlocked`
* `PinMarker`s created for stories whose region is unlocked (or optionally shown as ghost pins).
* Interaction triggers: `onPinClick` → center map/animate zoom → show `CloudOverlay` → navigate to notebook

### Storage

* Local file-based for content (Markdown + frontmatter).
* Unlock state persisted to localStorage, or to remote DB (optional).

---

# 6 — Key implementation patterns & code samples

Below are practical examples (React + `react-simple-maps`) you can copy/paste and adapt.

## Basic ComposableMap with ZoomableGroup + Geographies

```jsx
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps";
const GEO_URL = "/data/world-110m.json";

export default function MapScene({ regionsState, pins, onPinClick }) {
  return (
    <ComposableMap projection="geoMercator" projectionConfig={{ scale: 160 }}>
      <ZoomableGroup zoom={1.5} center={[100, 15]}>
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map(geo => {
              const id = geo.properties.NAME_LONG || geo.properties.iso_a3;
              const isLocked = regionsState[id]?.unlocked === false; // adapt mapping
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  style={{
                    default: { fill: isLocked ? "#E8E8E8" : "#cfe8d6", outline: "none" },
                    hover: { fill: "#f7d7c1" },
                    pressed: { fill: "#f0b7a0" },
                  }}
                />
              );
            })
          }
        </Geographies>

        {pins.map(pin => (
          <Marker key={pin.id} coordinates={pin.coordinates}>
            <g onClick={() => onPinClick(pin)} style={{ cursor: 'pointer' }}>
              <image href="/assets/polaroid.svg" width={48} height={48} />
            </g>
          </Marker>
        ))}
      </ZoomableGroup>
    </ComposableMap>
  );
}
```

## Zoom-to-city (programmatic center & zoom)

Keep `zoom` & `center` in state and update on pin click:

```jsx
function MapWithControl() {
  const [center, setCenter] = useState([100, 15]);
  const [zoom, setZoom] = useState(2);

  function goToCity(coords) {
    setCenter(coords);
    setZoom(6); // adjust per desired closeness
  }

  return (
    <ComposableMap>
      <ZoomableGroup center={center} zoom={zoom}>
        {/* ... */}
      </ZoomableGroup>
    </ComposableMap>
  );
}
```

## Keep markers visually constant via inverse scaling

```jsx
import { useZoomPanContext } from "react-simple-maps";

function ScaledPin({ coords }) {
  const { state } = useZoomPanContext();
  const scale = 1 / state.k; // `k` is zoom level
  return (
    <Marker coordinates={coords}>
      <g transform={`scale(${scale}) translate(-24,-24)`}>
        <image href="/assets/polaroid.svg" width={48} height={48} />
      </g>
    </Marker>
  );
}
```

## Lock / Unlock a region (trigger & animation)

* Toggle `regions[regionId].unlocked` in state.
* Use `className` or `style` prop to animate fill transition (CSS `transition` or `framer-motion`).

```css
.region-locked { filter: grayscale(100%); opacity: 0.6; transition: opacity .8s, filter .8s; }
.region-unlocked { filter: none; opacity: 1; transition: opacity .8s, filter .8s; }
```

---

# 7 — UX & animation notes (clouds, zoom, transitions)

## Cloud overlay

* Implement as an absolutely-positioned SVG or Canvas `<g>` above the map.
* Use multiple cloud layers (three layers) moving at different speeds for parallax.
* Use `framer-motion` for subtle drifting looped animation. Keep animation performant (CSS transforms).

## Transition sequence (recommended)

1. On `onPinClick`: temporarily disable pan gestures.
2. Animate map center/zoom to pin (`setCenter`, `setZoom`).
3. Play small pin pop animation (scale up + shadow).
4. Fade in clouds (`CloudOverlay` opacity 0 → 1).
5. When cloud cover completes (~700–1000ms), navigate to notebook page (or render notebook overlay).
6. Notebook loads; clouds animate away to reveal the notebook.

Note: keep durations long and gentle (400–900ms) to maintain cozy feel and avoid motion sickness.

---

# 8 — Lock / unlock strategy & persistence

## Display rules

* `region.unlocked === true` → region colored + pins shown (full interactivity)
* `region.unlocked === false` → region desaturated/blurred + pins hidden (or dim ghost pins)
* Attempt to zoom into a locked region → show a soft “bounce” and a doodle lock tooltip (“This region is locked. Add a story here to unlock.”)

## Persistence

* **Local-first**: store unlocks in `localStorage` (useful for solo dev/test).
* **Remote** (recommended for durable): store in a small DB (Supabase / Firebase / your own endpoint) keyed by user/app id. When you publish a story in a region, set region unlocked in the DB and sync state across devices.

---

# 9 — Pin placement & scaling details

## Placement accuracy

* With `react-simple-maps` you place markers by true `[lon, lat]` coordinates. Accuracy will be good if map projection matches coordinates (use `geoMercator` or another projection as appropriate).
* If you use a pure illustrated SVG (not geo-aware), convert city positions into percentages relative to SVG `viewBox` or record pixel coordinates in design tool.

## Stacking multiple pins

* If multiple stories exist near the same coordinates, stack polaroids with small offsets:

  * use `offset = (index * 6)`, translate by `x` & `y`.
  * add a small z-index order based on story date or priority.

## Marker sizing vs zoom

* Use inverse scale technique shown earlier to keep pins visually similar across zoom levels — or let them scale for dramatic effect.

---

# 10 — Doodles & decorative layers

Where to render them:

* Put doodles inside the `ComposableMap` as an additional `<g>` layer after `Geographies` but before `Markers`, or after markers depending on desired overlap:

  * doodles behind pins = draw doodles before markers
  * doodles on top = draw after markers
* Doodles can be simple SVG icons (path) or small grouped SVGs with `opacity: 0.15` to keep them subtle.
* Animate doodles on unlock: stroke-draw animation (SVG stroke-dashoffset) to "hand-draw" a border.

---

# 11 — Performance, accessibility & tests

## Performance

* Use TopoJSON simplified (e.g., world-110m or simplified custom topo) — smaller payloads.
* Lazy-load map data and defer heavy doodle/texture layers on slow networks.
* Use `will-change: transform` and GPU-friendly CSS transforms for pan/zoom.
* Keep cloud animation simple and GPU-accelerated (transform/opacity only).

## Accessibility

* Provide keyboard focus and aria labels for pin elements:

  * `<g role="button" aria-label="Open story: Slow Morning in Bangkok" tabindex="0">`
* Provide a textual list fallback (hidden visually or accessible via menubar) so screen readers can access stories and regions.
* Avoid rapid motion; allow users to reduce motion via OS preference (`prefers-reduced-motion`).

## Testing

* Unit test mapping of coordinates → screen positions.
* Visual regression tests (Chromatic / Percy) for map layout and doodles.
* E2E tests for click flows (Cypress / Playwright): pin click → cloud animation → notebook page.

---

# 12 — Hosting, builds & CI

* Next.js site deployed to Vercel (static + client-side map interactions).
* Include map assets in repo (`/public/maps/`) or host in CDN for performance.
* CI jobs:

  * Validate that TopoJSON loads and `regions.json` is valid (node script).
  * Run `next build` to ensure map pages compile.
* Consider caching large TopoJSON/GeoJSON files using CDN.

---

# 13 — Caveats & tradeoffs

* **Converting hand-painted SVG to TopoJSON**: If you want exact illustrated art as interactive geography, converting freeform vector art into valid GeoJSON might be manual and imprecise. Alternative: keep illustrated SVG and map pin positions as normalized coordinates.
* **Marker scaling**: keeping marker size constant across zoom requires an inverse scale calculation and reading internal zoom state.
* **Large TopoJSON files**: world datasets can be heavy. Use simplified TopoJSON (mapshaper).
* **Client performance**: heavy SVG with many paths and animations can slow down on low-end devices. Keep simplified shapes and lazy-load embellishments.
* **Projection distortion**: map projection affects where coordinates appear. Use appropriate projection (e.g., `geoMercator`) and test pin placement.

---

# 14 — Implementation plan (phased)

## Phase 0 — Prototype (1–3 days)

* Install `react-simple-maps`, `d3-geo`.
* Render `ComposableMap` with world-110m topo and `ZoomableGroup`.
* Add sample `Marker` components for 5 cities.
* Implement `center` + `zoom` state and `goToCity()` function.
* Minimal locked/unlocked style toggle.

## Phase 1 — Styling & UX (3–7 days)

* Replace default fills with parchment palette.
* Add simple doodle SVGs and background watercolor texture.
* Implement polaroid marker visuals and click → cloud overlay skeleton.
* Implement inverse-scale logic for marker size on zoom.

## Phase 2 — Art pipeline & swap (7–14 days)

* Create an illustrated SVG or modified TopoJSON that matches your art direction.
* Use `mapshaper` / Illustrator to produce a TopoJSON if you want geo coords.
* Fine-tune pin coordinates for cities in the art.
* Add unlock animation (doodle outline draw & color wash).

## Phase 3 — Polishing & persistence (7+ days)

* Persist unlocks to a small DB.
* Add accessibility, tests, and performance optimizations.
* Implement final notebook transition and cloud animation polish.

---

# 15 — Useful tools & resources

* **react-simple-maps** — [https://www.react-simple-maps.io/](https://www.react-simple-maps.io/) (docs & examples)
* **d3-geo** — [https://github.com/d3/d3-geo](https://github.com/d3/d3-geo)
* **react-svg-pan-zoom** — [https://github.com/chrvadala/react-svg-pan-zoom](https://github.com/chrvadala/react-svg-pan-zoom)
* **mapshaper** — [https://mapshaper.org/](https://mapshaper.org/) (convert and simplify geo/svg files)
* **TopoJSON** — [https://github.com/topojson/topojson](https://github.com/topojson/topojson)
* **svgo** — [https://github.com/svg/svgo](https://github.com/svg/svgo) (optimize SVG)
* **Figma / Illustrator / Inkscape** — for map/vector editing
* **Framer Motion** — [https://www.framer.com/motion/](https://www.framer.com/motion/) (animations)
* **map-110m TopoJSON** (public world topo) — e.g., Natural Earth via topojson examples

---

## Final recommendation (short)

Start with **react-simple-maps** and TopoJSON for the first prototype: it gives projection-based, coordinate-accurate pins, built-in zoom/pan, and easy styling of geographies. Layer doodles and cloud overlays with SVG and Framer Motion. If/when you need pixel-perfect painted art, either convert the artwork to GeoJSON/TopoJSON (if acceptable) or switch to an SVG-pan library and map pins via normalized SVG positions.

