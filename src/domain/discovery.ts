import type { Coordinates } from "./geography";
export interface ShoreLocation {
  id: string;
  name: string;
  coordinates: Coordinates;
  type: "beach";
  county: string;
  access: "unknown";
  sourceUrl: string;
  parkUrl: string | null;
  retrievedAt: string;
  datasetUpdatedAt: string | null;
  sourceFeature: unknown;
}
export interface DiscoveryQuery {
  county?: string;
  center?: Coordinates;
  radiusKm?: number;
}
export interface DiscoveryResult {
  status: "available" | "unavailable";
  locations: ShoreLocation[];
  reason?: string;
  attribution: string;
  license: string;
}
