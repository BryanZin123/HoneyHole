import type { Coordinates } from "../domain/geography";
import type { WarningEvidence, WarningProvider } from "./warning-provider";
/** Per-process 30-second source throttle, one bounded public-entrance cache. No background polling. */
export function entranceWarnings(
  provider: WarningProvider,
  now: () => number = Date.now,
) {
  let last = -Infinity,
    key = "",
    pending: Promise<WarningEvidence> | undefined;
  return (point: Coordinates, date: string) => {
    const next = JSON.stringify([point.latitude, point.longitude, date]);
    if (now() - last < 30000) {
      if (next === key && pending) return pending;
      return Promise.resolve<WarningEvidence>({
        status: "unknown",
        coordinates: point,
        sourceUrl: "https://api.weather.gov/alerts/active",
        retrievedAt: new Date(now()).toISOString(),
        updatedAt: null,
        alerts: [],
        reason:
          "NWS request spacing: wait at least 30 seconds before checking another entrance. This entrance was not queried.",
      });
    }
    last = now();
    key = next;
    pending = provider.get(point, date);
    return pending;
  };
}
