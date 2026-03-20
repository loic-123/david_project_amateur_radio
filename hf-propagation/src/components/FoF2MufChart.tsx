"use client";

import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";
import { solarZenithAngle, estimateFoF2, calculateMUF, calculateFOT, effectiveMUF } from "@/lib/propagation";
import { SolarData, UserSettings } from "@/types";

interface Props {
  lat: number;
  lon: number;
  solar: SolarData;
  settings: UserSettings;
}

export default function FoF2MufChart({ lat, lon, solar, settings }: Props) {
  const now = new Date();

  const data = Array.from({ length: 24 }, (_, h) => {
    const time = new Date(now.getTime() + h * 3600000);
    const zenith = solarZenithAngle(lat, lon, time);
    const foF2 = estimateFoF2(solar.sfi, zenith);
    const muf = calculateMUF(foF2);
    const adjMuf = effectiveMUF(muf, settings);
    const fot = adjMuf * 0.85;
    return {
      label: time.toISOString().slice(11, 16),
      foF2: Math.round(foF2 * 10) / 10,
      muf: Math.round(adjMuf * 10) / 10,
      fot: Math.round(fot * 10) / 10,
    };
  });

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
        <XAxis
          dataKey="label"
          stroke="#888"
          tick={{ fontSize: 11 }}
          label={{ value: "UTC", position: "insideBottomRight", offset: -5, fill: "#888" }}
        />
        <YAxis
          stroke="#888"
          tick={{ fontSize: 11 }}
          domain={[0, "auto"]}
          label={{ value: "MHz", angle: -90, position: "insideLeft", fill: "#888" }}
        />
        <Tooltip
          contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
          labelStyle={{ color: "#9ca3af" }}
          formatter={(value) => [`${value} MHz`]}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, color: "#9ca3af" }}
          formatter={(value) => value === "foF2" ? "foF2 (critical freq)" : value === "muf" ? "MUF (max usable)" : "FOT (optimum)"}
        />
        {/* Now marker */}
        <ReferenceLine
          x={data[0]?.label}
          stroke="#f59e0b"
          strokeWidth={2}
          label={{ value: "NOW", position: "top", fill: "#f59e0b", fontSize: 10, fontWeight: "bold" }}
        />
        {/* FOT area (usable zone) */}
        <Area type="monotone" dataKey="fot" stroke="none" fill="#22c55e" fillOpacity={0.1} />
        <Line type="monotone" dataKey="foF2" stroke="#a78bfa" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="muf" stroke="#ef4444" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="fot" stroke="#22c55e" strokeWidth={2} strokeDasharray="5 5" dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
