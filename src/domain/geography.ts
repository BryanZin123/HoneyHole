/** Provider-neutral geographic identity. Codes must come from verified source records. */
export interface Coordinates {
  latitude: number;
  longitude: number;
}
export interface Jurisdiction {
  countryCode: string;
  stateCode: string;
  countyCode?: string;
  localAuthorityIds: string[];
}
export interface Region {
  id: string;
  countryCode: string;
  stateCode: string;
  timeZone: string;
  modes: readonly string[];
}
export interface WaterBody {
  id: string;
  name: string;
  kind: "ocean" | "bay" | "estuary" | "lake" | "river";
  coastalRegionId?: string;
}
export interface FishingLocation {
  id: string;
  name: string;
  coordinates: Coordinates;
  regionId: string;
  timeZone: string;
  jurisdiction: Jurisdiction;
  regulatoryJurisdictionIds: string[];
  waterBody: WaterBody | null;
  shorelineAccessId: string | null;
  accessStatus: "unknown" | "verified" | "closed";
}
export interface SpeciesDistribution {
  speciesId: string;
  regionId: string;
  habitatIds: string[];
  sourceUrl: string;
  verifiedAt: string;
}
