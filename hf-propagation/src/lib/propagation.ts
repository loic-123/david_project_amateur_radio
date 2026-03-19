import SunCalc from "suncalc";
import { BandDef, BandStatus, BandStatusLevel, HourlyPropagation, PropagationRating, SolarData } from "@/types";
import { HF_BANDS } from "./bands";

/**
 * Get solar zenith angle in degrees for a given location and time.
 */
export function solarZenithAngle(lat: number, lon: number, date: Date): number {
  const pos = SunCalc.getPosition(date, lat, lon);
  // pos.altitude is in radians, measured from horizon
  const zenithRad = Math.PI / 2 - pos.altitude;
  return zenithRad * (180 / Math.PI);
}

/**
 * Check if it's daytime at the given location.
 */
export function isDaytime(lat: number, lon: number, date: Date): boolean {
  return solarZenithAngle(lat, lon, date) < 90;
}

/**
 * Estimate F2 layer critical frequency (foF2) from SFI and solar zenith angle.
 * Empirical approximation — not as accurate as IRI-2020 but sufficient for
 * directional guidance on band openings.
 */
export function estimateFoF2(sfi: number, zenithDeg: number): number {
  if (zenithDeg >= 100) {
    // Deep nighttime: residual ionization only
    return Math.max(1.5, 0.002 * sfi + 1.0);
  }
  if (zenithDeg >= 90) {
    // Twilight transition: interpolate between day and night
    const nightFoF2 = Math.max(1.5, 0.002 * sfi + 1.0);
    const dayEdge = 0.004 * sfi + 2.0 + 4.0 * Math.cos((89 * Math.PI) / 180);
    const t = (zenithDeg - 90) / 10; // 0 at 90°, 1 at 100°
    return nightFoF2 * t + Math.max(1.5, dayEdge) * (1 - t);
  }
  // Daytime
  const cosZenith = Math.cos((zenithDeg * Math.PI) / 180);
  const foF2 = 0.004 * sfi + 2.0 + 4.0 * cosZenith;
  return Math.max(1.5, foF2);
}

/**
 * Calculate Maximum Usable Frequency for a ~3000km path.
 * MUF = foF2 / cos(incidence angle)
 * For 3000km, incidence angle ≈ 74°, cos(74°) ≈ 0.2756
 */
export function calculateMUF(foF2: number): number {
  return foF2 / 0.2756;
}

/**
 * Frequency of Optimum Traffic — 85% of MUF (ITU standard).
 */
export function calculateFOT(muf: number): number {
  return muf * 0.85;
}

/**
 * Assess overall propagation conditions from solar indices.
 */
export function propagationRating(sfi: number, kIndex: number, aIndex: number): PropagationRating {
  let score = 0;

  // SFI scoring (higher = better ionization)
  if (sfi >= 150) score += 3;
  else if (sfi >= 120) score += 2;
  else if (sfi >= 90) score += 1;

  // K-index penalty (lower = quieter geomagnetic field)
  if (kIndex >= 5) score -= 3;
  else if (kIndex >= 3) score -= 1;

  // A-index penalty
  if (aIndex >= 30) score -= 2;
  else if (aIndex >= 10) score -= 1;

  if (score >= 3) return "Excellent";
  if (score >= 2) return "Good";
  if (score >= 1) return "Fair";
  return "Poor";
}

/**
 * Determine the status of a single band given current MUF and solar conditions.
 */
export function getBandStatus(
  band: BandDef,
  muf: number,
  fot: number,
  zenithDeg: number,
  sfi: number,
  kIndex: number,
  aIndex: number
): BandStatus {
  const rating = propagationRating(sfi, kIndex, aIndex);
  const daytime = zenithDeg < 90;

  // Low bands (160m, 80m): blocked by D-layer absorption during daytime
  if (band.isLowBand && daytime) {
    return {
      band,
      status: "closed",
      muf,
      fot,
      rating,
      reason: "D-layer absorption during daytime",
    };
  }

  let status: BandStatusLevel;
  let reason: string;

  if (band.centerMHz < fot) {
    status = "open";
    reason = `Band well below FOT (${fot.toFixed(1)} MHz)`;
  } else if (band.centerMHz < muf) {
    status = "marginal";
    reason = `Band between FOT (${fot.toFixed(1)}) and MUF (${muf.toFixed(1)} MHz)`;
  } else {
    status = "closed";
    reason = `Band above MUF (${muf.toFixed(1)} MHz)`;
  }

  return { band, status, muf, fot, rating, reason };
}

/**
 * Get status for all bands at a given moment.
 */
export function getAllBandStatuses(
  lat: number,
  lon: number,
  date: Date,
  solar: SolarData
): BandStatus[] {
  const zenith = solarZenithAngle(lat, lon, date);
  const foF2 = estimateFoF2(solar.sfi, zenith);
  const muf = calculateMUF(foF2);
  const fot = calculateFOT(muf);

  return HF_BANDS.map((band) =>
    getBandStatus(band, muf, fot, zenith, solar.sfi, solar.kIndex, solar.aIndex)
  );
}

/**
 * Compute MUF and band statuses for each hour over the next 24 hours.
 */
export function compute24hPropagation(
  lat: number,
  lon: number,
  solar: SolarData
): HourlyPropagation[] {
  const now = new Date();
  const results: HourlyPropagation[] = [];

  for (let h = 0; h < 24; h++) {
    const time = new Date(now.getTime() + h * 3600000);
    const zenith = solarZenithAngle(lat, lon, time);
    const foF2 = estimateFoF2(solar.sfi, zenith);
    const muf = calculateMUF(foF2);
    const fot = calculateFOT(muf);

    const bandStatuses = HF_BANDS.map((band) =>
      getBandStatus(band, muf, fot, zenith, solar.sfi, solar.kIndex, solar.aIndex)
    );

    results.push({
      hour: h,
      utcTime: time.toISOString().slice(0, 16) + "Z",
      muf,
      bandStatuses,
    });
  }

  return results;
}
