import type { MarineConditions } from "../domain/marine";
import type { Region } from "../domain/geography";
export interface MarineProvider {
  getConditions(stationId: string): Promise<MarineConditions>;
}
export interface RegionalMarineConditions extends MarineConditions {
  region: Region;
}
export async function getMarineConditions(
  stationId: string,
  provider: MarineProvider,
  region: Region,
): Promise<RegionalMarineConditions> {
  if (!stationId.trim() || stationId.length > 128)
    throw new Error("A station identifier is required.");
  const conditions = await provider.getConditions(stationId);
  if (
    conditions.station.countryCode !== region.countryCode ||
    conditions.station.state !== region.stateCode
  )
    throw new Error("Station is outside the active region.");
  return { ...conditions, region };
}
