export type Availability = "available" | "missing" | "stale";
export interface ReadinessInput {
  weather: Availability;
  tides: Availability;
  waterTemperature: Availability;
  access: "verified" | "unknown" | "closed";
  regulations: "verified" | "unknown" | "restricted";
}
export interface Readiness {
  status: "blocked" | "incomplete" | "ready-for-analysis";
  reasons: string[];
}
/** Data-readiness gate only; not a scientific suitability score or legal determination. */
export function assessReadiness(input: ReadinessInput): Readiness {
  const reasons: string[] = [];
  if (input.access === "closed") reasons.push("Shoreline access is closed.");
  if (input.regulations === "restricted")
    reasons.push("A known fishing restriction applies.");
  const blocked = reasons.length > 0;
  if (input.access === "unknown")
    reasons.push("Public shoreline access has not been verified.");
  if (input.regulations === "unknown")
    reasons.push("Applicable fishing regulations have not been verified.");
  const labels = {
    weather: "Weather",
    tides: "Tides",
    waterTemperature: "Water temperature",
  };
  for (const key of ["weather", "tides", "waterTemperature"] as const) {
    if (input[key] !== "available")
      reasons.push(`${labels[key]} data is ${input[key]}.`);
  }
  return {
    status: blocked
      ? "blocked"
      : reasons.length
        ? "incomplete"
        : "ready-for-analysis",
    reasons,
  };
}
