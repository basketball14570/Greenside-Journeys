// Geo helpers for the on-course rangefinder. All distances are computed
// client-side from the device GPS and the course's stored green
// coordinates — no server round-trip, no API key, no cost.

export type LatLng = { lat: number; lon: number };

const EARTH_RADIUS_M = 6_371_000;
const M_PER_YARD = 0.9144;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

// Great-circle distance in meters between two coordinates. Haversine is
// accurate to well within a yard at golf-hole distances (<700yd), which
// is finer than consumer phone GPS (±3-5yd) can resolve anyway.
export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function metersToYards(m: number): number {
  return m / M_PER_YARD;
}

// Distance from the player to a target point, rounded to whole yards —
// the unit golfers expect on a rangefinder.
export function distanceYards(from: LatLng, to: LatLng): number {
  return Math.round(metersToYards(haversineMeters(from, to)));
}
