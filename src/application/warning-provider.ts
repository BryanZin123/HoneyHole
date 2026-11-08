import type { Coordinates } from "../domain/geography";
export type CoastalWarning = {
  id: string;
  sourceUrl: string;
  event: string;
  sender: string;
  severity: string;
  urgency: string;
  certainty: string;
  area: string;
  sent: string;
  effective: string;
  onset: string | null;
  expires: string;
  ends: string | null;
  instruction: string | null;
  applicability: "polygon" | "NWS point/zone" | "unknown";
  period: "overlap" | "outside" | "unknown";
  zones: string[];
};
export type WarningEvidence = {
  refresh?: {
    delivery: "fresh" | "reused" | "deferred";
    attemptedAt: string;
    nextAllowedAt: string;
  };
  status: "available" | "empty" | "unknown";
  coordinates: Coordinates;
  sourceUrl: string;
  retrievedAt: string;
  updatedAt: string | null;
  alerts: CoastalWarning[];
  reason: string;
};
export interface WarningProvider {
  get(point: Coordinates, date: string): Promise<WarningEvidence>;
}
