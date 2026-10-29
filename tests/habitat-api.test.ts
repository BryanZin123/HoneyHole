import { afterEach, expect, it, vi } from "vitest";
import Ajv from "ajv/dist/2020";
import addFormats from "ajv-formats";
import contract from "../docs/api/openapi.json";
import { GET } from "../src/app/api/v1/locations/[id]/route";
import { StateParksDiscovery } from "../src/infrastructure/state-parks-discovery";
const ajv = new Ajv({ strict: false });
addFormats(ajv);
const validate = ajv.compile({
  $ref: "#/components/schemas/LocationDetail",
  components: contract.components,
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it("API exposes reviewed barred habitat separately from unavailable weather and unresolved eligibility", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-28T15:00:00Z"));
  vi.spyOn(StateParksDiscovery.prototype, "get").mockResolvedValue({
    id: "991",
    name: "Synthetic API Fixture SB",
    coordinates: { latitude: 37.5, longitude: -122.5 },
    type: "beach",
    county: "San Mateo",
    access: "unknown",
    sourceUrl: "https://example.test/entrance",
    parkUrl: null,
    retrievedAt: "2026-10-28T15:00:00Z",
    datasetUpdatedAt: null,
    sourceFeature: {},
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw Error("offline");
    }),
  );
  const response = await GET(
    new Request(
      "http://localhost/api/v1/locations/991?species=barred%20surfperch&method=shore-angling&date=2026-10-28",
    ),
    { params: Promise.resolve({ id: "991" }) },
  );
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(validate(body), JSON.stringify(validate.errors)).toBe(true);
  expect(body.habitat.association.profile.scientificName).toBe(
    "Amphistichus argenteus",
  );
  expect(body.habitat.locationEvidence.status).toBe("missing");
  expect(body.weather.status).toBe("unavailable");
  expect(body.regulations.status).toBe("UNVERIFIED");
  expect(body.opportunity).toMatchObject({
    eligibility: "UNVERIFIED",
    alertEligible: false,
    suitability: "not-assessed",
  });
  body.habitat.locationEvidence.status = "recommended";
  expect(validate(body)).toBe(false);
});
