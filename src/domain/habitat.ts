import type { Coordinates } from "./geography";
import { validDate } from "./effective-regulations";
export interface HabitatSource {
  id: string;
  title: string;
  url: string;
  attribution: string;
  published: string | null;
  reviewedOn: string;
  geographicScope: string;
  limitations: string;
}
export interface SpeciesHabitatProfile {
  commonName: string;
  scientificName: string;
  facts: { statement: string; sourceIds: string[] }[];
  sources: HabitatSource[];
  limitations: string[];
}
export interface LocationHabitatEvidence {
  id: string;
  locationId: string;
  coordinates: Coordinates;
  attribute: "substrate" | "zone";
  value: "sand" | "rock" | "surf-zone" | "inland" | "unknown";
  verification: "verified" | "unverified";
  basis: "field-survey" | "habitat-dataset" | "park-entry";
  sourceUrl: string;
  attribution: string;
  reviewedOn: string;
  reviewDue: string;
  validFrom: string;
  validThrough: string;
}
export interface HabitatContext {
  locationId: string;
  coordinates: Coordinates;
  species: string;
  date: string;
  checkedOn: string;
}
/** Association matching only: no presence claim, legal clearance, score or catch probability. */
export function assessHabitat(
  context: HabitatContext,
  profile: SpeciesHabitatProfile | null,
  records: LocationHabitatEvidence[],
) {
  const species = context.species.trim().toLowerCase();
  const supportedSpecies =
    profile &&
    [
      profile.commonName.toLowerCase(),
      profile.scientificName.toLowerCase(),
    ].includes(species);
  const reviewed =
    supportedSpecies &&
    validDate(context.checkedOn) &&
    profile.sources.length > 0 &&
    profile.sources.every(
      (s) =>
        validDate(s.reviewedOn) &&
        s.reviewedOn <= context.checkedOn &&
        s.url.startsWith("https://"),
    );
  const attributes = (["substrate", "zone"] as const).map((attribute) => {
    const matching = records.filter((r) => r.attribute === attribute);
    const usable = reviewed
      ? matching.filter(
          (r) =>
            r.locationId === context.locationId &&
            r.coordinates.latitude === context.coordinates.latitude &&
            r.coordinates.longitude === context.coordinates.longitude &&
            r.verification === "verified" &&
            r.basis !== "park-entry" &&
            r.sourceUrl.startsWith("https://") &&
            r.attribution.trim() &&
            [
              r.reviewedOn,
              r.reviewDue,
              r.validFrom,
              r.validThrough,
              context.date,
            ].every(validDate) &&
            r.reviewedOn <= context.checkedOn &&
            context.checkedOn <= r.reviewDue &&
            r.validFrom <= context.date &&
            context.date <= r.validThrough &&
            (attribute === "substrate"
              ? ["sand", "rock"].includes(r.value)
              : ["surf-zone", "inland"].includes(r.value)),
        )
      : [];
    const values = [...new Set(usable.map((r) => r.value))];
    const status =
      values.length !== 1
        ? ("missing" as const)
        : values[0] === (attribute === "substrate" ? "sand" : "surf-zone")
          ? ("supported" as const)
          : ("incompatible" as const);
    return {
      attribute,
      status,
      value: values.length === 1 ? values[0] : "unknown",
      evidence: matching,
      reason:
        values.length > 1
          ? "Reviewed records are conflicting; this attribute is unresolved."
          : !values.length
            ? "No reviewed, date-valid habitat evidence for this exact location. Park names and entrance points are insufficient."
            : status === "supported"
              ? "Reviewed attribute matches the documented association; species presence is not established."
              : "Reviewed attribute differs from the sandy surf-zone association; this does not establish species absence.",
    };
  });
  return {
    // Preserve the existing API's overall habitat/suitability uncertainty.
    status: "unknown" as const,
    association: {
      status: reviewed ? ("documented" as const) : ("not-reviewed" as const),
      profile: reviewed ? profile : null,
    },
    locationEvidence: {
      status: attributes.some((a) => a.status === "incompatible")
        ? ("incompatible" as const)
        : attributes.every((a) => a.status === "supported")
          ? ("supported" as const)
          : ("missing" as const),
      attributes,
    },
    speciesPresence: "not-assessed" as const,
    explanation:
      "Habitat association is separate from access, legal eligibility and environmental conditions. No fishing recommendation or catch prediction is established.",
  };
}
