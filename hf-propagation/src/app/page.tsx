"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  SolarData, QTHLocation, BandStatus, HourlyPropagation,
  OperatingMode, PowerLevel, UserSettings,
} from "@/types";
import {
  getAllBandStatuses, compute24hPropagation, extractBandOpenings,
  getSunTimes, BandOpeningWindow, SunTimes,
} from "@/lib/propagation";
import { loadLocation, saveLocation, toMaidenhead } from "@/lib/storage";
import SolarDashboard from "@/components/SolarDashboard";
import BandTable from "@/components/BandTable";
import BandOpeningTimes from "@/components/BandOpeningTimes";
import LocationPicker from "@/components/LocationPicker";
import PropagationChart from "@/components/PropagationChart";
import BandHeatmap from "@/components/BandHeatmap";
import SolarZenithChart from "@/components/SolarZenithChart";
import FoF2MufChart from "@/components/FoF2MufChart";
import BandTimeline from "@/components/BandTimeline";

const WorldMap = dynamic(() => import("@/components/WorldMap"), { ssr: false });

const DEFAULT_LOCATION: QTHLocation = {
  lat: 48.85,
  lon: 2.35,
  name: "Paris",
  gridSquare: "JN18eu",
};

const MODE_LABELS: Record<OperatingMode, string> = { ssb: "SSB", cw: "CW", ft8: "FT8" };
const POWER_LABELS: Record<PowerLevel, string> = { qrp: "QRP (5W)", standard: "100W", high: "1kW" };

