export interface SolarData {
  sfi: number;
  aIndex: number;
  kIndex: number;
  sunspots: number;
  updatedAt: string;
  source: "hamqsl" | "noaa";
}

export interface BandDef {
  name: string;
  minMHz: number;
  maxMHz: number;
  centerMHz: number;
  isLowBand: boolean;
  ft8MHz: number;
  cwMHz: number;
  ssbMHz: number;
  tip: string;
}

export type OperatingMode = "ssb" | "cw" | "ft8";
export type PowerLevel = "qrp" | "standard" | "high";

export type BandStatusLevel = "open" | "marginal" | "closed";
export type PropagationRating = "Excellent" | "Good" | "Fair" | "Poor";

export interface BandStatus {
  band: BandDef;
  status: BandStatusLevel;
  muf: number;
  fot: number;
  rating: PropagationRating;
  reason: string;
  recommendedFreq: number;
}

export interface QTHLocation {
  lat: number;
  lon: number;
  name?: string;
  gridSquare?: string;
}

export interface HourlyPropagation {
  hour: number;
  utcTime: string;
  muf: number;
  bandStatuses: BandStatus[];
}

export interface UserSettings {
  mode: OperatingMode;
  power: PowerLevel;
}
