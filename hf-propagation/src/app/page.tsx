"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { SolarData, QTHLocation, BandStatus, HourlyPropagation } from "@/types";
import { getAllBandStatuses, compute24hPropagation } from "@/lib/propagation";
import { loadLocation, saveLocation, toMaidenhead } from "@/lib/storage";
import SolarDashboard from "@/components/SolarDashboard";
import BandTable from "@/components/BandTable";
import LocationPicker from "@/components/LocationPicker";
import PropagationChart from "@/components/PropagationChart";

const WorldMap = dynamic(() => import("@/components/WorldMap"), { ssr: false });

const DEFAULT_LOCATION: QTHLocation = {
  lat: 48.85,
  lon: 2.35,
  name: "Paris",
  gridSquare: "JN18eu",
};

export default function Home() {
  const [solar, setSolar] = useState<SolarData | null>(null);
  const [location, setLocation] = useState<QTHLocation>(DEFAULT_LOCATION);
  const [bandStatuses, setBandStatuses] = useState<BandStatus[]>([]);
  const [hourlyData, setHourlyData] = useState<HourlyPropagation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load saved location on mount
  useEffect(() => {
    const saved = loadLocation();
    if (saved) setLocation(saved);
  }, []);

  // Fetch solar data
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
    const interval = setInterval(fetchSolar, 300000); // 5 minutes
    return () => clearInterval(interval);
  }, [fetchSolar]);

  // Recalculate propagation when solar data or location changes
  useEffect(() => {
    if (!solar) return;
    const now = new Date();
    setBandStatuses(getAllBandStatuses(location.lat, location.lon, now, solar));
    setHourlyData(compute24hPropagation(location.lat, location.lon, solar));
  }, [solar, location]);

  const handleLocationChange = (loc: QTHLocation) => {
    setLocation(loc);
    saveLocation(loc);
  };

  const handleMapClick = (lat: number, lon: number) => {
    const loc: QTHLocation = {
      lat,
      lon,
      name: `${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E`,
      gridSquare: toMaidenhead(lat, lon),
    };
    handleLocationChange(loc);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">HF Propagation</h1>
          <p className="text-gray-400 text-sm">Real-time amateur radio band conditions</p>
        </div>
        <div className="text-right text-sm text-gray-400">
          {new Date().toISOString().slice(0, 16).replace("T", " ")} UTC
        </div>
      </header>

      {/* Error banner */}
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
        <SolarDashboard solar={solar} />
      </section>

      {/* Location Picker */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Your Location (QTH)
        </h2>
        <LocationPicker location={location} onLocationChange={handleLocationChange} />
      </section>

      {/* Main grid: Map + Band Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* World Map */}
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Day/Night Map
          </h2>
          <div className="bg-gray-900 rounded-lg overflow-hidden h-[400px]">
            <WorldMap location={location} onLocationSelect={handleMapClick} />
          </div>
        </section>

        {/* Band Table */}
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Band Conditions
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

      {/* 24h Propagation Chart */}
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

      {/* Disclaimer */}
      <footer className="text-gray-600 text-xs text-center pb-4">
        Propagation estimates are based on an empirical model and may differ from professional
        tools like VOACAP. Use as directional guidance only.
      </footer>
    </div>
  );
}
