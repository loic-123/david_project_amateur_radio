import { XMLParser } from "fast-xml-parser";
import { SolarData } from "@/types";

const HAMQSL_URL = "https://www.hamqsl.com/solarxml.php";
const NOAA_K_URL = "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json";
const NOAA_FLUX_URL = "https://services.swpc.noaa.gov/json/f107_cm_flux.json";

/**
 * Fetch solar data from HAMQSL XML feed (primary source).
 */
async function fetchHAMQSL(): Promise<SolarData> {
  const res = await fetch(HAMQSL_URL, {
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`HAMQSL HTTP ${res.status}`);
  const xml = await res.text();

  const parser = new XMLParser();
  const parsed = parser.parse(xml);
  const data = parsed?.solar?.solardata;
  if (!data) throw new Error("Invalid HAMQSL XML structure");

  return {
    sfi: Number(data.solarflux) || 0,
    aIndex: Number(data.aindex) || 0,
    kIndex: Number(data.kindex) || 0,
    sunspots: Number(data.sunspots) || 0,
    updatedAt: String(data.updated || new Date().toISOString()),
    source: "hamqsl",
  };
}

/**
 * Fetch solar data from NOAA SWPC JSON endpoints (fallback).
 */
async function fetchNOAA(): Promise<SolarData> {
  const [kRes, fluxRes] = await Promise.all([
    fetch(NOAA_K_URL, { signal: AbortSignal.timeout(5000) }),
    fetch(NOAA_FLUX_URL, { signal: AbortSignal.timeout(5000) }),
  ]);

  if (!kRes.ok) throw new Error(`NOAA K-index HTTP ${kRes.status}`);
  if (!fluxRes.ok) throw new Error(`NOAA flux HTTP ${fluxRes.status}`);

  const kData = await kRes.json();
  const fluxData = await fluxRes.json();

  // K-index JSON: array of arrays, first row is headers, last row is latest
  // Format: [timestamp, Kp, Kp_int, ap]
  const latestK = kData[kData.length - 1];
  const kIndex = Number(latestK?.[2]) || 0;
  const aIndex = Number(latestK?.[3]) || 0;

  // Flux JSON: array of objects with "flux" field, last entry is latest
  const latestFlux = fluxData[fluxData.length - 1];
  const sfi = Number(latestFlux?.flux) || 0;

  return {
    sfi,
    aIndex,
    kIndex,
    sunspots: 0, // NOAA endpoints don't provide sunspot number in these feeds
    updatedAt: new Date().toISOString(),
    source: "noaa",
  };
}

/**
 * Fetch solar data, trying HAMQSL first, falling back to NOAA.
 */
export async function fetchSolarData(): Promise<SolarData> {
  try {
    return await fetchHAMQSL();
  } catch {
    return await fetchNOAA();
  }
}
