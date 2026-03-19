"use client";

import { SolarData } from "@/types";

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

interface CardProps {
  label: string;
  value: number | string;
  colorClass: string;
}

function Card({ label, value, colorClass }: CardProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 flex flex-col items-center min-w-[100px]">
      <span className="text-gray-400 text-xs uppercase tracking-wider">{label}</span>
      <span className={`text-2xl font-bold mt-1 ${colorClass}`}>{value}</span>
    </div>
  );
}

export default function SolarDashboard({ solar }: { solar: SolarData | null }) {
  if (!solar) {
    return (
      <div className="flex gap-3 flex-wrap">
        {["SFI", "K-Index", "A-Index", "Sunspots"].map((label) => (
          <Card key={label} label={label} value="--" colorClass="text-gray-500" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-3 flex-wrap">
        <Card label="SFI" value={solar.sfi} colorClass={sfiColor(solar.sfi)} />
        <Card label="K-Index" value={solar.kIndex} colorClass={kColor(solar.kIndex)} />
        <Card label="A-Index" value={solar.aIndex} colorClass={aColor(solar.aIndex)} />
        <Card label="Sunspots" value={solar.sunspots} colorClass="text-blue-400" />
      </div>
      <p className="text-gray-500 text-xs mt-2">
        Source: {solar.source.toUpperCase()} &middot; {solar.updatedAt}
      </p>
    </div>
  );
}
