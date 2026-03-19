"use client";

import { useState, useCallback, useRef } from "react";
import { QTHLocation } from "@/types";
import { toMaidenhead } from "@/lib/storage";

interface Props {
  location: QTHLocation;
  onLocationChange: (loc: QTHLocation) => void;
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

export default function LocationPicker({ location, onLocationChange }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const search = useCallback(
    (q: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (q.length < 2) {
        setResults([]);
        return;
      }
      debounceRef.current = setTimeout(async () => {
        setSearching(true);
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5`,
            { headers: { "User-Agent": "HF-Propagation-App" } }
          );
          const data: NominatimResult[] = await res.json();
          setResults(data);
        } catch {
          setResults([]);
        }
        setSearching(false);
      }, 300);
    },
    []
  );

  const selectResult = (r: NominatimResult) => {
    const lat = parseFloat(r.lat);
    const lon = parseFloat(r.lon);
    onLocationChange({
      lat,
      lon,
      name: r.display_name.split(",")[0],
      gridSquare: toMaidenhead(lat, lon),
    });
    setQuery("");
    setResults([]);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        onLocationChange({
          lat: latitude,
          lon: longitude,
          name: "My Location",
          gridSquare: toMaidenhead(latitude, longitude),
        });
      },
      () => {} // silently fail
    );
  };

  const grid = toMaidenhead(location.lat, location.lon);

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              search(e.target.value);
            }}
            placeholder="Search city..."
            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          {results.length > 0 && (
            <ul className="absolute z-50 top-full left-0 right-0 bg-gray-800 border border-gray-600 rounded mt-1 max-h-48 overflow-y-auto">
              {results.map((r, i) => (
                <li
                  key={i}
                  onClick={() => selectResult(r)}
                  className="px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 cursor-pointer truncate"
                >
                  {r.display_name}
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          onClick={useMyLocation}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1.5 rounded whitespace-nowrap"
        >
          Use my location
        </button>
      </div>
      <p className="text-gray-400 text-xs">
        {location.name && <span className="text-white">{location.name} &middot; </span>}
        {location.lat.toFixed(2)}°N, {location.lon.toFixed(2)}°E &middot; Grid: {grid}
        <span className="text-gray-600"> &middot; Click on the map to set location</span>
      </p>
    </div>
  );
}
