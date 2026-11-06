import {
  inShorelinePilot,
  shorelineDistance,
  type ShorelineResult,
} from "../domain/shoreline-context";
import type { Coordinates } from "../domain/geography";
export interface ShorelinePort {
  get(region?: "monterey-bay"): Promise<ShorelineResult>;
}
export async function getShorelineContext(
  coordinates: Coordinates,
  provider: ShorelinePort,
) {
  let shoreline: ShorelineResult = {
    status: "empty",
    features: [],
    retrievedAt: null,
  };
  const inside = inShorelinePilot(coordinates);
  if (inside) {
    try {
      shoreline =
        coordinates.latitude < 37
          ? await provider.get("monterey-bay")
          : await provider.get();
    } catch {
      shoreline = { status: "unavailable", features: [], retrievedAt: null };
    }
  }
  const geometries = new Map<string, string>();
  let conflictingGeometry = false;
  const features = shoreline.features
    .map(({ geometry, ...feature }) => {
      const key = JSON.stringify(geometry);
      if (geometries.has(key) && geometries.get(key) !== feature.shoreCode)
        conflictingGeometry = true;
      geometries.set(key, feature.shoreCode);
      return {
        ...feature,
        distanceMeters: shorelineDistance(coordinates, geometry),
        positionalAccuracyMeters: null,
      };
    })
    .sort(
      (a, b) => a.distanceMeters - b.distanceMeters || a.id.localeCompare(b.id),
    );
  return {
    status: inside ? shoreline.status : "outside-pilot",
    retrievedAt: shoreline.retrievedAt,
    features,
    conflictingGeometry,
    pointClassification: "UNVERIFIED" as const,
  };
}
