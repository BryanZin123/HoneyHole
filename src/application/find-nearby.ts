import { discoverShore, type ShoreDiscoveryProvider } from "./discover-shore";
import {
  assessRegulations,
  validDate,
  type EffectiveRule,
} from "../domain/effective-regulations";
import { assessLocationEligibility } from "../domain/location-eligibility";
import { distanceKm, validateCoordinates } from "../domain/spatial";
import type { Coordinates } from "../domain/geography";
export interface NearbyPlan {
  center: Coordinates;
  radiusKm: number;
  species: string;
  date: string;
  method: string;
  style: string;
  period: string;
}
export const styles = ["any", "beach", "pier", "jetty", "rocky shore"] as const;
export const periods = [
  "whole day",
  "morning",
  "afternoon",
  "evening",
] as const;
export function parseNearby(value: unknown): NearbyPlan {
  if (!value || typeof value !== "object") throw Error("Invalid plan");
  const p = value as NearbyPlan;
  if (
    Object.keys(p).some(
      (k) =>
        ![
          "center",
          "radiusKm",
          "species",
          "date",
          "method",
          "style",
          "period",
        ].includes(k),
    ) ||
    !p.center ||
    Object.keys(p.center).some((k) => !["latitude", "longitude"].includes(k))
  )
    throw Error("Invalid center");
  validateCoordinates(p.center);
  if (
    !Number.isFinite(p.radiusKm) ||
    p.radiusKm < 1 ||
    p.radiusKm > 50 ||
    !validDate(p.date) ||
    typeof p.species !== "string" ||
    p.species.length > 80 ||
    !["hand-gathering", "shore-angling"].includes(p.method) ||
    !(styles as readonly string[]).includes(p.style) ||
    !(periods as readonly string[]).includes(p.period)
  )
    throw Error("Invalid plan");
  return p;
}
/** Local distance filter in discoverShore; statewide reviewed rules only. No per-candidate provider fan-out. */
export async function findNearby(
  plan: NearbyPlan,
  provider: ShoreDiscoveryProvider,
  rules: EffectiveRule[],
  checkedOn: string,
) {
  const r = await discoverShore(
    { center: plan.center, radiusKm: plan.radiusKm },
    provider,
  );
  return {
    status: r.status,
    reason: r.reason,
    attribution: r.attribution,
    license: r.license,
    candidates: r.locations
      .map((l) => {
        const regs = assessRegulations(
          {
            activity: {
              coordinates: l.coordinates,
              jurisdiction: "US-CA",
              date: plan.date,
              species: plan.species,
              method: plan.method,
            },
            scopes: [
              { id: "US-CA", authority: "legal", sourceUrl: l.sourceUrl },
            ],
            checkedOn,
          },
          rules,
        );
        const gate = assessLocationEligibility(l.access, regs.status);
        return {
          kind: "park-entry" as const,
          id: l.id,
          name: l.name,
          county: l.county,
          coordinates: l.coordinates,
          sourceUrl: l.sourceUrl,
          parkUrl: l.parkUrl,
          retrievedAt: l.retrievedAt,
          datasetUpdatedAt: l.datasetUpdatedAt,
          distanceKm: distanceKm(plan.center, l.coordinates),
          access: l.access,
          regulatoryStatus: regs.status,
          eligibility: gate.eligibility,
          reasons: gate.reasons,
          findings: regs.findings.map((f) => ({
            status: f.status,
            reason: f.reason,
            sourceUrl: f.rule.sourceUrl,
          })),
        };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm || a.id.localeCompare(b.id)),
  };
}
export type NearbyResult = Awaited<ReturnType<typeof findNearby>>;
