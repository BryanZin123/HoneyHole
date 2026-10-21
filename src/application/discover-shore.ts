import type { DiscoveryQuery, DiscoveryResult } from "../domain/discovery";
import { validateCoordinates } from "../domain/spatial";
export interface ShoreDiscoveryProvider {
  search(query: DiscoveryQuery): Promise<DiscoveryResult>;
}
export async function discoverShore(
  query: DiscoveryQuery,
  provider: ShoreDiscoveryProvider,
) {
  if (query.center) {
    validateCoordinates(query.center);
    if (
      !Number.isFinite(query.radiusKm) ||
      query.radiusKm! < 1 ||
      query.radiusKm! > 50
    )
      throw Error("Radius must be 1–50 km");
  } else if (!query.county)
    throw Error("Choose a coastal county or coordinate");
  return provider.search(query);
}
