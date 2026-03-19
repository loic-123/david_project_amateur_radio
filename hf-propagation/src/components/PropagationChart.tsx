"use client";

import {
  ComposedChart,
  Area,
  ReferenceLine,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { HourlyPropagation } from "@/types";
import { HF_BANDS } from "@/lib/bands";

const BAND_COLORS: Record<string, string> = {
  "160m": "#8B0000",
  "80m": "#FF4500",
  "40m": "#FF8C00",
  "30m": "#FFD700",
  "20m": "#32CD32",
  "17m": "#00CED1",
  "15m": "#1E90FF",
  "12m": "#8A2BE2",
  "10m": "#FF1493",
};

interface Props {
  data: HourlyPropagation[];
}

export default function PropagationChart({ data }: Props) {
  const nowLabel = data[0]?.utcTime.slice(11, 16) ?? "";

  const chartData = data.map((d) => ({
    label: d.utcTime.slice(11, 16),
    muf: Math.round(d.muf * 10) / 10,
  }));

  return (
    <ResponsiveContainer width="100%" height={350}>
      <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
          domain={[0, 35]}
          label={{ value: "MHz", angle: -90, position: "insideLeft", fill: "#888" }}
        />
        <Tooltip
          contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
          labelStyle={{ color: "#9ca3af" }}
          itemStyle={{ color: "#60a5fa" }}
          formatter={(value) => [`${value} MHz`, "MUF"]}
        />
        {/* "Now" marker */}
        <ReferenceLine
          x={nowLabel}
          stroke="#f59e0b"
          strokeWidth={2}
          strokeDasharray="none"
          label={{ value: "NOW", position: "top", fill: "#f59e0b", fontSize: 11, fontWeight: "bold" }}
        />
        <Area
          type="monotone"
          dataKey="muf"
          stroke="#3b82f6"
          fill="url(#mufGradient)"
          strokeWidth={2}
        />
        <defs>
          <linearGradient id="mufGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        {HF_BANDS.map((band) => (
          <ReferenceLine
            key={band.name}
            y={band.centerMHz}
            stroke={BAND_COLORS[band.name]}
            strokeDasharray="4 4"
            strokeOpacity={0.7}
            label={{
              value: band.name,
              position: "right",
              fill: BAND_COLORS[band.name],
              fontSize: 10,
            }}
          />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
