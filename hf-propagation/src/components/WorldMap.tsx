"use client";

import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Polygon, useMapEvents } from "react-leaflet";
import L from "leaflet";
import SunCalc from "suncalc";
import { QTHLocation } from "@/types";

// Fix default marker icon (Leaflet + webpack issue)
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x.src,
  iconUrl: markerIcon.src,
  shadowUrl: markerShadow.src,
});

/**
 * Compute the day/night terminator as a polygon.
 * Returns coordinates for the "night side" of the Earth.
 */
function computeTerminator(date: Date): [number, number][] {
  const points: [number, number][] = [];

  // Get the sub-solar point
  const jd = date.getTime() / 86400000 + 2440587.5;
  const n = jd - 2451545.0;
  const L0 = (280.46 + 0.9856474 * n) % 360;
  const g = ((357.528 + 0.9856003 * n) % 360) * (Math.PI / 180);
  const eclipticLon = L0 + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g);
  const obliquity = 23.439 - 0.0000004 * n;
  const declination = Math.asin(
    Math.sin((obliquity * Math.PI) / 180) * Math.sin((eclipticLon * Math.PI) / 180)
  );
  const decDeg = declination * (180 / Math.PI);

  // Greenwich Mean Sidereal Time
  const gmst = (280.46061837 + 360.98564736629 * (jd - 2451545.0)) % 360;
  // Sub-solar longitude
  const subSolarLon = (gmst + 180) % 360 - 180;

  // Terminator: great circle 90° from sub-solar point
  for (let i = 0; i <= 360; i += 2) {
    const angle = (i * Math.PI) / 180;
    const lat = Math.atan2(
      -Math.cos(angle),
      Math.sin(angle) * Math.sin(declination)
    ) * (180 / Math.PI);
    let lon = ((i + subSolarLon - 90) % 360 + 540) % 360 - 180;
    points.push([lat, lon]);
  }

  // Close the polygon: add caps at the appropriate pole for the night side
  const nightPole = decDeg >= 0 ? -90 : 90;
  const nightPoly: [number, number][] = [
    ...points,
    [nightPole, points[points.length - 1][1]],
    [nightPole, points[0][1]],
    points[0],
  ];

  return nightPoly;
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
    const update = () => setNightPolygon(computeTerminator(new Date()));
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
      <Marker position={[location.lat, location.lon]} />
      <MapClickHandler onLocationSelect={onLocationSelect} />
    </MapContainer>
  );
}
