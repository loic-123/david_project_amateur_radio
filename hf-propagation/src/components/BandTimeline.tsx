"use client";

import { HourlyPropagation } from "@/types";
import { HF_BANDS } from "@/lib/bands";

const BAND_COLORS: Record<string, string> = {
  "160m": "#991b1b",
  "80m": "#ea580c",
  "40m": "#d97706",
  "30m": "#ca8a04",
  "20m": "#16a34a",
  "17m": "#0891b2",
  "15m": "#2563eb",
  "12m": "#7c3aed",
  "10m": "#db2777",
};

interface Props {
  data: HourlyPropagation[];
}

export default function BandTimeline({ data }: Props) {
  if (data.length === 0) return null;

  const totalHours = data.length;

  return (
    <div className="space-y-2">
      {/* Hour axis */}
      <div className="flex ml-14">
        {data.map((h, i) => (
          <div key={i} className="flex-1 text-center text-[9px] text-gray-500">
            {i % 3 === 0 ? h.utcTime.slice(11, 16) : ""}
          </div>
        ))}
      </div>

      {/* Band bars */}
      {HF_BANDS.map((band, bandIdx) => {
        const segments = data.map((h) => h.bandStatuses[bandIdx]?.status ?? "closed");

        return (
          <div key={band.name} className="flex items-center">
            <div className="w-14 shrink-0 text-xs font-semibold text-gray-300 text-right pr-2">
              {band.name}
            </div>
            <div className="flex flex-1 h-4 rounded overflow-hidden">
              {segments.map((status, i) => (
                <div
                  key={i}
                  className="flex-1"
                  style={{
                    backgroundColor:
                      status === "open"
                        ? BAND_COLORS[band.name]
                        : status === "marginal"
                        ? `${BAND_COLORS[band.name]}80`
                        : "#1f2937",
                    opacity: status === "closed" ? 0.3 : 1,
                  }}
                  title={`${band.name} ${data[i]?.utcTime?.slice(11, 16) ?? ""}: ${status}`}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Legend */}
      <div className="flex gap-4 mt-2 justify-center text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ backgroundColor: BAND_COLORS["20m"] }} /> Open
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ backgroundColor: `${BAND_COLORS["20m"]}80` }} /> Marginal
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-gray-800 opacity-30" /> Closed
        </span>
      </div>
    </div>
  );
}
