import { expect, it, vi, afterEach } from "vitest";
import Ajv from "ajv/dist/2020";
import addFormats from "ajv-formats";
import schema from "../docs/api/openapi.json";
import { POST } from "../src/app/api/v1/fishing-point-context/route";
const ajv = new Ajv({ strict: false });
addFormats(ajv);
const validate = ajv.compile({
  $ref: "#/components/schemas/FishingPointResult",
  components: schema.components,
});
afterEach(() => vi.unstubAllGlobals());
it("route preserves private contract, prevents positive classifications and does not request weather without consent", async () => {
  const fetcher = vi.fn<typeof fetch>(async () =>
    Response.json({ type: "FeatureCollection", features: [] }),
  );
  vi.stubGlobal("fetch", fetcher);
  const r = await POST(
    new Request("http://localhost:3000/api/v1/fishing-point-context", {
      method: "POST",
      headers: {
        Origin: "http://localhost:3000",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        coordinates: { latitude: 37.5, longitude: -122.5 },
        date: "2026-10-29",
        environmentConsent: false,
      }),
    }),
  );
  const body = await r.json();
  expect(r.status).toBe(200);
  expect(validate(body), JSON.stringify(validate.errors)).toBe(true);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(String(fetcher.mock.calls[0][0])).toContain("biosds3115_fnu");
  body.regulatoryEligibility = "VERIFIED_PERMITTED";
  expect(validate(body)).toBe(false);
});
