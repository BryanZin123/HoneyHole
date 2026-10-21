import type { Coordinates } from "./geography";
export type ShoreType =
  "beach" | "pier" | "jetty" | "rocky-shore" | "bay" | "estuary" | "unknown";
export type AccessStatus = "verified-public" | "restricted" | "unknown";
export interface GeographicSource {
  url: string;
  attribution: string;
  license: string;
  datasetVersion: string;
  retrievedAt: string;
}
export interface GeographicEvidence {
  id: string;
  name: string;
  access: AccessStatus;
  sourceAccessValue: string | null;
  shoreType: ShoreType;
  designation: string | null;
}
export interface EvidenceResult {
  status: "available" | "unavailable";
  records: GeographicEvidence[];
  source: GeographicSource;
  reason?: string;
}
export interface CoastalAssessment {
  coordinates: Coordinates;
  regionId: string;
  access: { status: AccessStatus; evidence: EvidenceResult };
  protectedAreas: EvidenceResult;
  fishingPermission: "unknown";
  temporaryClosures: "unknown";
  speciesRegulations: "unknown";
  legallyVerified: false;
}
