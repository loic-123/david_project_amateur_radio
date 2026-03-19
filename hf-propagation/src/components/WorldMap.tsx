"use client";

import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Polygon, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { QTHLocation } from "@/types";

// Custom marker icon using a simple SVG circle (avoids Leaflet default icon loading issues)
const locationIcon = L.divIcon({
  html: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="8" fill="#3b82f6" stroke="white" stroke-width="3"/>
  </svg>`,
  className: "",
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

/**
 * Compute the night-side polygon using suncalc.
 * For each longitude, find the latitude where the sun altitude is ~0 (terminator).
 * Then fill the night side toward the appropriate pole.
 */
function computeNightPolygon(date: Date): [number, number][][] {
  const SunCalc = require("suncalc");

  // Build terminator line: for each longitude, binary-search for the latitude
  // where sun altitude crosses zero.
  const terminatorPoints: [number, number][] = [];

  for (let lon = -180; lon <= 180; lon += 2) {
    // Binary search for latitude where sun altitude = 0
    let lo = -90, hi = 90;
    // First check which pole is in daylight
    const altNorth = SunCalc.getPosition(date, 89, lon).altitude;
    const altSouth = SunCalc.getPosition(date, -89, lon).altitude;
    const altMid = SunCalc.getPosition(date, 0, lon).altitude;

    // Find the terminator latitude by binary search
    // The terminator crosses where altitude = 0
    // We need to find the boundary between day and night
    let foundLat = 0;
    let found = false;

    // Check if there's a crossing between south and north
    for (let lat = -90; lat < 90; lat += 5) {
      const a1 = SunCalc.getPosition(date, lat, lon).altitude;
      const a2 = SunCalc.getPosition(date, lat + 5, lon).altitude;
      if ((a1 >= 0 && a2 < 0) || (a1 < 0 && a2 >= 0)) {
        // Refine with binary search
        let low = lat, high = lat + 5;
        for (let j = 0; j < 15; j++) {
          const mid = (low + high) / 2;
          const aMid = SunCalc.getPosition(date, mid, lon).altitude;
          if ((a1 >= 0 && aMid >= 0) || (a1 < 0 && aMid < 0)) {
            low = mid;
          } else {
            high = mid;
          }
        }
        foundLat = (low + high) / 2;
        found = true;
        break;
      }
    }

    if (found) {
      terminatorPoints.push([foundLat, lon]);
    }
  }

  if (terminatorPoints.length < 2) return [];

  // Determine which pole is night (negative sun altitude)
  const altAtNorthPole = SunCalc.getPosition(date, 89, 0).altitude;
  const nightPole = altAtNorthPole < 0 ? 90 : -90;

  // Build the night polygon: terminator line + close via the night pole
  const nightPoly: [number, number][] = [
    ...terminatorPoints,
    [nightPole, terminatorPoints[terminatorPoints.length - 1][1]],
    [nightPole, terminatorPoints[0][1]],
    terminatorPoints[0],
  ];

  return [nightPoly];
}

function MapClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface WorldMapProps {
  location: QTHLocation;
  onLocationSelect: (lat: number, lon: number) => void;
}

export default function WorldMap({ location, onLocationSelect }: WorldMapProps) {
  const [nightPolygon, setNightPolygon] = useState<[number, number][]>([]);

  useEffect(() => {
    const update = () => {
      const polys = computeNightPolygon(new Date());
      setNightPolygon(polys.length > 0 ? polys[0] : []);
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <MapContainer
      center={[location.lat, location.lon]}
      zoom={2}
      style={{ height: "100%", width: "100%", minHeight: "300px" }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {nightPolygon.length > 0 && (
        <Polygon
          positions={nightPolygon}
          pathOptions={{
            color: "transparent",
            fillColor: "#000028",
            fillOpacity: 0.4,
          }}
        />
      )}
      <Marker position={[location.lat, location.lon]} icon={locationIcon} />
      <MapClickHandler onLocationSelect={onLocationSelect} />
    </MapContainer>
  );
}
