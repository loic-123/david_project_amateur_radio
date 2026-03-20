"use client";

import {
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import { solarZenithAngle } from "@/lib/propagation";

interface Props {
  lat: number;
  lon: number;
}

export default function SolarZenithChart({ lat, lon }: Props) {
  const now = new Date();

  const data = Array.from({ length: 24 }, (_, h) => {
    const time = new Date(now.getTime() + h * 3600000);
    const zenith = solarZenithAngle(lat, lon, time);
    const altitude = 90 - zenith;
    return {
      label: time.toISOString().slice(11, 16),
      altitude: Math.round(altitude * 10) / 10,
      zenith: Math.round(zenith * 10) / 10,
    };
  });

  return (
    <ResponsiveContainer width="100%" height={250}>
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
          domain={[-90, 90]}
          ticks={[-90, -45, 0, 45, 90]}
          label={{ value: "Sun altitude (°)", angle: -90, position: "insideLeft", fill: "#888" }}
        />
        <Tooltip
          contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
          labelStyle={{ color: "#9ca3af" }}
          formatter={(value) => [`${value}°`]}
        />
        {/* Night zone (below 0°) */}
        <ReferenceArea y1={-90} y2={0} fill="#1e1b4b" fillOpacity={0.3} />
        {/* Twilight zone (-6° to 0°) */}
        <ReferenceArea y1={-6} y2={0} fill="#312e81" fillOpacity={0.3} />
        {/* Horizon line */}
        <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="4 4" label={{ value: "Horizon", fill: "#6b7280", fontSize: 10 }} />
        {/* Now marker */}
        <ReferenceLine
          x={data[0]?.label}
          stroke="#f59e0b"
          strokeWidth={2}
          label={{ value: "NOW", position: "top", fill: "#f59e0b", fontSize: 10, fontWeight: "bold" }}
        />
        <Area
          type="monotone"
          dataKey="altitude"
          stroke="#f97316"
          fill="url(#altGradient)"
          strokeWidth={2}
        />
        <defs>
          <linearGradient id="altGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f97316" stopOpacity={0.3} />
            <stop offset="50%" stopColor="#f97316" stopOpacity={0.05} />
            <stop offset="100%" stopColor="#1e1b4b" stopOpacity={0.2} />
          </linearGradient>
        </defs>
      </ComposedChart>
    </ResponsiveContainer>
  );
}
