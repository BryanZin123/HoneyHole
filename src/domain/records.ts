import type { FishingLocation, Jurisdiction } from "./geography";
/** Persistence-facing contracts, not an implemented database or authentication system. */
export interface UserAccount {
  id: string;
  identityProviderSubject: string;
  createdAt: string;
}
export interface SavedHoneyHole {
  id: string;
  ownerId: string;
  location: FishingLocation;
  notes: string | null;
  visibility: "private" | "public";
  createdAt: string;
  updatedAt: string;
}
export interface FishSpecies {
  id: string;
  commonName: string;
  scientificName: string;
  sourceUrls: string[];
}
export interface RegulationRecord {
  id: string;
  speciesId: string;
  jurisdiction: Jurisdiction;
  geographicScopeId: string;
  description: string;
  effectiveAt: string;
  expiresAt: string | null;
  sourceUrl: string;
  verifiedAt: string;
  status: "verified" | "unverified" | "stale";
}
export interface RecommendationResult {
  id: string;
  locationId: string;
  speciesId: string | null;
  regionId: string;
  window: { start: string; end: string };
  evaluatedAt: string;
  outcome:
    "excluded" | "insufficient-data" | "potentially-favorable" | "unfavorable";
  reasons: string[];
  uncertainties: string[];
  sourceUrls: string[];
  ruleVersion: string;
  method: "evidence-supported" | "provisional-heuristic";
}
