/** Distances are documented conservative bounds supplied by a reviewed geographic adapter,
 * not estimates computed from a display map. Accuracy values are worst-case errors in meters.
 * An RMS accuracy or a confidence percentile alone is not a worst-case bound. */
export function classifySpatialUncertainty(input: {
  relation: "inside" | "outside" | "boundary";
  minimumBoundaryDistanceMeters?: number | null;
  locationAccuracyMeters?: number | null;
  sourceAccuracyMeters?: number | null;
  boundaryUncertaintyMeters?: number | null;
}) {
  const errors = [
    input.locationAccuracyMeters,
    input.sourceAccuracyMeters,
    input.boundaryUncertaintyMeters,
  ];
  const values = [...errors, input.minimumBoundaryDistanceMeters];
  if (values.some((v) => typeof v !== "number" || !Number.isFinite(v) || v < 0))
    return "missing" as const;
  const error = errors.reduce<number>((sum, v) => sum + v!, 0);
  if (!Number.isFinite(error)) return "missing" as const;
  if (
    input.relation === "boundary" ||
    input.minimumBoundaryDistanceMeters! <= error
  )
    return "ambiguous" as const;
  return input.relation === "inside"
    ? ("reliably-inside" as const)
    : ("reliably-outside" as const);
}
