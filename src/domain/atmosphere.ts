import type { Coordinates } from "./geography";
export interface EvidenceStatus {
  status: "available" | "stale" | "unavailable";
  sourceUrl: string;
  retrievedAt: string;
  reason?: string;
}
export interface Atmosphere {
  coordinates: Coordinates;
  grid: EvidenceStatus & {
    kind: "forecast";
    updatedAt: string | null;
    values: {
      parameter: "cloudCover" | "windGust";
      value: number;
      unit: "%" | "m/s";
      start: string;
      end: string;
    }[];
  };
  pressure: EvidenceStatus & {
    kind: "observation";
    stationId: string | null;
    stationCoordinates: Coordinates | null;
    distanceKm: number | null;
    observedAt: string | null;
    hPa: number | null;
    trendHpaPerHour: number | null;
    trendFrom: string | null;
  };
  light: EvidenceStatus & {
    kind: "calculated";
    sunrise: string | null;
    sunset: string | null;
    civilDawn: string | null;
    civilDusk: string | null;
    phase: "daylight" | "civil-twilight" | "night" | "unknown";
  };
}
