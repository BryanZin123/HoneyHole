import type { Coordinates } from "../domain/geography";
import type { MarineConditions } from "../domain/marine";
import { distanceKm } from "../domain/spatial";
import { NoaaMarineProvider } from "./noaa";
export interface TideReference {
  status: "available" | "unavailable";
  transferRelevance: "UNVERIFIED";
  distanceKm: number | null;
  conditions: MarineConditions | null;
  reason: string;
}
export async function nearbyTideReference(
  point: Coordinates,
  fetcher: typeof fetch = fetch,
): Promise<TideReference> {
  const base: TideReference = {
    status: "unavailable",
    transferRelevance: "UNVERIFIED",
    distanceKm: null,
    conditions: null,
    reason:
      "No verified local tide transfer. Nearby station products are reference only, not predictions at this beach.",
  };
  try {
    const r = await fetcher(
      "https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json?type=tidepredictions",
      { signal: AbortSignal.timeout(8000), cache: "no-store" },
    );
    if (!r.ok) return base;
    const body = await r.json();
    if (!Array.isArray(body.stations)) return base;
    const candidates = body.stations
      .flatMap(
        (s: { id?: string; lat?: number; lng?: number; state?: string }) => {
          try {
            if (s.state !== "CA" || !s.id?.match(/^\d{7}$/)) return [];
            return [
              {
                id: s.id,
                distance: distanceKm(point, {
                  latitude: Number(s.lat),
                  longitude: Number(s.lng),
                }),
              },
            ];
          } catch {
            return [];
          }
        },
      )
      .filter((s: { distance: number }) => s.distance <= 25)
      .sort(
        (
          a: { id: string; distance: number },
          b: { id: string; distance: number },
        ) => a.distance - b.distance || a.id.localeCompare(b.id),
      );
    const s = candidates[0];
    if (!s) return base;
    const conditions = await new NoaaMarineProvider(fetcher).getConditions(
      s.id,
    );
    if (conditions.station.state !== "CA") return base;
    const distance = distanceKm(point, {
      latitude: conditions.station.latitude,
      longitude: conditions.station.longitude,
    });
    if (distance > 25) return base;
    return { ...base, status: "available", distanceKm: distance, conditions };
  } catch {
    return base;
  }
}
