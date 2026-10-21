import { assessReadiness } from "../domain/readiness";
export function getDashboard() {
  return {
    title: "Your next day on the coast.",
    readiness: assessReadiness({
      weather: "missing",
      tides: "missing",
      waterTemperature: "missing",
      access: "unknown",
      regulations: "unknown",
    }),
  };
}
