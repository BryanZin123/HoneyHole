import { pointToLineDistance } from "@turf/point-to-line-distance";
import type { Coordinates } from "./geography";
import type { LineString, MultiLineString } from "geojson";
import { validateCoordinates } from "./spatial";
const known = new Set(
  "1A 1B 1C 2 2A 2B 3 3A 3B 3C 4 5 6A 6B 6D 7 8A 8B 8C 8D 8E 9 9A 9B 9C 10A 10B 10C 10D 10E 10F S".split(
    " ",
  ),
);
export function interpretShoreCodes(raw: string) {
  return raw.split("/").map((token) => {
    const code = token.trim();
    const category = !known.has(code)
      ? "unresolved"
      : ["3", "3A"].includes(code)
        ? "fine-medium-sand"
        : code === "4"
          ? "coarse-sand"
          : code === "5"
            ? "mixed-sand-gravel"
            : ["1A", "1C", "2", "2A", "8D"].includes(code)
              ? "rocky"
              : ["1B", "6B", "8B", "8C"].includes(code)
                ? "engineered"
                : "other";
    return { code, category };
  });
}
export function shorelineGeometry(
  value: unknown,
): LineString | MultiLineString {
  if (!value || typeof value !== "object") throw Error("Missing geometry");
  const g = value as LineString | MultiLineString;
  if (!["LineString", "MultiLineString"].includes(g.type))
    throw Error("Invalid geometry");
  const lines = g.type === "LineString" ? [g.coordinates] : g.coordinates;
  if (!Array.isArray(lines) || !lines.length) throw Error("Missing lines");
  let count = 0;
  for (const line of lines) {
    if (!Array.isArray(line) || line.length < 2) throw Error("Invalid line");
    for (const c of line) {
      if (!Array.isArray(c) || c.length !== 2) throw Error("Invalid vertex");
      validateCoordinates({ longitude: c[0], latitude: c[1] });
      count++;
    }
  }
  if (count > 100000) throw Error("Too many vertices");
  return g;
}
export function shorelineDistance(point: Coordinates, value: unknown): number {
  validateCoordinates(point);
  const g = shorelineGeometry(value);
  const lines = g.type === "LineString" ? [g.coordinates] : g.coordinates;
  return Math.min(
    ...lines.map((coordinates) =>
      pointToLineDistance(
        [point.longitude, point.latitude],
        { type: "LineString", coordinates },
        { units: "meters", method: "geodesic" },
      ),
    ),
  );
}
export interface ShorelineFeature {
  id: string;
  line: string;
  shoreCode: string;
  source: string | null;
  sourceYear: number | null;
  description: string;
  orderedSourceTypes: { code: string; name: string }[];
  codes: ReturnType<typeof interpretShoreCodes>;
  codeConflict: boolean;
  geometry: LineString | MultiLineString;
}
export interface ShorelineResult {
  status: "available" | "empty" | "unavailable";
  retrievedAt: string | null;
  features: ShorelineFeature[];
}
export function inShorelinePilot(p: Coordinates) {
  validateCoordinates(p);
  return (
    p.latitude >= 37.35 &&
    p.latitude <= 37.65 &&
    p.longitude >= -122.65 &&
    p.longitude <= -122.35
  );
}
