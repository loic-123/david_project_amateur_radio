import { BandDef } from "@/types";

export const HF_BANDS: BandDef[] = [
  { name: "160m", minMHz: 1.800, maxMHz: 2.000, centerMHz: 1.900, isLowBand: true },
  { name: "80m",  minMHz: 3.500, maxMHz: 4.000, centerMHz: 3.750, isLowBand: true },
  { name: "40m",  minMHz: 7.000, maxMHz: 7.300, centerMHz: 7.150, isLowBand: false },
  { name: "30m",  minMHz: 10.100, maxMHz: 10.150, centerMHz: 10.125, isLowBand: false },
  { name: "20m",  minMHz: 14.000, maxMHz: 14.350, centerMHz: 14.175, isLowBand: false },
  { name: "17m",  minMHz: 18.068, maxMHz: 18.168, centerMHz: 18.118, isLowBand: false },
  { name: "15m",  minMHz: 21.000, maxMHz: 21.450, centerMHz: 21.225, isLowBand: false },
  { name: "12m",  minMHz: 24.890, maxMHz: 24.990, centerMHz: 24.940, isLowBand: false },
  { name: "10m",  minMHz: 28.000, maxMHz: 29.700, centerMHz: 28.850, isLowBand: false },
];