export default function Home() {
  const [solar, setSolar] = useState<SolarData | null>(null);
  const [location, setLocation] = useState<QTHLocation>(DEFAULT_LOCATION);
  const [bandStatuses, setBandStatuses] = useState<BandStatus[]>([]);
  const [hourlyData, setHourlyData] = useState<HourlyPropagation[]>([]);
  const [openings, setOpenings] = useState<BandOpeningWindow[]>([]);
  const [sunTimes, setSunTimes] = useState<SunTimes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<OperatingMode>("ssb");
  const [power, setPower] = useState<PowerLevel>("standard");
  const settings: UserSettings = { mode, power };

  useEffect(() => {
    const saved = loadLocation();
    if (saved) setLocation(saved);
  }, []);

  const fetchSolar = useCallback(async () => {
    try {
      const res = await fetch("/api/solar");
      if (!res.ok) throw new Error("API error");
      const data: SolarData = await res.json();
      setSolar(data);
      setError(null);
    } catch {
      setError("Failed to fetch solar data. Retrying...");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSolar();
    const interval = setInterval(fetchSolar, 300000);
    return () => clearInterval(interval);
  }, [fetchSolar]);

  useEffect(() => {
    if (!solar) return;
    const now = new Date();
    setBandStatuses(getAllBandStatuses(location.lat, location.lon, now, solar, settings));
    const hourly = compute24hPropagation(location.lat, location.lon, solar, settings);
    setHourlyData(hourly);
    setOpenings(extractBandOpenings(hourly));
    setSunTimes(getSunTimes(location.lat, location.lon, now));
  }, [solar, location, mode, power]);

  const handleLocationChange = (loc: QTHLocation) => {
    setLocation(loc);
    saveLocation(loc);
  };

  const handleMapClick = (lat: number, lon: number) => {
    const loc: QTHLocation = {
      lat, lon,
      name: `${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E`,
      gridSquare: toMaidenhead(lat, lon),
    };
    handleLocationChange(loc);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header + Settings */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">HF Propagation</h1>
          <p className="text-gray-400 text-sm">Real-time amateur radio band conditions</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg overflow-hidden border border-gray-700">
            {(Object.keys(MODE_LABELS) as OperatingMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                  mode === m
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>
          <select
            value={power}
            onChange={(e) => setPower(e.target.value as PowerLevel)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-300"
          >
            {(Object.keys(POWER_LABELS) as PowerLevel[]).map((p) => (
              <option key={p} value={p}>{POWER_LABELS[p]}</option>
            ))}
          </select>
          <span className="text-sm text-gray-500">
            {new Date().toISOString().slice(11, 16)} UTC
          </span>
        </div>
      </header>

      {error && (
        <div className="bg-red-900/50 border border-red-700 rounded px-4 py-2 text-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Solar Dashboard */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Solar Conditions
        </h2>
        <SolarDashboard solar={solar} sunTimes={sunTimes} />
      </section>

      {/* Location Picker */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Your Location (QTH)
        </h2>
        <LocationPicker location={location} onLocationChange={handleLocationChange} />
      </section>

      {/* Map + Band Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Day/Night Map
          </h2>
          <div className="bg-gray-900 rounded-lg overflow-hidden h-[400px]">
            <WorldMap location={location} onLocationSelect={handleMapClick} />
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Band Conditions ({MODE_LABELS[mode]} / {POWER_LABELS[power]})
          </h2>
          <div className="bg-gray-900 rounded-lg p-4">
            {loading ? (
              <p className="text-gray-500 text-center py-8">Loading solar data...</p>
            ) : (
              <BandTable statuses={bandStatuses} />
            )}
          </div>
        </section>
      </div>

      {/* Band Opening Times */}
      {openings.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Band Openings (Next 24h)
          </h2>
          <div className="bg-gray-900 rounded-lg p-4">
            <BandOpeningTimes openings={openings} />
          </div>
        </section>
      )}

      {/* Band Heatmap - 24h overview */}
      {hourlyData.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
            24-Hour Band Heatmap
          </h2>
          <p className="text-gray-500 text-xs mb-2">
            Visual overview — hover for details
          </p>
          <div className="bg-gray-900 rounded-lg p-4">
            <BandHeatmap data={hourlyData} />
          </div>
        </section>
      )}

      {/* Band Timeline */}
      {hourlyData.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Band Activity Timeline
          </h2>
          <p className="text-gray-500 text-xs mb-2">
            When each band is open — colour intensity shows band-specific propagation
          </p>
          <div className="bg-gray-900 rounded-lg p-4">
            <BandTimeline data={hourlyData} />
          </div>
        </section>
      )}

      {/* 24h MUF Chart */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
          24-Hour MUF Forecast
        </h2>
        <div className="bg-gray-900 rounded-lg p-4">
          {hourlyData.length > 0 ? (
            <PropagationChart data={hourlyData} />
          ) : (
            <p className="text-gray-500 text-center py-8">Loading forecast...</p>
          )}
        </div>
      </section>

      {/* foF2 / MUF / FOT Chart */}
      {solar && (
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Ionospheric Layers — foF2 / MUF / FOT
          </h2>
          <p className="text-gray-500 text-xs mb-2">
            Critical frequency (purple), Maximum Usable Frequency (red), Frequency of Optimum Traffic (green)
          </p>
          <div className="bg-gray-900 rounded-lg p-4">
            <FoF2MufChart lat={location.lat} lon={location.lon} solar={solar} settings={settings} />
          </div>
        </section>
      )}

      {/* Solar Zenith Chart */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Sun Position — 24h Altitude
        </h2>
        <p className="text-gray-500 text-xs mb-2">
          Above 0° = daytime, below = night. Twilight zone shown in darker blue.
        </p>
        <div className="bg-gray-900 rounded-lg p-4">
          <SolarZenithChart lat={location.lat} lon={location.lon} />
        </div>
      </section>

      {/* Disclaimer */}
      <footer className="text-gray-600 text-xs text-center pb-4">
        Propagation estimates are based on an empirical model and may differ from professional
        tools like VOACAP. MUF adjusted for {MODE_LABELS[mode]} mode and {POWER_LABELS[power]} power.
      </footer>
    </div>
  );
}
