import { expect, it } from "vitest";
import { getLocationDetail } from "../src/application/get-location-detail";
import { CaliforniaJurisdictionProvider } from "../src/infrastructure/california-jurisdiction";
import { CaliforniaCoastalProvider } from "../src/infrastructure/california-coastal";
import { NwsWeatherProvider } from "../src/infrastructure/nws";
import { NwsAtmosphereProvider } from "../src/infrastructure/nws-atmosphere";
import { californiaEffectiveRules } from "../src/infrastructure/california-effective-rules";
import type { ShoreLocation } from "../src/domain/discovery";
import type { JurisdictionEvidence } from "../src/application/resolve-jurisdiction";
const location: ShoreLocation = {
  id: "fixture",
  name: "Fixture only",
  coordinates: { latitude: 37, longitude: -122 },
  type: "beach",
  county: "Fixture",
  access: "unknown",
  sourceUrl: "https://example.test/parks",
  parkUrl: null,
  retrievedAt: "2026-10-21T12:00:00Z",
  datasetUpdatedAt: null,
  sourceFeature: {},
};
const offline = async () => {
  throw Error("offline");
};
it.each([
  [-122, "legal", "VERIFIED_PROHIBITED"],
  [-123, "legal", "UNVERIFIED"],
  [-122, "advisory", "UNVERIFIED"],
] as const)(
  "geographic scope participates in regulation evaluation at %s with %s evidence",
  async (longitude, authority, status) => {
    const selected = {
      ...location,
      coordinates: { ...location.coordinates, longitude },
    };
    const evidence: JurisdictionEvidence = {
      id: "fixture-water",
      label: "Fixture water",
      kind: "water",
      authority,
      sourceUrl: "https://example.test/legal",
      attribution: "Fixture",
      retrievedAt: "2026-10-21T12:00:00Z",
      verifiedOn: "2026-10-21",
      reviewDue: "2026-10-28",
      effectiveFrom: "2026-01-01",
      effectiveThrough: "2026-12-31",
      precisionMeters: 0,
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-123, 36],
            [-121, 36],
            [-121, 38],
            [-123, 38],
            [-123, 36],
          ],
        ],
      },
    };
    const r = await getLocationDetail(
      selected,
      {
        species: "fixture fish",
        method: "shore-angling",
        date: "2026-06-01",
        jurisdiction: "US-CA",
        coordinates: selected.coordinates,
      },
      {
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
        checkedOn: "2026-10-21",
        jurisdiction: () => ({ getEvidence: async () => [evidence] }),
        regulationProvider: {
          getRules: async () => [
            {
              ...californiaEffectiveRules[0],
              id: "fixture-rule",
              species: ["fixture fish"],
              scopeId: "fixture-water",
            },
          ],
        },
      },
    );
    expect(r.regulations.status).toBe(status);
    expect(r.opportunity.eligibility).toBe(
      status === "VERIFIED_PROHIBITED" ? "EXCLUDED" : "UNVERIFIED",
    );
    expect(r.opportunity.alertEligible).toBe(false);
  },
);
it("keeps California park/MPA metadata advisory and rejects a different query point", async () => {
  const evidence = {
    status: "available" as const,
    records: [
      {
        id: "fixture-mpa",
        name: "Fixture MPA",
        access: "unknown" as const,
        sourceAccessValue: null,
        shoreType: "unknown" as const,
        designation: null,
      },
    ],
    source: {
      url: "https://example.test/mpa",
      attribution: "Fixture CDFW",
      license: "fixture",
      datasetVersion: "fixture",
      retrievedAt: location.retrievedAt,
    },
  };
  const provider = new CaliforniaJurisdictionProvider(location, evidence);
  const records = await provider.getEvidence(location.coordinates);
  expect(records.map((r) => r.authority)).toEqual([
    "administrative",
    "advisory",
  ]);
  expect(
    records.every((r) => r.precisionMeters === null && r.geometry === null),
  ).toBe(true);
  await expect(
    provider.getEvidence({ latitude: 37.0000000001, longitude: -122 }),
  ).rejects.toThrow("mismatch");
});
