# HF Propagation

Real-time HF amateur radio band propagation calculator for all 9 HF bands (160m–10m).

## Features

- **Real-time solar data** — SFI, K-index, A-index, sunspots from HAMQSL/NOAA
- **Band conditions table** — Open/Marginal/Closed status for all HF bands
- **Day/night world map** — Leaflet map with live terminator overlay
- **24h MUF forecast** — Chart showing predicted Maximum Usable Frequency
- **Location picker** — Search by city, click on map, or use browser geolocation

## Tech Stack

- Next.js 16 (TypeScript, Tailwind CSS)
- Leaflet + react-leaflet (map)
- Recharts (charts)
- suncalc (solar position math)
- Deployed on Vercel

## Getting Started

```bash
cd hf-propagation
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How It Works

The app fetches live solar indices and uses an empirical propagation model:

1. Solar zenith angle calculated from your location and current UTC time
2. F2 layer critical frequency (foF2) estimated from SFI + zenith angle
3. MUF = foF2 / cos(74°) for a ~3000km path
4. FOT (optimal frequency) = MUF × 85%
5. Each band compared against MUF/FOT to determine open/marginal/closed

Low bands (160m, 80m) are marked closed during daytime due to D-layer absorption.
