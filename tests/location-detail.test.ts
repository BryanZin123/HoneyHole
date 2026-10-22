import { expect, it, vi } from "vitest";
import { getLocationDetail } from "../src/application/get-location-detail";
import { NwsWeatherProvider } from "../src/infrastructure/nws";
import { NwsAtmosphereProvider } from "../src/infrastructure/nws-atmosphere";
import { CaliforniaCoastalProvider } from "../src/infrastructure/california-coastal";
import type { ShoreLocation } from "../src/domain/discovery";
const location: ShoreLocation = {
  id: "1",
  name: "Fixture SB",
  coordinates: { latitude: 37.5, longitude: -122.5 },
  type: "beach",
  county: "San Mateo",
  access: "unknown",
  sourceUrl: "https://example.test",
  parkUrl: null,
  retrievedAt: "2026-10-21T00:00:00Z",
  datasetUpdatedAt: null,
  sourceFeature: {},
};
it("maps weather to selected coordinates, keeps unavailable products independent and forbids legal clearance", async () => {
  const offline = async () => {
    throw Error("offline");
  };
  const weather = new NwsWeatherProvider(offline);
  const spy = vi.spyOn(weather, "getForecast");
  const tides = {
    get: vi.fn(async () => ({
      status: "unavailable",
      transferRelevance: "UNVERIFIED" as const,
      distanceKm: null,
      conditions: null,
      reason: "No relevant reference",
    })),
  };
  const r = await getLocationDetail(
    location,
    {
      species: "",
      method: "shore-angling",
      date: "2026-10-21",
      jurisdiction: "US-CA",
      coordinates: location.coordinates,
    },
    {
      weather,
      atmosphere: new NwsAtmosphereProvider(offline),
      access: new CaliforniaCoastalProvider(offline),
      tides,
      regulations: [],
    },
  );
  expect(spy).toHaveBeenCalledWith(location.coordinates);
  expect(tides.get).toHaveBeenCalledWith(location.coordinates);
  expect(r.location.name).toBe("Fixture SB");
  expect(r.weather.status).toBe("unavailable");
  expect(r.regulations.status).toBe("UNVERIFIED");
  expect(r.regulations.questions.every((q) => q.status === "UNVERIFIED")).toBe(
    true,
  );
  expect(r.access.access.status).toBe("unknown");
  expect(r.opportunity.suitability).toBe("not-assessed");
});
it("rejects activity coordinates that do not match the selected location before provider calls", async () => {
  const offline = async () => {
    throw Error("offline");
  };
  const weather = new NwsWeatherProvider(offline);
  const spy = vi.spyOn(weather, "getForecast");
  await expect(
    getLocationDetail(
      location,
      {
        species: "grunion",
        method: "shore-angling",
        date: "2026-10-21",
        jurisdiction: "US-CA",
        coordinates: { ...location.coordinates, latitude: 38 },
      },
      {
        weather,
        atmosphere: new NwsAtmosphereProvider(offline),
        access: new CaliforniaCoastalProvider(offline),
        tides: { get: offline },
        regulations: [],
      },
    ),
  ).rejects.toThrow("Activity coordinates must match the selected location");
  expect(spy).not.toHaveBeenCalled();
});
