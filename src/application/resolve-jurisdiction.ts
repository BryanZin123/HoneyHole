import { classifySpatialUncertainty } from "../domain/spatial-uncertainty";
import { booleanPointInPolygon } from "@turf/boolean-point-in-polygon";
import type { Polygon, MultiPolygon } from "geojson";
import type { Coordinates } from "../domain/geography";
import type { RegulatoryContext } from "../domain/effective-regulations";
import { validDate } from "../domain/effective-regulations";
import { validateArea, validateCoordinates } from "../domain/spatial";
export const jurisdictionKinds = [
  "state",
  "region",
  "water",
  "mpa",
  "local",
] as const;
export type JurisdictionKind = (typeof jurisdictionKinds)[number];
export interface JurisdictionEvidence {
  id: string;
  label: string;
  kind: JurisdictionKind;
  authority: "legal" | "advisory" | "administrative";
  sourceUrl: string;
  attribution: string;
  retrievedAt: string;
  verifiedOn: string | null;
  reviewDue: string | null;
  effectiveFrom: string | null;
  effectiveThrough: string | null;
  precisionMeters: number | null;
  geometry: Polygon | MultiPolygon | null;
  /** Reviewed lower-bound distance to every ring, including holes, for this exact query point. */
  spatialEvidence?: {
    point: Coordinates;
    minimumBoundaryDistanceMeters: number;
    boundaryUncertaintyMeters: number;
    method: string;
    sourceUrl: string;
  };
}
export interface JurisdictionProvider {
  getEvidence(point: Coordinates): Promise<JurisdictionEvidence[]>;
}
/** Legal authority and dated geometry are required independently of spatial confidence. */
export async function resolveJurisdiction(
  point: Coordinates,
  activityDate: string,
  checkedOn: string,
  provider: JurisdictionProvider,
  locationAccuracyMeters: number | null = null,
) {
  validateCoordinates(point);
  if (!validDate(activityDate) || !validDate(checkedOn))
    throw new Error("Invalid jurisdiction date");
  let records: JurisdictionEvidence[] = [];
  let providerStatus: "available" | "unavailable" = "available";
  try {
    records = await provider.getEvidence(point);
  } catch {
    providerStatus = "unavailable";
  }
  const findings = records.map((record) => {
    let reason = "Legal geographic applicability is unresolved.";
    let status: "VERIFIED" | "UNVERIFIED" = "UNVERIFIED";
    let spatialStatus: ReturnType<typeof classifySpatialUncertainty> =
      "missing";
    if (record.authority !== "legal")
      reason =
        "Administrative or advisory data does not establish a legal boundary.";
    else if (
      !record.sourceUrl.startsWith("https://") ||
      !record.attribution ||
      !record.geometry
    )
      reason = "Reviewed legal geometry is unavailable.";
    else if (
      [
        record.verifiedOn,
        record.reviewDue,
        record.effectiveFrom,
        record.effectiveThrough,
      ].some((d) => !d || !validDate(d)) ||
      !Number.isFinite(Date.parse(record.retrievedAt))
    )
      reason = "Source dates are incomplete or invalid.";
    else if (
      record.verifiedOn! > checkedOn ||
      checkedOn > record.reviewDue! ||
      activityDate < record.effectiveFrom! ||
      activityDate > record.effectiveThrough! ||
      record.effectiveFrom! > record.effectiveThrough! ||
      record.verifiedOn! > record.reviewDue!
    )
      reason = "Activity or source review is outside the evidence window.";
    else {
      try {
        const geometry = validateArea(record.geometry);
        const interior = booleanPointInPolygon(
          [point.longitude, point.latitude],
          geometry,
          { ignoreBoundary: true },
        );
        const inclusive = booleanPointInPolygon(
          [point.longitude, point.latitude],
          geometry,
        );
        const evidence = record.spatialEvidence;
        if (
          evidence &&
          evidence.point.latitude === point.latitude &&
          evidence.point.longitude === point.longitude &&
          evidence.method.trim() &&
          evidence.sourceUrl.startsWith("https://")
        ) {
          spatialStatus = classifySpatialUncertainty({
            relation: interior ? "inside" : inclusive ? "boundary" : "outside",
            minimumBoundaryDistanceMeters:
              evidence.minimumBoundaryDistanceMeters,
            locationAccuracyMeters,
            sourceAccuracyMeters: record.precisionMeters,
            boundaryUncertaintyMeters: evidence.boundaryUncertaintyMeters,
          });
        }
        if (spatialStatus === "reliably-inside") {
          status = "VERIFIED";
          reason =
            "Reviewed legal geometry contains the point beyond the combined location, source and boundary uncertainty.";
        } else
          reason =
            spatialStatus === "reliably-outside"
              ? "Reliably outside this geometry; this does not establish any alternative jurisdiction or fishing permission."
              : "Geographic clearance or uncertainty evidence is missing or overlaps a boundary.";
      } catch {
        reason = "Invalid source geometry.";
      }
    }
    return { ...record, status, reason, spatialStatus };
  });
  const scopes: RegulatoryContext["scopes"] = [];
  const dimensions = Object.fromEntries(
    jurisdictionKinds.map((kind) => {
      const applicable = findings.filter(
        (f) => f.kind === kind && f.status === "VERIFIED",
      );
      const ids = [...new Set(applicable.map((f) => f.id))];
      const conflict =
        ["state", "region", "water"].includes(kind) && ids.length > 1;
      if (!conflict)
        for (const f of applicable)
          if (!scopes.some((s) => s.id === f.id))
            scopes.push({
              id: f.id,
              authority: "legal",
              sourceUrl: f.sourceUrl,
            });
      return [
        kind,
        {
          status:
            applicable.length && !conflict
              ? ("VERIFIED" as const)
              : ("UNVERIFIED" as const),
          labels: conflict ? [] : [...new Set(applicable.map((f) => f.label))],
          reason: conflict
            ? "Conflicting geographic classifications require review."
            : applicable.length
              ? "See source evidence."
              : "No reviewed legal geographic evidence for this location.",
        },
      ];
    }),
  ) as Record<
    JurisdictionKind,
    { status: "VERIFIED" | "UNVERIFIED"; labels: string[]; reason: string }
  >;
  return {
    coordinates: point,
    activityDate,
    checkedOn,
    providerStatus,
    dimensions,
    findings,
    scopes,
  };
}
