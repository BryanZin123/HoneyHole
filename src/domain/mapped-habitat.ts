import { booleanPointInPolygon } from "@turf/boolean-point-in-polygon";
import { validateArea, validateCoordinates } from "./spatial";
import { classifySpatialUncertainty } from "./spatial-uncertainty";
import { validDate } from "./effective-regulations";
import type { Coordinates } from "./geography";
export interface HabitatPoint {
  id: string;
  coordinates: Coordinates;
  kind: "park-entry" | "fishing-point" | "environmental-station" | "unknown";
  accuracyMeters: number | null;
}
/** WGS84 geometry only. Distances/accuracy must be conservative bounds from a reviewed adapter.
 * Dataset extent is NOT a classified feature. A retrieval date is NOT an observation date. */
export interface MappedFeature {
  datasetId: string;
  featureId: string;
  pointId: string;
  queriedCoordinates: Coordinates;
  geometry: unknown;
  classification: "hard" | "soft" | "unknown";
  basis: "observed" | "mapped" | "predicted" | "historical";
  resolutionMeters: number | null;
  positionalAccuracyMeters: number | null;
  minimumBoundaryDistanceMeters: number | null;
  observedOn: string | null;
  validThrough: string | null;
}
/** Diagnostic context only. This function cannot issue verified habitat evidence. */
export function assessMappedHabitat(
  point: HabitatPoint,
  date: string,
  records: MappedFeature[],
) {
  validateCoordinates(point.coordinates);
  const features = records.map((record) => {
    let relation: "inside" | "outside" | "boundary" | "unverified" =
      "unverified";
    try {
      validateCoordinates(record.queriedCoordinates);
      if (
        !record.datasetId ||
        !record.featureId ||
        record.pointId !== point.id ||
        record.queriedCoordinates.latitude !== point.coordinates.latitude ||
        record.queriedCoordinates.longitude !== point.coordinates.longitude
      )
        throw Error("Identity mismatch");
      const geometry = validateArea(record.geometry);
      const xy = [point.coordinates.longitude, point.coordinates.latitude];
      relation = !booleanPointInPolygon(xy, geometry)
        ? "outside"
        : booleanPointInPolygon(xy, geometry, { ignoreBoundary: true })
          ? "inside"
          : "boundary";
    } catch {
      /* Missing or invalid geometry/identity stays unverified. */
    }
    const spatialConfidence =
      relation === "unverified"
        ? ("missing" as const)
        : classifySpatialUncertainty({
            relation,
            locationAccuracyMeters: point.accuracyMeters,
            sourceAccuracyMeters: record.positionalAccuracyMeters,
            // A full raster-cell diagonal is a conservative additional footprint uncertainty,
            // not an estimate of survey accuracy. Unknown accuracy still blocks applicability.
            boundaryUncertaintyMeters:
              record.resolutionMeters !== null && record.resolutionMeters >= 0
                ? record.resolutionMeters * Math.SQRT2
                : null,
            minimumBoundaryDistanceMeters: record.minimumBoundaryDistanceMeters,
          });
    const dateApplicable = Boolean(
      record.observedOn &&
      record.validThrough &&
      [date, record.observedOn, record.validThrough].every(validDate) &&
      record.observedOn <= date &&
      date <= record.validThrough,
    );
    return { ...record, relation, spatialConfidence, dateApplicable };
  });
  const relevant = features.filter(
    (f) => f.relation === "inside" || f.relation === "boundary",
  );
  const conflicting =
    new Set(
      relevant.map((f) => f.classification).filter((c) => c !== "unknown"),
    ).size > 1;
  const reasons = [
    "Predicted, mapped or historical context does not establish current sandy surf-zone habitat.",
  ];
  if (point.kind !== "fishing-point")
    reasons.push(
      "The selected coordinate is not an independently identified fishing point.",
    );
  if (!features.length)
    reasons.push(
      "No classified dataset feature or pixel was sampled for this coordinate.",
    );
  if (features.some((f) => f.spatialConfidence !== "reliably-inside"))
    reasons.push(
      "Feature identity, intersection or conservative positional uncertainty is unresolved.",
    );
  if (features.some((f) => !f.dateApplicable))
    reasons.push(
      "Observation dates or current temporal applicability are missing or outside the selected date.",
    );
  if (conflicting)
    reasons.push(
      "Source classifications conflict; no preferred classification is selected.",
    );
  return {
    status: "UNVERIFIED" as const,
    point,
    features,
    conflicting,
    reasons,
  };
}
