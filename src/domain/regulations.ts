import type { Coordinates } from "./geography";
export type RegulatoryStatus =
  "VERIFIED_PERMITTED" | "VERIFIED_PROHIBITED" | "CONDITIONAL" | "UNVERIFIED";
export interface FishingActivity {
  species: string;
  method: string;
  date: string;
  coordinates: Coordinates;
  jurisdiction: string;
}
export const regulatoryQuestions = [
  "species",
  "method",
  "season",
  "size",
  "bag",
  "possession",
  "mpa",
  "emergency",
  "localRules",
  "license",
] as const;
export interface RegulatoryEvidence {
  question: (typeof regulatoryQuestions)[number];
  status: RegulatoryStatus;
  activity: FishingActivity;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  sourceUrl: string;
}
export interface RegulationRecord {
  id: string;
  species: string[];
  jurisdiction: string;
  methods: string[];
  season: unknown;
  size: unknown;
  bag: unknown;
  possession: unknown;
  mpa: unknown;
  emergency: unknown;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  sourceUrl: string;
  reviewedAt: string;
  summary: string;
}
/** A record is relevant only to the exact evaluated activity and known effective dates. */
export function evaluateRegulations(
  activity: FishingActivity,
  evidence: RegulatoryEvidence[],
): RegulatoryStatus {
  const valid = evidence.filter(
    (e) =>
      e.sourceUrl.startsWith("https://") &&
      e.effectiveFrom &&
      e.effectiveTo &&
      activity.date >= e.effectiveFrom &&
      activity.date <= e.effectiveTo &&
      e.activity.species === activity.species &&
      e.activity.method === activity.method &&
      e.activity.date === activity.date &&
      e.activity.jurisdiction === activity.jurisdiction &&
      e.activity.coordinates.latitude === activity.coordinates.latitude &&
      e.activity.coordinates.longitude === activity.coordinates.longitude,
  );
  if (valid.some((e) => e.status === "VERIFIED_PROHIBITED"))
    return "VERIFIED_PROHIBITED";
  if (
    !activity.species.trim() ||
    regulatoryQuestions.some(
      (q) =>
        !valid.some(
          (e) => e.question === q && e.status === "VERIFIED_PERMITTED",
        ),
    )
  )
    return valid.some((e) => e.status === "CONDITIONAL")
      ? "CONDITIONAL"
      : "UNVERIFIED";
  if (valid.some((e) => e.status !== "VERIFIED_PERMITTED")) return "UNVERIFIED";
  return "VERIFIED_PERMITTED";
}
