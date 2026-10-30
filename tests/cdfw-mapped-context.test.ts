import { expect, it, vi } from "vitest";
import {
  CdfwMappedContext,
  DS3091_SERVICE,
} from "../src/infrastructure/cdfw-mapped-context";
import { getMappedContext } from "../src/application/get-mapped-context";
const point = {
  id: "synthetic",
  kind: "park-entry" as const,
  coordinates: { latitude: 37.5, longitude: -122.5 },
  accuracyMeters: null,
};
const now = () => new Date("2026-10-29T15:00:00Z");
const metadata = {
  serviceItemId: "40dc0b4522b94bcf95910801e322be0a",
  spatialReference: { wkid: 3310 },
  pixelSizeX: 10,
  pixelSizeY: 10,
  capabilities: "Image,TilesOnly",
};
it("normalizes licensed service metadata without querying or disclosing the point", async () => {
  const fetcher = vi.fn<typeof fetch>(async () => Response.json(metadata));
  const r = await getMappedContext(
    point,
    "2026-10-29",
    new CdfwMappedContext(fetcher, now),
  );
  expect(r.status).toBe("context-only");
  expect(r.dataset?.publishedOn).toBe("2023-04-20");
  expect(r.dataset?.observedOn).toBeNull();
  expect(r.dataset?.retrievedAt).toBe(now().toISOString());
  expect(r.dataset?.service?.crs).toBe("EPSG:3310");
  expect(r.assessment.status).toBe("UNVERIFIED");
  expect(r.assessment.features).toEqual([]);
  expect(fetcher.mock.calls[0][0]).toBe(DS3091_SERVICE + "?f=json");
});
it.each([
  {},
  { ...metadata, serviceItemId: "other" },
  { ...metadata, pixelSizeX: 30 },
  { ...metadata, spatialReference: { wkid: 3857 } },
  { error: { code: 500 } },
])("rejects missing or changed service metadata %j", async (payload) => {
  const r = await getMappedContext(
    point,
    "2026-10-29",
    new CdfwMappedContext(async () => Response.json(payload), now),
  );
  expect(r.status).toBe("unavailable");
  expect(r.dataset?.service).toBeNull();
  expect(r.assessment.status).toBe("UNVERIFIED");
});
it("outages retain source attribution, never a fabricated pixel", async () => {
  const r = await getMappedContext(
    point,
    "2026-10-29",
    new CdfwMappedContext(async () => {
      throw Error("private error");
    }, now),
  );
  expect(r.status).toBe("unavailable");
  expect(r.dataset?.license).toBe("CC BY 4.0");
  expect(r.dataset?.retrievedAt).toBeNull();
  expect(JSON.stringify(r)).not.toContain("private error");
});
it("bounds the operational pilot and makes no outside-area request", async () => {
  const f = vi.fn(async () => Response.json(metadata));
  const r = await getMappedContext(
    { ...point, coordinates: { latitude: 34, longitude: -118 } },
    "2026-10-29",
    new CdfwMappedContext(f, now),
  );
  expect(r.status).toBe("outside-pilot");
  expect(f).not.toHaveBeenCalled();
});
it("application isolates unexpected provider failure", async () => {
  const r = await getMappedContext(point, "2026-10-29", {
    get: async () => {
      throw Error("failure");
    },
  });
  expect(r.status).toBe("unavailable");
  expect(r.assessment.features).toEqual([]);
});
