import { CaliforniaJurisdictionProvider } from "../../../../../infrastructure/california-jurisdiction";
import { CaliforniaRegulationProvider } from "../../../../../infrastructure/california-effective-rules";
import { StateParksDiscovery } from "../../../../../infrastructure/state-parks-discovery";
import { NwsWeatherProvider } from "../../../../../infrastructure/nws";
import { NwsAtmosphereProvider } from "../../../../../infrastructure/nws-atmosphere";
import { CaliforniaCoastalProvider } from "../../../../../infrastructure/california-coastal";
import { californiaRegulationRecords } from "../../../../../infrastructure/california-regulations";
import { nearbyTideReference } from "../../../../../infrastructure/nearby-tide-reference";
import { getLocationDetail } from "../../../../../application/get-location-detail";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const p = new URL(request.url).searchParams;
  const date =
    p.get("date") ??
    new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
  const method = p.get("method") ?? "shore-angling";
  const species = (p.get("species") ?? "").trim();
  const headers = { "Cache-Control": "no-store", "X-API-Version": "1" };
  if (
    !/^\d{1,10}$/.test(id) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date)) ||
    new Date(date).toISOString().slice(0, 10) !== date ||
    species.length > 80 ||
    !["shore-angling", "hand-gathering"].includes(method)
  )
    return Response.json(
      { error: "Invalid location, date or species." },
      { status: 400, headers },
    );
  try {
    const location = await new StateParksDiscovery().get(id);
    if (!location)
      return Response.json(
        { error: "Location not found or source unavailable." },
        { status: 404, headers },
      );
    return Response.json(
      await getLocationDetail(
        location,
        {
          species,
          method,
          date,
          coordinates: location.coordinates,
          jurisdiction: "US-CA",
        },
        {
          weather: new NwsWeatherProvider(),
          atmosphere: new NwsAtmosphereProvider(),
          access: new CaliforniaCoastalProvider(),
          tides: { get: nearbyTideReference },
          regulations: californiaRegulationRecords,
          regulationProvider: new CaliforniaRegulationProvider(),
          jurisdiction: (access) =>
            new CaliforniaJurisdictionProvider(location, access.protectedAreas),
          // Canonical State Parks California entries establish state only, never MPA/local legal boundaries.
          regulatoryScopes: [
            { id: "US-CA", authority: "legal", sourceUrl: location.sourceUrl },
          ],
        },
      ),
      { headers },
    );
  } catch {
    return Response.json(
      { error: "Location evidence is temporarily unavailable." },
      { status: 502, headers },
    );
  }
}
