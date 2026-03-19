"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Polygon, useMapEvents } from "react-leaflet";
import L from "leaflet";
import SunCalc from "suncalc";
import { QTHLocation } from "@/types";

const locationIcon = L.divIcon({
  html: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="8" fill="#3b82f6" stroke="white" stroke-width="3"/>
  </svg>`,
  className: "",
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

/**
 * Compute the night polygon.
 *
 * Strategy: scan a grid of points, classify each as day or night,
 * then build a simple polygon covering the night side.
 *
 * Simpler approach: for each latitude, find the two longitudes where
 * sun altitude crosses 0 (dawn and dusk). The night area is between
 * these two longitudes on the dark side.
 */
function computeNightPolygon(date: Date): [number, number][][] {
  // For each latitude from -80 to 80, find the two longitude crossings
  const latStep = 3;
  const lonStep = 1;

  // We'll build the night polygon as two edges:
  // - "west edge" of the night zone (going from south to north)
  // - "east edge" of the night zone (going from north to south)
  const westEdge: [number, number][] = [];
  const eastEdge: [number, number][] = [];

  for (let lat = -80; lat <= 80; lat += latStep) {
    // Find longitude crossings at this latitude
    const crossings: { lon: number; toDay: boolean }[] = [];

    let prevAlt = SunCalc.getPosition(date, lat, -180).altitude;
    for (let lon = -180 + lonStep; lon <= 180; lon += lonStep) {
      const alt = SunCalc.getPosition(date, lat, lon).altitude;
      if (prevAlt < 0 && alt >= 0) {
        const frac = -prevAlt / (alt - prevAlt);
        crossings.push({ lon: lon - lonStep + frac * lonStep, toDay: true });
      } else if (prevAlt >= 0 && alt < 0) {
        const frac = prevAlt / (prevAlt - alt);
        crossings.push({ lon: lon - lonStep + frac * lonStep, toDay: false });
      }
      prevAlt = alt;
    }

    if (crossings.length >= 2) {
      // Two crossings: one entering night, one leaving night
      const enterNight = crossings.find((c) => !c.toDay);
      const leaveNight = crossings.find((c) => c.toDay);
      if (enterNight && leaveNight) {
        // Night zone: from enterNight.lon going east (wrapping) to leaveNight.lon
        westEdge.push([lat, enterNight.lon]);
        eastEdge.push([lat, leaveNight.lon]);
      }
    } else if (crossings.length === 1) {
      // Near equinox: terminator is nearly vertical, only 1 crossing
      // Check if lon=-180 is night or day
      const altAt180 = SunCalc.getPosition(date, lat, -180).altitude;
      if (altAt180 < 0) {
        // Night starts at -180, crossing is where it ends
        westEdge.push([lat, -180]);
        eastEdge.push([lat, crossings[0].lon]);
      } else {
        // Day starts at -180, crossing is where night starts
        westEdge.push([lat, crossings[0].lon]);
        eastEdge.push([lat, 180]);
      }
    } else {
      // No crossings: entire latitude is day or night
      const alt = SunCalc.getPosition(date, lat, 0).altitude;
      if (alt < 0) {
        // Entire latitude is night
        westEdge.push([lat, -180]);
        eastEdge.push([lat, 180]);
      }
      // If entire latitude is day, skip it (no night polygon at this lat)
    }
  }

  if (westEdge.length === 0) return [];

  // Build the night polygon: west edge (south→north) + east edge reversed (north→south)
  const nightPoly: [number, number][] = [
    // Add south pole cap if needed
    [-90, westEdge[0][1]],
    ...westEdge,
    // Add north pole cap
    [90, westEdge[westEdge.length - 1][1]],
    [90, eastEdge[eastEdge.length - 1][1]],
    ...[...eastEdge].reverse(),
    [-90, eastEdge[0][1]],
    [-90, westEdge[0][1]], // close
  ];

  return [nightPoly];
}

function MapClickHandler({
  onLocationSelect,
}: {
  onLocationSelect: (lat: number, lon: number) => void;
}) {
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
  const [nightRings, setNightRings] = useState<[number, number][][]>([]);

  useEffect(() => {
    const update = () => {
      setNightRings(computeNightPolygon(new Date()));
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
      {nightRings.length >= 1 && (
        <Polygon
          positions={nightRings}
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
