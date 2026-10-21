/** Bounded operational policy: five nearest candidates within 25 km; no interpolation. */
export async function selectObservation<
  S extends { id: string; distance: number },
  T extends { status: string },
>(stations: S[], load: (station: S) => Promise<T>): Promise<T | null> {
  const candidates = stations
    .filter(
      (s) => Number.isFinite(s.distance) && s.distance >= 0 && s.distance <= 25,
    )
    .sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id))
    .slice(0, 5);
  const observations = await Promise.all(
    candidates.map(async (s) => {
      try {
        return await load(s);
      } catch {
        return null;
      }
    }),
  );
  return observations.find((o) => o?.status === "available") ?? null;
}
