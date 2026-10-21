import { afterEach, expect, it, vi } from "vitest";
import Ajv from "ajv/dist/2020";
import addFormats from "ajv-formats";
import contract from "../docs/api/openapi.json";
import { GET } from "../src/app/api/v1/locations/[id]/route";
import {
  StateParksDiscovery,
  parksSource,
} from "../src/infrastructure/state-parks-discovery";
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
it.each([
  ["2026-06-30", "VERIFIED_PROHIBITED"],
  ["2026-07-01", "UNVERIFIED"],
  ["2027-04-01", "UNVERIFIED"],
])(
  "API preserves regulatory evidence during environmental outage on %s",
  async (date, status) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-21T15:00:00Z"));
    vi.spyOn(StateParksDiscovery.prototype, "get").mockResolvedValue({
      id: "1",
      name: "Fixture SB",
      coordinates: { latitude: 34, longitude: -119 },
      type: "beach",
      county: "Ventura",
      access: "unknown",
      sourceUrl: parksSource,
      parkUrl: null,
      retrievedAt: "2026-10-21T15:00:00Z",
      datasetUpdatedAt: null,
      sourceFeature: {},
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw Error("provider outage");
      }),
    );
    const response = await GET(
      new Request(
        `http://localhost/api/v1/locations/1?species=California%20grunion&method=hand-gathering&date=${date}`,
      ),
      { params: Promise.resolve({ id: "1" }) },
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(validate(body), JSON.stringify(validate.errors)).toBe(true);
    expect(body.regulations.status).toBe(status);
    expect(body.weather.status).toBe("unavailable");
    expect(body.regulations.findings).toHaveLength(3);
    expect(body.regulations.missing).toContain("mpa");
    expect(body.opportunity.suitability).toBe("not-assessed");
  },
);
