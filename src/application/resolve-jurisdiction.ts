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
}
export interface JurisdictionProvider {
  getEvidence(point: Coordinates): Promise<JurisdictionEvidence[]>;
}
/** Conservative exact-point resolver. Nonzero/unknown uncertainty needs a reviewed buffer policy; no legal scopes are emitted for it. */
export async function resolveJurisdiction(
  point: Coordinates,
  activityDate: string,
  checkedOn: string,
  provider: JurisdictionProvider,
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
    if (record.authority !== "legal")
      reason =
        "Administrative or advisory data does not establish a legal boundary.";
    else if (
      !record.sourceUrl.startsWith("https://") ||
      !record.attribution ||
      !record.geometry ||
      record.precisionMeters !== 0
    )
      reason =
        "Reviewed legal geometry or exact spatial precision is unavailable.";
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
        if (
          booleanPointInPolygon([point.longitude, point.latitude], geometry, {
            ignoreBoundary: true,
          })
        ) {
          status = "VERIFIED";
          reason =
            "Exact point is strictly inside the reviewed legal geometry for the selected date.";
        } else
          reason =
            "Point is outside or on the boundary; no applicability established.";
      } catch {
        reason = "Invalid source geometry.";
      }
    }
    return { ...record, status, reason };
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
