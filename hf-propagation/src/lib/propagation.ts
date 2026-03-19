import SunCalc from "suncalc";
import {
  BandDef, BandStatus, BandStatusLevel, HourlyPropagation,
  OperatingMode, PowerLevel, PropagationRating, SolarData, UserSettings,
} from "@/types";
import { HF_BANDS } from "./bands";

/**
 * Mode advantage in dB relative to SSB.
 * FT8 can decode ~20dB below SSB, CW ~6dB below SSB.
 * We translate this to an effective MUF boost factor.
 */
const MODE_MUF_FACTOR: Record<OperatingMode, number> = {
  ssb: 1.0,    // baseline
  cw: 1.08,    // ~6dB advantage → MUF effectively 8% higher
  ft8: 1.20,   // ~20dB advantage → MUF effectively 20% higher
};

/**
 * Power margin: lower power needs stronger propagation.
 * Expressed as MUF reduction factor (need more margin from MUF).
 */
const POWER_MUF_FACTOR: Record<PowerLevel, number> = {
  high: 1.05,     // 1kW: can push closer to MUF
  standard: 1.0,  // 100W: baseline
  qrp: 0.90,      // 5W: need 10% more margin
};

export function solarZenithAngle(lat: number, lon: number, date: Date): number {
  const pos = SunCalc.getPosition(date, lat, lon);
  const zenithRad = Math.PI / 2 - pos.altitude;
  return zenithRad * (180 / Math.PI);
}

export function isDaytime(lat: number, lon: number, date: Date): boolean {
  return solarZenithAngle(lat, lon, date) < 90;
}

export function estimateFoF2(sfi: number, zenithDeg: number): number {
  if (zenithDeg >= 100) {
    return Math.max(1.5, 0.002 * sfi + 1.0);
  }
  if (zenithDeg >= 90) {
    const nightFoF2 = Math.max(1.5, 0.002 * sfi + 1.0);
    const dayEdge = 0.004 * sfi + 2.0 + 4.0 * Math.cos((89 * Math.PI) / 180);
    const t = (zenithDeg - 90) / 10;
    return nightFoF2 * t + Math.max(1.5, dayEdge) * (1 - t);
  }
  const cosZenith = Math.cos((zenithDeg * Math.PI) / 180);
  const foF2 = 0.004 * sfi + 2.0 + 4.0 * cosZenith;
  return Math.max(1.5, foF2);
}

export function calculateMUF(foF2: number): number {
  return foF2 / 0.2756;
}

export function calculateFOT(muf: number): number {
  return muf * 0.85;
}

export function propagationRating(sfi: number, kIndex: number, aIndex: number): PropagationRating {
  let score = 0;
  if (sfi >= 150) score += 3;
  else if (sfi >= 120) score += 2;
  else if (sfi >= 90) score += 1;
  if (kIndex >= 5) score -= 3;
  else if (kIndex >= 3) score -= 1;
  if (aIndex >= 30) score -= 2;
  else if (aIndex >= 10) score -= 1;
  if (score >= 3) return "Excellent";
  if (score >= 2) return "Good";
  if (score >= 1) return "Fair";
  return "Poor";
}

/**
 * Get the effective MUF adjusted for operating mode and power level.
 */
export function effectiveMUF(muf: number, settings: UserSettings): number {
  return muf * MODE_MUF_FACTOR[settings.mode] * POWER_MUF_FACTOR[settings.power];
}

/**
 * Get recommended frequency for a band based on operating mode.
 */
function getRecommendedFreq(band: BandDef, mode: OperatingMode): number {
  switch (mode) {
    case "ft8": return band.ft8MHz;
    case "cw": return band.cwMHz;
    case "ssb": return band.ssbMHz;
  }
}

export function getBandStatus(
  band: BandDef,
  muf: number,
  fot: number,
  zenithDeg: number,
  sfi: number,
  kIndex: number,
  aIndex: number,
  settings: UserSettings = { mode: "ssb", power: "standard" }
): BandStatus {
  const rating = propagationRating(sfi, kIndex, aIndex);
  const daytime = zenithDeg < 90;
  const recFreq = getRecommendedFreq(band, settings.mode);

  // Adjust MUF for mode and power
  const adjMuf = effectiveMUF(muf, settings);
  const adjFot = adjMuf * 0.85;

  if (band.isLowBand && daytime) {
    return {
      band, status: "closed", muf: adjMuf, fot: adjFot, rating,
      reason: "D-layer absorption during daytime",
      recommendedFreq: recFreq,
    };
  }

  let status: BandStatusLevel;
  let reason: string;

  if (band.centerMHz < adjFot) {
    status = "open";
    reason = `Band well below FOT (${adjFot.toFixed(1)} MHz)`;
  } else if (band.centerMHz < adjMuf) {
    status = "marginal";
    reason = `Band between FOT (${adjFot.toFixed(1)}) and MUF (${adjMuf.toFixed(1)} MHz)`;
  } else {
    status = "closed";
    reason = `Band above MUF (${adjMuf.toFixed(1)} MHz)`;
  }

  return { band, status, muf: adjMuf, fot: adjFot, rating, reason, recommendedFreq: recFreq };
}

