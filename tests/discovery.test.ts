import { it, expect, vi } from "vitest";
import { StateParksDiscovery } from "../src/infrastructure/state-parks-discovery";
import { discoverShore } from "../src/application/discover-shore";
const feature = {
  type: "Feature",
  geometry: { type: "Point", coordinates: [-122.5, 37.5] },
  properties: {
    OBJECTID: 1,
    PARK_NAME: "Fixture SB",
    County: "San Mateo",
    PARK_WEB_PG: "https://www.parks.ca.gov/?page_id=1",
  },
};
const transport = (features: unknown[] = [feature], extra = {}) =>
  vi.fn(
    async (url: unknown) =>
      new Response(
        JSON.stringify(
          String(url).includes("/query")
            ? { type: "FeatureCollection", features, ...extra }
            : { editingInfo: { lastEditDate: 1700000000000 } },
        ),
      ),
  );
it("returns original named source coordinates and unknown access", async () => {
  const r = await discoverShore(
    { county: "San Mateo" },
    new StateParksDiscovery(transport()),
  );
  expect(r.locations[0].coordinates).toEqual({
    latitude: 37.5,
    longitude: -122.5,
  });
  expect(r.locations[0].access).toBe("unknown");
  expect(r.locations[0].sourceFeature).toEqual(feature);
});
it("excludes unrelated county, inland units and distant points", async () => {
  const provider = new StateParksDiscovery(
    transport([
      feature,
      { ...feature, properties: { ...feature.properties, County: "Lake" } },
      {
        ...feature,
        properties: { ...feature.properties, PARK_NAME: "Inland SP" },
      },
    ]),
  );
  expect(
    (await provider.search({ county: "San Mateo" })).locations,
  ).toHaveLength(1);
  expect(
    (
      await provider.search({
        center: { latitude: 35, longitude: -120 },
        radiusKm: 2,
      })
    ).locations,
  ).toHaveLength(0);
});
it("fails explicitly on truncated responses", async () => {
  expect(
    (
      await new StateParksDiscovery(
        transport([feature], { properties: { exceededTransferLimit: true } }),
      ).search({ county: "San Mateo" })
    ).status,
  ).toBe("unavailable");
});
it("rejects invalid radius before network", async () => {
  const fetcher = transport();
  await expect(
    discoverShore(
      { center: { latitude: 37, longitude: -122 }, radiusKm: 0 },
      new StateParksDiscovery(fetcher),
    ),
  ).rejects.toThrow();
  expect(fetcher).not.toHaveBeenCalled();
});
it("isolates outages", async () => {
  expect(
    (
      await new StateParksDiscovery(async () => {
        throw Error("offline");
      }).search({ county: "San Mateo" })
    ).status,
  ).toBe("unavailable");
});
it("deduplicates identical source IDs", async () => {
  const r = await new StateParksDiscovery(transport([feature, feature])).search(
    { county: "San Mateo" },
  );
  expect(r.locations).toHaveLength(1);
});
it("returns empty success and rejects invalid provider coordinates", async () => {
  expect(
    (
      await new StateParksDiscovery(transport([])).search({
        county: "San Mateo",
      })
    ).locations,
  ).toEqual([]);
  expect(
    (
      await new StateParksDiscovery(
        transport([
          { ...feature, geometry: { type: "Point", coordinates: [181, 37] } },
        ]),
      ).search({ county: "San Mateo" })
    ).locations,
  ).toEqual([]);
});
