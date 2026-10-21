export interface Station {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  state: string;
  countryCode: string;
}
export interface Measurement {
  value: number;
  unit: "°C" | "m";
  validAt: string;
  kind: "observation" | "prediction";
  datum?: "MLLW";
  phase?: "high" | "low";
}
export interface ProductResult {
  status: "available" | "stale" | "unavailable";
  measurements: Measurement[];
  sourceUrl: string;
  retrievedAt: string;
  reason?: string;
}
export interface MarineConditions {
  station: Station;
  waterTemperature: ProductResult;
  tides: ProductResult;
}
