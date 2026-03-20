"use client";

import { HourlyPropagation } from "@/types";
import { HF_BANDS } from "@/lib/bands";

const STATUS_COLORS = {
  open: "bg-green-500",
  marginal: "bg-yellow-500",
  closed: "bg-gray-700",
};

interface Props {
  data: HourlyPropagation[];
}

export default function BandHeatmap({ data }: Props) {
  if (data.length === 0) return null;

  // Show every 2nd hour label to avoid crowding
  const showLabel = (i: number) => i % 2 === 0;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        {/* Hour labels */}
        <div className="flex mb-1">
          <div className="w-14 shrink-0" />
          {data.map((h, i) => (
            <div key={i} className="flex-1 text-center text-[10px] text-gray-500">
              {showLabel(i) ? h.utcTime.slice(11, 16) : ""}
            </div>
          ))}
        </div>

        {/* Band rows */}
        {HF_BANDS.map((band, bandIdx) => (
          <div key={band.name} className="flex items-center mb-0.5">
            <div className="w-14 shrink-0 text-xs font-semibold text-gray-300 text-right pr-2">
              {band.name}
            </div>
            {data.map((h, hourIdx) => {
              const status = h.bandStatuses[bandIdx]?.status ?? "closed";
              return (
                <div
                  key={hourIdx}
                  className={`flex-1 h-5 ${STATUS_COLORS[status]} ${
                    hourIdx === 0 ? "rounded-l" : ""
                  } ${hourIdx === data.length - 1 ? "rounded-r" : ""}`}
                  title={`${band.name} at ${h.utcTime.slice(11, 16)} UTC: ${status.toUpperCase()} (MUF: ${h.muf.toFixed(1)} MHz)`}
                />
              );
            })}
          </div>
        ))}

        {/* Legend */}
        <div className="flex gap-4 mt-3 justify-center text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-green-500" /> Open
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-yellow-500" /> Marginal
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-gray-700" /> Closed
          </span>
        </div>
      </div>
    </div>
  );
}
