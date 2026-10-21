import { booleanPointInPolygon } from "@turf/boolean-point-in-polygon";
import { distance } from "@turf/distance";
import type { Polygon, MultiPolygon } from "geojson";
import type { Coordinates } from "./geography";
export function validateCoordinates(p: Coordinates): void {
  if (
    typeof p.latitude !== "number" ||
    typeof p.longitude !== "number" ||
    !Number.isFinite(p.latitude) ||
    !Number.isFinite(p.longitude) ||
    Math.abs(p.latitude) > 90 ||
    Math.abs(p.longitude) > 180
  )
    throw new Error("Invalid WGS84 coordinates");
}
export function validateArea(value: unknown): Polygon | MultiPolygon {
  if (!value || typeof value !== "object") throw new Error("Missing polygon");
  const g = value as { type?: unknown; coordinates?: unknown };
  if (g.type !== "Polygon" && g.type !== "MultiPolygon")
    throw new Error("Unsupported geometry");
  const polygons = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
  if (!Array.isArray(polygons) || !polygons.length)
    throw new Error("Empty polygon");
  for (const rings of polygons) {
    if (!Array.isArray(rings) || !rings.length) throw new Error("Empty rings");
    for (const ring of rings) {
      if (!Array.isArray(ring) || ring.length < 4)
        throw new Error("Invalid ring");
      for (const point of ring) {
        if (!Array.isArray(point) || point.length < 2)
          throw new Error("Invalid vertex");
        validateCoordinates({ longitude: point[0], latitude: point[1] });
      }
      if (
        ring[0][0] !== ring[ring.length - 1][0] ||
        ring[0][1] !== ring[ring.length - 1][1]
      )
        throw new Error("Unclosed ring");
    }
  }
  return value as Polygon | MultiPolygon;
}
export function containsCoordinate(p: Coordinates, geometry: unknown): boolean {
  validateCoordinates(p);
  return booleanPointInPolygon(
    [p.longitude, p.latitude],
    validateArea(geometry),
  );
}
export function distanceKm(a: Coordinates, b: Coordinates): number {
  validateCoordinates(a);
  validateCoordinates(b);
  return distance([a.longitude, a.latitude], [b.longitude, b.latitude], {
    units: "kilometers",
  });
}
