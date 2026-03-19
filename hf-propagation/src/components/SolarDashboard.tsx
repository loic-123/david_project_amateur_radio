"use client";

import { SolarData } from "@/types";
import { SunTimes } from "@/lib/propagation";

function sfiColor(sfi: number): string {
  if (sfi >= 150) return "text-green-400";
  if (sfi >= 100) return "text-yellow-400";
  return "text-red-400";
}

function kColor(k: number): string {
  if (k <= 2) return "text-green-400";
  if (k <= 4) return "text-yellow-400";
  return "text-red-400";
}

function aColor(a: number): string {
  if (a <= 7) return "text-green-400";
  if (a <= 15) return "text-yellow-400";
  return "text-red-400";
}

function Card({ label, value, colorClass }: { label: string; value: number | string; colorClass: string }) {
  return (
    <div className="bg-gray-800 rounded-lg p-3 flex flex-col items-center min-w-[80px]">
      <span className="text-gray-400 text-xs uppercase tracking-wider">{label}</span>
      <span className={`text-xl font-bold mt-1 ${colorClass}`}>{value}</span>
    </div>
  );
}

function fmtTime(d: Date): string {
  return d.toISOString().slice(11, 16);
}

interface Props {
  solar: SolarData | null;
  sunTimes: SunTimes | null;
}

export default function SolarDashboard({ solar, sunTimes }: Props) {
  return (
    <div className="space-y-3">
      {/* Solar indices */}
      <div className="flex gap-3 flex-wrap">
        {!solar ? (
          ["SFI", "K", "A", "SSN"].map((label) => (
            <Card key={label} label={label} value="--" colorClass="text-gray-500" />
          ))
        ) : (
          <>
            <Card label="SFI" value={solar.sfi} colorClass={sfiColor(solar.sfi)} />
            <Card label="K" value={solar.kIndex} colorClass={kColor(solar.kIndex)} />
            <Card label="A" value={solar.aIndex} colorClass={aColor(solar.aIndex)} />
            <Card label="SSN" value={solar.sunspots} colorClass="text-blue-400" />
          </>
        )}

        {/* Sunrise/Sunset/Grey Line */}
        {sunTimes && (
          <>
            <div className="bg-gray-800 rounded-lg p-3 flex flex-col items-center min-w-[80px]">
              <span className="text-gray-400 text-xs uppercase tracking-wider">Sunrise</span>
              <span className="text-orange-300 text-xl font-bold mt-1">{fmtTime(sunTimes.sunrise)}</span>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 flex flex-col items-center min-w-[80px]">
              <span className="text-gray-400 text-xs uppercase tracking-wider">Sunset</span>
              <span className="text-indigo-300 text-xl font-bold mt-1">{fmtTime(sunTimes.sunset)}</span>
            </div>
            <div className={`rounded-lg p-3 flex flex-col items-center min-w-[100px] ${sunTimes.isGreyLineNow ? "bg-amber-900/50 ring-1 ring-amber-500" : "bg-gray-800"}`}>
              <span className="text-gray-400 text-xs uppercase tracking-wider">Grey Line</span>
              {sunTimes.isGreyLineNow ? (
                <span className="text-amber-300 text-sm font-bold mt-1">NOW!</span>
              ) : (
                <span className="text-gray-300 text-sm font-bold mt-1">in {sunTimes.greyLineCountdown}</span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Source info */}
      {solar && (
        <p className="text-gray-500 text-xs">
          Source: {solar.source.toUpperCase()} &middot; {solar.updatedAt}
          {sunTimes && " &middot; Times in UTC"}
        </p>
      )}
    </div>
  );
}
