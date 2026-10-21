import type { Coordinates } from "./geography";
export interface ForecastPeriod {
  start: string;
  end: string;
  airTemperatureC: number | null;
  windSpeedMps: { minimum: number; maximum: number } | null;
  windDirection: string | null;
  isDaytime: boolean | null;
  summary: string | null;
}
export interface WeatherForecast {
  status: "available" | "stale" | "unavailable";
  kind: "forecast";
  coordinates: Coordinates;
  sourceUrl: string;
  retrievedAt: string;
  requestStartedAt?: string;
  responseReceivedAt?: string;
  errorCode?: string;
  issuedAt: string | null;
  updatedAt: string | null;
  generatedAt: string | null;
  timeZone: string | null;
  periods: ForecastPeriod[];
  missingFields: string[];
  reason?: string;
}
