import type { RegulationRecord } from "../domain/regulations";
/** Reviewed source records, not complete machine-executable legal clearance. Unknown effective dates preserved. */
export const californiaRegulationRecords: RegulationRecord[] = [
  {
    id: "CCR-27.60",
    species: ["finfish; exceptions apply"],
    jurisdiction: "US-CA ocean and San Francisco Bay district",
    methods: ["shore-angling"],
    season: null,
    size: null,
    bag: { combined: 20, perSpecies: 10, exceptionsRequireReview: true },
    possession: { combined: 20, perSpecies: 10, exceptionsRequireReview: true },
    mpa: null,
    emergency: null,
    effectiveFrom: null,
    effectiveTo: null,
    sourceUrl:
      "https://wildlife.ca.gov/Fishing/Ocean/Regulations/Sport-Fishing/General-Ocean-Fishing-Regs",
    reviewedAt: "2026-10-21",
    summary:
      "General finfish limits have species-specific exceptions. This record cannot establish permission or a species-specific limit.",
  },
  {
    id: "MPA-632",
    species: [],
    jurisdiction: "US-CA marine protected areas",
    methods: ["shore-angling"],
    season: null,
    size: null,
    bag: null,
    possession: null,
    mpa: { legalBoundaryVerified: false },
    emergency: null,
    effectiveFrom: null,
    effectiveTo: null,
    sourceUrl: "https://wildlife.ca.gov/Conservation/Marine/MPAs",
    reviewedAt: "2026-10-21",
    summary:
      "Individual protected areas have different extraction restrictions. Advisory GIS overlap is not a legal boundary determination.",
  },
  {
    id: "INSEASON",
    species: [],
    jurisdiction: "US-CA ocean",
    methods: ["shore-angling"],
    season: null,
    size: null,
    bag: null,
    possession: null,
    mpa: null,
    emergency: { coverageVerified: false },
    effectiveFrom: null,
    effectiveTo: null,
    sourceUrl: "https://wildlife.ca.gov/Fishing/Ocean/Regulations/Inseason",
    reviewedAt: "2026-10-21",
    summary:
      "In-season and health restrictions require current location/species review. No absence-of-restrictions determination has been made.",
  },
];
