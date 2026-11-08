import type { Coordinates } from "../domain/geography";
import type { WarningEvidence, WarningProvider } from "./warning-provider";
/** One bounded cache and shared in-flight gate. No polling or scheduled retries. */
export function entranceWarnings(
  provider: WarningProvider,
  now: () => number = Date.now,
) {
  let last = -Infinity,
    key = "",
    pending: Promise<WarningEvidence> | undefined,
    inFlight = false;
  return async (point: Coordinates, date: string): Promise<WarningEvidence> => {
    const attempted = now(),
      next = JSON.stringify([point.latitude, point.longitude, date]);
    const stamp = (
      e: WarningEvidence,
      delivery: "fresh" | "reused" | "deferred",
      allowed: number,
    ): WarningEvidence => ({
      ...e,
      refresh: {
        delivery,
        attemptedAt: new Date(attempted).toISOString(),
        nextAllowedAt: new Date(allowed).toISOString(),
      },
    });
    if (inFlight || attempted - last < 30000) {
      const allowed = Math.max(
        last + 30000,
        attempted + (inFlight ? 30000 : 0),
      );
      if (next === key && pending)
        return stamp(await pending, "reused", allowed);
      return stamp(
        {
          status: "unknown",
          coordinates: point,
          sourceUrl: "https://api.weather.gov/alerts/active",
          retrievedAt: new Date(attempted).toISOString(),
          updatedAt: null,
          alerts: [],
          reason:
            "NWS request spacing or an in-flight request prevents this check. This entrance/date was not queried; retry explicitly after the displayed time.",
        },
        "deferred",
        allowed,
      );
    }
    last = attempted;
    key = next;
    inFlight = true;
    pending = Promise.resolve()
      .then(() => provider.get(point, date))
      .catch(() => ({
        status: "unknown" as const,
        coordinates: point,
        sourceUrl: "https://api.weather.gov/alerts/active",
        retrievedAt: new Date(now()).toISOString(),
        updatedAt: null,
        alerts: [],
        reason: "NWS warning retrieval failed.",
      }))
      .finally(() => {
        inFlight = false;
      });
    return stamp(await pending, "fresh", last + 30000);
  };
}
