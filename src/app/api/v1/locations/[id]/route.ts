import { body } from "../../../../../application/account-http";
import { UserDataError } from "../../../../../domain/user-data";
import type { Coordinates } from "../../../../../domain/geography";
import { validateCoordinates } from "../../../../../domain/spatial";
import { getShorelineContext } from "../../../../../application/get-shoreline-context";
import { CdfwShorelineProvider } from "../../../../../infrastructure/cdfw-shoreline";
import { CdfwMappedContext } from "../../../../../infrastructure/cdfw-mapped-context";
import { CaliforniaHabitatEvidence } from "../../../../../infrastructure/california-habitat";
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
  return assess(id, p);
}
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const headers = {
    "Cache-Control": "private, no-store",
    "X-API-Version": "1",
  };
  if (
    request.headers.get("origin") !==
    (process.env.BETTER_AUTH_URL ?? "http://localhost:3000")
  )
    return Response.json(
      { error: "Request origin rejected." },
      { status: 403, headers },
    );
  try {
    const v = await body(request);
    if (
      !v ||
      typeof v !== "object" ||
      Object.keys(v).some(
        (k) =>
          !["coordinates", "consent", "date", "species", "method"].includes(k),
      ) ||
      v.consent !== true ||
      typeof v.date !== "string" ||
      typeof v.species !== "string" ||
      typeof v.method !== "string" ||
      new URL(request.url).search
    )
      throw Error();
    validateCoordinates(v.coordinates);
    return await assess(
      (await params).id,
      new URLSearchParams({
        species: v.species,
        date: v.date,
        method: v.method,
      }),
      v.coordinates,
    );
  } catch (e) {
    return Response.json(
      {
        error:
          "Explicit consent and the exact published entrance are required.",
      },
      { status: e instanceof UserDataError ? e.status : 400, headers },
    );
  }
}
async function assess(id: string, p: URLSearchParams, expected?: Coordinates) {
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
    if (
      expected &&
      (expected.latitude !== location.coordinates.latitude ||
        expected.longitude !== location.coordinates.longitude)
    )
      return Response.json(
        {
          error:
            "Source coordinates changed; repeat discovery and confirm the new entrance.",
        },
        { status: 409, headers },
      );
    const detail = await getLocationDetail(
      location,
      {
        species,
        method,
        date,
        coordinates: location.coordinates,
        jurisdiction: "US-CA",
      },
      {
        habitat: new CaliforniaHabitatEvidence(),
        mappedContext: new CdfwMappedContext(),
        weather: new NwsWeatherProvider(),
        atmosphere: new NwsAtmosphereProvider(),
        access: new CaliforniaCoastalProvider(),
        tides: {
          get: (point, date) => nearbyTideReference(point, fetch, date),
        },
        regulations: californiaRegulationRecords,
        regulationProvider: new CaliforniaRegulationProvider(),
        jurisdiction: (access) =>
          new CaliforniaJurisdictionProvider(location, access.protectedAreas),
        // Canonical State Parks California entries establish state only, never MPA/local legal boundaries.
        regulatoryScopes: [
          { id: "US-CA", authority: "legal", sourceUrl: location.sourceUrl },
        ],
      },
    );
    return Response.json(
      expected
        ? {
            ...detail,
            shoreline: await getShorelineContext(
              location.coordinates,
              new CdfwShorelineProvider(),
            ),
          }
        : detail,
      { headers },
    );
  } catch {
    return Response.json(
      { error: "Location evidence is temporarily unavailable." },
      { status: 502, headers },
    );
  }
}
