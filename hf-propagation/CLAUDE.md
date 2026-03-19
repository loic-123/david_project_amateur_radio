# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HF Propagation is a web app that calculates optimal amateur radio band propagation for all 9 HF bands (160m–10m). It fetches real-time solar data, shows a day/night world map, 24h MUF forecast chart, and includes a location picker. No database, no user accounts.

## Commands

```bash
npm run dev      # Start dev server on localhost:3000
npm run build    # Production build (also runs TypeScript check)
```

No tests yet. No linting configured.

## Tech Stack

- **Next.js 16** (App Router, TypeScript, Tailwind CSS v4)
- **Deployed on Vercel** — the `/api/solar` route is a serverless function
- Zero external API keys required

### Key Dependencies

- `leaflet` + `react-leaflet` — world map (must use `next/dynamic` with `ssr: false`)
- `recharts` — 24h propagation chart
- `suncalc` — solar position calculations
- `fast-xml-parser` — parse HAMQSL XML feed server-side

## Architecture

### Data Flow

1. **`/api/solar` route** (`src/app/api/solar/route.ts`) proxies solar data from HAMQSL XML feed (primary) or NOAA SWPC JSON (fallback). Cached for 5 minutes via `Cache-Control`.
2. **`propagation.ts`** (`src/lib/propagation.ts`) contains all propagation math: solar zenith angle (via suncalc), foF2 estimation, MUF/FOT calculation, band status determination. All functions are pure.
3. **`page.tsx`** fetches `/api/solar` on mount and every 5 minutes, passes data to components, recalculates band statuses when solar data or location changes.

### Propagation Model

- foF2 estimated empirically from SFI + solar zenith angle
- MUF = foF2 / cos(74°) for ~3000km path
- FOT = MUF × 0.85 (ITU standard)
- Band open if center freq < FOT, marginal if < MUF, closed otherwise
- Low bands (160m, 80m) forced closed during daytime (D-layer absorption)

### Key Files

- `src/lib/propagation.ts` — Core propagation engine, all band calculations
- `src/lib/solar-fetch.ts` — Server-side data fetching (HAMQSL + NOAA fallback)
- `src/lib/bands.ts` — Band definitions (frequency ranges, properties)
- `src/components/WorldMap.tsx` — Leaflet map with day/night terminator (no SSR)
- `src/components/PropagationChart.tsx` — Recharts MUF curve with band reference lines
- `src/lib/storage.ts` — localStorage for user location + Maidenhead grid conversion

### Important Patterns

- `WorldMap` must be loaded with `next/dynamic` + `ssr: false` (Leaflet needs `window`)
- Leaflet CSS is imported in `globals.css`
- Location is stored in browser localStorage (key: `hf-prop-qth`), no backend persistence
- The HAMQSL XML feed often has `<muf>` as "NoRpt", so we compute MUF ourselves
