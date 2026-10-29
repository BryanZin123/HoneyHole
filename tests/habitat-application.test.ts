import { expect, it } from "vitest";
import { getHabitatAssessment } from "../src/application/get-habitat-assessment";
import {
  CaliforniaHabitatEvidence,
  barredSurfperchHabitat,
} from "../src/infrastructure/california-habitat";
const context = {
  locationId: "fixture",
  coordinates: { latitude: 37, longitude: -122 },
  species: "barred surfperch",
  date: "2026-10-28",
  checkedOn: "2026-10-28",
};
it("production provider never treats park entry coordinates as verified habitat", async () => {
  const r = await getHabitatAssessment(
    context,
    new CaliforniaHabitatEvidence(),
  );
  expect(r.association.status).toBe("documented");
  expect(r.locationEvidence.status).toBe("missing");
  expect(r.speciesPresence).toBe("not-assessed");
});
it("retains reviewed species facts during location-provider outages", async () => {
  const r = await getHabitatAssessment(context, {
    getSpecies: async () => barredSurfperchHabitat,
    getLocation: async () => {
      throw Error("offline");
    },
  });
  expect(r.providerStatus).toBe("unavailable");
  expect(r.association.status).toBe("documented");
  expect(r.locationEvidence.status).toBe("missing");
});
it("missing and failed species providers do not create species facts", async () => {
  for (const provider of [
    undefined,
    {
      getSpecies: async () => {
        throw Error("offline");
      },
      getLocation: async () => [],
    },
  ]) {
    const r = await getHabitatAssessment(context, provider);
    expect(r.association.profile).toBeNull();
    expect(r.providerStatus).toBe("unavailable");
  }
});

it("supported habitat never cancels an independent verified prohibition or enables alerts", async () => {
  const { getLocationDetail } =
    await import("../src/application/get-location-detail");
  const { NwsWeatherProvider } = await import("../src/infrastructure/nws");
  const { NwsAtmosphereProvider } =
    await import("../src/infrastructure/nws-atmosphere");
  const { CaliforniaCoastalProvider } =
    await import("../src/infrastructure/california-coastal");
  const offline = async () => {
    throw Error("offline");
  };
  const location = {
    id: "fixture",
    name: "Synthetic only",
    coordinates: context.coordinates,
    type: "beach" as const,
    county: "San Mateo",
    access: "unknown" as const,
    sourceUrl: "https://example.test",
    parkUrl: null,
    retrievedAt: "2026-10-28T00:00:00Z",
    datasetUpdatedAt: null,
    sourceFeature: {},
  };
  const result = await getLocationDetail(
    location,
    {
      species: context.species,
      date: context.date,
      coordinates: context.coordinates,
      jurisdiction: "US-CA",
      method: "shore-angling",
    },
    {
      checkedOn: context.checkedOn,
      weather: new NwsWeatherProvider(offline),
      atmosphere: new NwsAtmosphereProvider(offline),
      access: new CaliforniaCoastalProvider(offline),
      tides: {
        get: async () => ({
          status: "unavailable",
          transferRelevance: "UNVERIFIED",
          distanceKm: null,
          conditions: null,
          reason: "fixture outage",
        }),
      },
      regulations: [],
      regulatoryScopes: [
        {
          id: "fixture-water",
          authority: "legal",
          sourceUrl: "https://example.test/legal",
        },
      ],
      regulationProvider: {
        getRules: async () => [
          {
            id: "fixture-prohibition",
            authority: "Synthetic fixture",
            sourceUrl: "https://example.test/rule",
            species: [context.species],
            jurisdiction: "US-CA",
            scopeId: "fixture-water",
            methods: ["shore-angling"],
            effectiveFrom: "2026-01-01",
            effectiveTo: null,
            expirationKnown: true,
            verifiedOn: context.checkedOn,
            reviewDue: "2026-11-01",
            coverageFrom: "2026-01-01",
            coverageThrough: "2026-10-28",
            verification: "verified",
            exceptions: [],
            question: "season",
            restriction: { kind: "prohibition" },
            summary: "Synthetic prohibition, not a production regulation",
          },
        ],
      },
      habitat: {
        getSpecies: async () => barredSurfperchHabitat,
        getLocation: async () =>
          (["substrate", "zone"] as const).map((attribute) => ({
            id: attribute,
            locationId: context.locationId,
            coordinates: context.coordinates,
            attribute,
            value: attribute === "substrate" ? "sand" : "surf-zone",
            verification: "verified",
            basis: "field-survey",
            sourceUrl: "https://example.test/habitat",
            attribution: "Synthetic survey",
            reviewedOn: context.checkedOn,
            reviewDue: "2026-11-01",
            validFrom: "2026-10-01",
            validThrough: "2026-10-31",
          })),
      },
    },
  );
  expect(result.habitat.locationEvidence.status).toBe("supported");
  expect(result.regulations.status).toBe("VERIFIED_PROHIBITED");
  expect(result.opportunity).toMatchObject({
    eligibility: "EXCLUDED",
    alertEligible: false,
    suitability: "not-assessed",
  });
});
