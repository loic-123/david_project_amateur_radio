import { QTHLocation } from "@/types";

const STORAGE_KEY = "hf-prop-qth";

export function loadLocation(): QTHLocation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as QTHLocation;
  } catch {
    return null;
  }
}

export function saveLocation(location: QTHLocation): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
}

/**
 * Convert lat/lon to Maidenhead grid square (6 characters).
 */
export function toMaidenhead(lat: number, lon: number): string {
  const adjLon = lon + 180;
  const adjLat = lat + 90;

  const fieldLon = Math.floor(adjLon / 20);
  const fieldLat = Math.floor(adjLat / 10);

  const squareLon = Math.floor((adjLon % 20) / 2);
  const squareLat = Math.floor(adjLat % 10);

  const subLon = Math.floor(((adjLon % 20) % 2) * 12);
  const subLat = Math.floor((adjLat % 10 - squareLat) * 24);

  return (
    String.fromCharCode(65 + fieldLon) +
    String.fromCharCode(65 + fieldLat) +
    squareLon.toString() +
    squareLat.toString() +
    String.fromCharCode(97 + subLon) +
    String.fromCharCode(97 + subLat)
  );
}
