"use client";

import { BandOpeningWindow } from "@/lib/propagation";

function statusText(w: BandOpeningWindow): string {
  if (w.isClosedAllDay) return "CLOSED today";
  if (w.isOpenAllDay) return "OPEN all day";

  const parts: string[] = [];
  if (w.isOpenNow) parts.push("OPEN now");
  else parts.push("CLOSED now");

  if (w.opensUTC) parts.push(`opens ${w.opensUTC} UTC`);
  if (w.closesUTC) parts.push(`closes ${w.closesUTC} UTC`);

  return parts.join(" · ");
}

function statusColor(w: BandOpeningWindow): string {
  if (w.isClosedAllDay) return "text-red-400";
  if (w.isOpenAllDay) return "text-green-400";
  if (w.isOpenNow) return "text-green-400";
  return "text-yellow-400";
}

function statusDot(w: BandOpeningWindow): string {
  if (w.isClosedAllDay) return "bg-red-500";
  if (w.isOpenAllDay || w.isOpenNow) return "bg-green-500";
  return "bg-yellow-500";
}

export default function BandOpeningTimes({ openings }: { openings: BandOpeningWindow[] }) {
  return (
    <div className="space-y-1">
      {openings.map((w) => (
        <div key={w.bandName} className="flex items-center gap-2 text-sm">
          <span className={`w-2 h-2 rounded-full ${statusDot(w)}`} />
          <span className="w-12 font-bold text-white">{w.bandName}</span>
          <span className={statusColor(w)}>{statusText(w)}</span>
        </div>
      ))}
    </div>
  );
}
