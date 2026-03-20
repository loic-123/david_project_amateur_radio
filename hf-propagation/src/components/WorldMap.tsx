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
 * Compute the night overlay polygon.
 *
 * Approach: find the sub-solar point (where the sun is directly overhead),
 * then the anti-solar point is on the opposite side of the Earth.
 * Night = the hemisphere facing away from the sun.
 *
 * For each latitude, we find the longitude where the sun crosses the horizon
 * using binary search. The night zone at that latitude extends from that
 * crossing to the other crossing, centered on the anti-solar longitude.
 */
function computeNightPolygon(date: Date): [number, number][] {
  // Find sub-solar point: where the sun is at zenith
  // The sub-solar longitude is where it's solar noon
  const sunPos = SunCalc.getPosition(date, 0, 0);

  // Find sub-solar longitude by checking where altitude is highest at equator
  let maxAlt = -Infinity;
  let subSolarLon = 0;
  for (let lon = -180; lon <= 180; lon += 1) {
    const alt = SunCalc.getPosition(date, 0, lon).altitude;
    if (alt > maxAlt) {
      maxAlt = alt;
      subSolarLon = lon;
    }
  }

  // Anti-solar longitude (center of night)
  let antiSolarLon = subSolarLon + 180;
  if (antiSolarLon > 180) antiSolarLon -= 360;

  // For each latitude, find the half-width of the night zone in degrees of longitude
  // by binary-searching for where sun altitude = 0
  const latStep = 2;
  const leftEdge: [number, number][] = [];
  const rightEdge: [number, number][] = [];

  for (let lat = -85; lat <= 85; lat += latStep) {
    // Check if this latitude is entirely day or entirely night
    const altAtAntiSolar = SunCalc.getPosition(date, lat, antiSolarLon).altitude;
    const altAtSubSolar = SunCalc.getPosition(date, lat, subSolarLon).altitude;

    if (altAtAntiSolar >= 0) {
      // Even at anti-solar point it's day → entire latitude is daytime (e.g., polar day)
      continue;
    }

    if (altAtSubSolar < 0) {
      // Even at sub-solar point it's night → entire latitude is night (polar night)
      leftEdge.push([lat, antiSolarLon - 180]);
      rightEdge.push([lat, antiSolarLon + 180]);
      continue;
    }

    // Binary search for the half-width of the night zone
    let lo = 0;
    let hi = 180;
    for (let iter = 0; iter < 20; iter++) {
      const mid = (lo + hi) / 2;
      let testLon = antiSolarLon + mid;
      if (testLon > 180) testLon -= 360;
      const alt = SunCalc.getPosition(date, lat, testLon).altitude;
      if (alt < 0) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    const halfWidth = (lo + hi) / 2;

    leftEdge.push([lat, antiSolarLon - halfWidth]);
    rightEdge.push([lat, antiSolarLon + halfWidth]);
  }

  if (leftEdge.length === 0) return [];

  // Build polygon: left edge (south→north), then right edge reversed (north→south)
  const polygon: [number, number][] = [
    ...leftEdge,
    ...[...rightEdge].reverse(),
    leftEdge[0], // close the polygon
  ];

  return polygon;
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
  const [nightPoly, setNightPoly] = useState<[number, number][]>([]);

  useEffect(() => {
    const update = () => {
      setNightPoly(computeNightPolygon(new Date()));
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
      {nightPoly.length > 0 && (
        <Polygon
          positions={nightPoly}
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
