import { expect, it, vi } from "vitest";
import { containsCoordinate } from "../src/domain/spatial";
import { CaliforniaCoastalProvider } from "../src/infrastructure/california-coastal";
import { assessCoastalAccess } from "../src/application/assess-coastal-access";
const point = { latitude: 37, longitude: -122 };
const polygon = {
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
};
const feature = (properties: object, geometry: object = polygon) => ({
  type: "Feature",
  properties,
  geometry,
});
const collection = (features: object[]) => ({
  type: "FeatureCollection",
  features,
});
const fetcher = (access: object, mpa: object) =>
  vi.fn(
    async (url: string | URL | Request) =>
      new Response(JSON.stringify(String(url).includes("CPAD") ? access : mpa)),
  );
it.each([
  ["Open Access", "verified-public"],
  ["Restricted Access", "restricted"],
  ["No Public Access", "restricted"],
  ["Unknown Access", "unknown"],
  ["Unexpected", "unknown"],
])("maps explicit %s conservatively", async (raw, expected) => {
  const result = await assessCoastalAccess(
    point,
    new CaliforniaCoastalProvider(
      fetcher(
        collection([
          feature({ OBJECTID: 1, UNIT_NAME: "Test park", ACCESS_TYP: raw }),
        ]),
        collection([]),
      ),
    ),
  );
  expect(result.access.status).toBe(expected);
  expect(result.fishingPermission).toBe("unknown");
  expect(result.legallyVerified).toBe(false);
});
it("never treats absent access records as public or empty MPA results as fishing permission", async () => {
  const result = await assessCoastalAccess(
    point,
    new CaliforniaCoastalProvider(fetcher(collection([]), collection([]))),
  );
  expect(result.access.status).toBe("unknown");
  expect(result.protectedAreas.status).toBe("available");
  expect(result.fishingPermission).toBe("unknown");
});
it("restriction overrides overlapping open access polygons", async () => {
  const result = await assessCoastalAccess(
    point,
    new CaliforniaCoastalProvider(
      fetcher(
        collection([
          feature({ OBJECTID: 1, ACCESS_TYP: "Open Access" }),
          feature({ OBJECTID: 2, ACCESS_TYP: "Restricted Access" }),
        ]),
        collection([]),
      ),
    ),
  );
  expect(result.access.status).toBe("restricted");
});
it("discards unrelated polygons and retains MPA attribution independently", async () => {
  const remote = {
    type: "Polygon",
    coordinates: [
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ],
    ],
  };
  const result = await assessCoastalAccess(
    point,
    new CaliforniaCoastalProvider(
      fetcher(
        collection([
          feature({ OBJECTID: 1, ACCESS_TYP: "Open Access" }, remote),
        ]),
        collection([
          feature({
            OBJECTID: 2,
            FULLNAME: "Test reserve",
            Type: "SMR",
            CCR: "Fixture",
          }),
        ]),
      ),
    ),
  );
  expect(result.access.status).toBe("unknown");
  expect(result.protectedAreas.records[0].name).toBe("Test reserve");
  expect(result.protectedAreas.source.attribution).toContain(
    "Fish and Wildlife",
  );
});
it("preserves access on partial MPA outage", async () => {
  const fetch = vi.fn(async (url: string | URL | Request) => {
    if (!String(url).includes("CPAD")) throw Error("offline");
    return new Response(
      JSON.stringify(
        collection([feature({ OBJECTID: 1, ACCESS_TYP: "Open Access" })]),
      ),
    );
  });
  const result = await assessCoastalAccess(
    point,
    new CaliforniaCoastalProvider(fetch),
  );
  expect(result.access.status).toBe("verified-public");
  expect(result.protectedAreas.status).toBe("unavailable");
  expect(result.legallyVerified).toBe(false);
});
it.each([
  { error: { code: 500 } },
  { type: "FeatureCollection", features: [], exceededTransferLimit: true },
  collection([
    feature({ OBJECTID: 1 }, { type: "Point", coordinates: [-122, 37] }),
  ]),
])(
  "fails closed for provider errors, truncation and malformed geometry",
  async (payload) => {
    const result = await assessCoastalAccess(
      point,
      new CaliforniaCoastalProvider(fetcher(payload, collection([]))),
    );
    expect(result.access.status).toBe("unknown");
    expect(result.access.evidence.status).toBe("unavailable");
  },
);
it.each([
  { latitude: NaN, longitude: 0 },
  { latitude: 91, longitude: 0 },
  { latitude: 37, longitude: 181 },
])("rejects invalid coordinates before network", async (p) => {
  const fetch = fetcher(collection([]), collection([]));
  await expect(
    assessCoastalAccess(p, new CaliforniaCoastalProvider(fetch)),
  ).rejects.toThrow();
  expect(fetch).not.toHaveBeenCalled();
});
it("rejects points outside configured California search envelope without claiming state membership", async () => {
  await expect(
    assessCoastalAccess(
      { latitude: 40, longitude: -74 },
      new CaliforniaCoastalProvider(fetcher(collection([]), collection([]))),
    ),
  ).rejects.toThrow(/region/);
});
it("honors polygon holes and boundary conservatively", () => {
  const withHole = {
    ...polygon,
    coordinates: [
      ...polygon.coordinates,
      [
        [-122.5, 36.5],
        [-121.5, 36.5],
        [-121.5, 37.5],
        [-122.5, 37.5],
        [-122.5, 36.5],
      ],
    ],
  };
  expect(containsCoordinate(point, withHole)).toBe(false);
  expect(containsCoordinate({ latitude: 36, longitude: -123 }, polygon)).toBe(
    true,
  );
});