export function getAllBandStatuses(
  lat: number, lon: number, date: Date, solar: SolarData,
  settings: UserSettings = { mode: "ssb", power: "standard" }
): BandStatus[] {
  const zenith = solarZenithAngle(lat, lon, date);
  const foF2 = estimateFoF2(solar.sfi, zenith);
  const muf = calculateMUF(foF2);
  const fot = calculateFOT(muf);
  return HF_BANDS.map((band) =>
    getBandStatus(band, muf, fot, zenith, solar.sfi, solar.kIndex, solar.aIndex, settings)
  );
}

export function compute24hPropagation(
  lat: number, lon: number, solar: SolarData,
  settings: UserSettings = { mode: "ssb", power: "standard" }
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
      getBandStatus(band, muf, fot, zenith, solar.sfi, solar.kIndex, solar.aIndex, settings)
    );
    results.push({ hour: h, utcTime: time.toISOString().slice(0, 16) + "Z", muf, bandStatuses });
  }
  return results;
}

/**
 * Extract band opening/closing times from 24h propagation data.
 */
export interface BandOpeningWindow {
  bandName: string;
  opensUTC: string | null;
  closesUTC: string | null;
  isOpenNow: boolean;
  isOpenAllDay: boolean;
  isClosedAllDay: boolean;
}

export function extractBandOpenings(hourly: HourlyPropagation[]): BandOpeningWindow[] {
  return HF_BANDS.map((band, bandIdx) => {
    const statuses = hourly.map((h) => h.bandStatuses[bandIdx]);
    const openHours = statuses.map((s, i) => ({ open: s.status !== "closed", time: hourly[i].utcTime }));

    const isOpenNow = openHours[0]?.open ?? false;
    const allOpen = openHours.every((h) => h.open);
    const allClosed = openHours.every((h) => !h.open);

    if (allOpen) {
      return { bandName: band.name, opensUTC: null, closesUTC: null, isOpenNow: true, isOpenAllDay: true, isClosedAllDay: false };
    }
    if (allClosed) {
      return { bandName: band.name, opensUTC: null, closesUTC: null, isOpenNow: false, isOpenAllDay: false, isClosedAllDay: true };
    }

    // Find first opening and first closing
    let opensUTC: string | null = null;
    let closesUTC: string | null = null;

    for (let i = 1; i < openHours.length; i++) {
      if (!openHours[i - 1].open && openHours[i].open && !opensUTC) {
        opensUTC = openHours[i].time.slice(11, 16);
      }
      if (openHours[i - 1].open && !openHours[i].open && !closesUTC) {
        closesUTC = openHours[i].time.slice(11, 16);
      }
    }

    return { bandName: band.name, opensUTC, closesUTC, isOpenNow, isOpenAllDay: false, isClosedAllDay: false };
  });
}

/**
 * Get sunrise, sunset, and grey line info for a location.
 */
export interface SunTimes {
  sunrise: Date;
  sunset: Date;
  nextGreyLine: Date;
  greyLineCountdown: string;
  isGreyLineNow: boolean;
}

export function getSunTimes(lat: number, lon: number, date: Date): SunTimes {
  const times = SunCalc.getTimes(date, lat, lon);
  const now = date.getTime();

  const sunrise = times.sunrise;
  const sunset = times.sunset;

  // Grey line = ~30 min around sunrise or sunset
  const greyLineWindowMs = 30 * 60000;
  const nearSunrise = Math.abs(now - sunrise.getTime()) < greyLineWindowMs;
  const nearSunset = Math.abs(now - sunset.getTime()) < greyLineWindowMs;
  const isGreyLineNow = nearSunrise || nearSunset;

  // Find next grey line event
  let nextGreyLine: Date;
  const sunriseStart = new Date(sunrise.getTime() - greyLineWindowMs / 2);
  const sunsetStart = new Date(sunset.getTime() - greyLineWindowMs / 2);

  if (sunriseStart.getTime() > now) {
    nextGreyLine = sunriseStart;
  } else if (sunsetStart.getTime() > now) {
    nextGreyLine = sunsetStart;
  } else {
    // Tomorrow's sunrise
    const tomorrow = new Date(date.getTime() + 86400000);
    const tomorrowTimes = SunCalc.getTimes(tomorrow, lat, lon);
    nextGreyLine = new Date(tomorrowTimes.sunrise.getTime() - greyLineWindowMs / 2);
  }

  const diffMs = nextGreyLine.getTime() - now;
  const hours = Math.floor(diffMs / 3600000);
  const minutes = Math.floor((diffMs % 3600000) / 60000);
  const greyLineCountdown = `${hours}h ${minutes}m`;

  return { sunrise, sunset, nextGreyLine, greyLineCountdown, isGreyLineNow };
}
