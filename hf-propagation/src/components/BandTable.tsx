"use client";

import { BandStatus, BandStatusLevel } from "@/types";
import BandBadge from "./BandBadge";

const STATUS_COLORS: Record<BandStatusLevel, string> = {
  open: "text-green-400",
  marginal: "text-yellow-400",
  closed: "text-red-400",
};

const STATUS_BG: Record<BandStatusLevel, string> = {
  open: "bg-green-900/30",
  marginal: "bg-yellow-900/30",
  closed: "bg-red-900/20",
};

export default function BandTable({ statuses }: { statuses: BandStatus[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-400 text-xs uppercase tracking-wider border-b border-gray-700">
            <th className="text-left py-2 px-3">Band</th>
            <th className="text-left py-2 px-3">Frequency</th>
            <th className="text-center py-2 px-3">Status</th>
            <th className="text-right py-2 px-3">MUF</th>
            <th className="text-right py-2 px-3">FOT</th>
            <th className="text-center py-2 px-3">Rating</th>
          </tr>
        </thead>
        <tbody>
          {statuses.map((s) => (
            <tr key={s.band.name} className={`border-b border-gray-800 ${STATUS_BG[s.status]}`}>
              <td className="py-2 px-3 font-bold text-white">{s.band.name}</td>
              <td className="py-2 px-3 text-gray-300">
                {s.band.minMHz.toFixed(3)}&ndash;{s.band.maxMHz.toFixed(3)}
              </td>
              <td className={`py-2 px-3 text-center font-semibold uppercase ${STATUS_COLORS[s.status]}`}>
                {s.status}
              </td>
              <td className="py-2 px-3 text-right text-gray-300">{s.muf.toFixed(1)}</td>
              <td className="py-2 px-3 text-right text-gray-300">{s.fot.toFixed(1)}</td>
              <td className="py-2 px-3 text-center">
                <BandBadge rating={s.rating} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
