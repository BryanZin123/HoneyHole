import { expect, it, vi } from "vitest";
import {
  interpretShoreCodes,
  shorelineDistance,
} from "../src/domain/shoreline-context";
import {
  CdfwShorelineProvider,
  SHORELINE_URL,
} from "../src/infrastructure/cdfw-shoreline";
const fixture = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        OBJECTID: 1,
        line: "S",
        shore_code: "6B/3A",
        source: "ESI 2006",
        esi_description: "Synthetic riprap/sand",
        shoretype_1: "6B",
        shoretype_2: "3A",
        shoretype_3: " ",
        shoretype_1_name: "riprap",
        shoretype_2_name: "fine sand",
        shoretype_3_name: " ",
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [-122.5, 37.4],
          [-122.5, 37.6],
        ],
      },
    },
  ],
};
it("retains landward-to-seaward combinations without generalized collapse", () =>
  expect(interpretShoreCodes("6B/3A").map((c) => c.category)).toEqual([
    "engineered",
    "fine-medium-sand",
  ]));
it.each([
  ["3A", "fine-medium-sand"],
  ["4", "coarse-sand"],
  ["5", "mixed-sand-gravel"],
  ["1A", "rocky"],
  ["unknown", "unresolved"],
  ["3B", "other"],
])("interprets %s independently", (code, category) =>
  expect(interpretShoreCodes(code)[0].category).toBe(category),
);
it("unknown tokens and empty codes are not discarded", () => {
  expect(interpretShoreCodes("3A/ZZ")[1].category).toBe("unresolved");
  expect(interpretShoreCodes("")[0].category).toBe("unresolved");
});
it("computes geodesic distance without moving the point", () => {
  const p = { latitude: 37.5, longitude: -122.5 };
  expect(shorelineDistance(p, fixture.features[0].geometry)).toBeCloseTo(0, 5);
  expect(p.longitude).toBe(-122.5);
  expect(
    shorelineDistance(
      { ...p, longitude: -122.6 },
      fixture.features[0].geometry,
    ),
  ).toBeGreaterThan(8000);
});
it("rejects malformed geometry", () =>
  expect(() =>
    shorelineDistance(
      { latitude: 37.5, longitude: -122.5 },
      { type: "LineString", coordinates: [[0, 0]] },
    ),
  ).toThrow());
it("retrieves features using only a fixed envelope and preserves original evidence", async () => {
  const f = vi.fn<typeof fetch>(async () => Response.json(fixture));
  const r = await new CdfwShorelineProvider(f).get();
  expect(r.status).toBe("available");
  expect(r.features[0]).toMatchObject({
    id: "1",
    shoreCode: "6B/3A",
    source: "ESI 2006",
    sourceYear: 2006,
  });
  const u = new URL(String(f.mock.calls[0][0]));
  expect(u.origin + u.pathname).toBe(SHORELINE_URL + "/query");
  expect(u.searchParams.get("geometry")).toBe("-122.65,37.35,-122.35,37.65");
  expect(u.searchParams.get("outSR")).toBe("4326");
});
it("empty results are distinct from failure", async () =>
  expect(
    (
      await new CdfwShorelineProvider(async () =>
        Response.json({ type: "FeatureCollection", features: [] }),
      ).get()
    ).status,
  ).toBe("empty"));
it("provider outages expose no internal errors or fictional features", async () => {
  const r = await new CdfwShorelineProvider(async () => {
    throw Error("secret");
  }).get();
  expect(r.status).toBe("unavailable");
  expect(r.features).toEqual([]);
  expect(JSON.stringify(r)).not.toContain("secret");
});
it("rejects truncation and conflicting duplicate IDs", async () => {
  for (const v of [
    { ...fixture, exceededTransferLimit: true },
    {
      ...fixture,
      features: [
        fixture.features[0],
        {
          ...fixture.features[0],
          properties: { ...fixture.features[0].properties, shore_code: "1A" },
        },
      ],
    },
  ])
    expect(
      (await new CdfwShorelineProvider(async () => Response.json(v)).get())
        .status,
    ).toBe("unavailable");
});
it("deduplicates identical records and preserves missing dates", async () => {
  const f = {
    ...fixture.features[0],
    properties: { ...fixture.features[0].properties, source: null },
  };
  const r = await new CdfwShorelineProvider(async () =>
    Response.json({ ...fixture, features: [f, f] }),
  ).get();
  expect(r.features).toHaveLength(1);
  expect(r.features[0].sourceYear).toBeNull();
});
it("preserves unknown codes, disagreement and original source text", async () => {
  const v = {
    ...fixture,
    features: [
      {
        ...fixture.features[0],
        properties: {
          ...fixture.features[0].properties,
          shore_code: "3A/ZZ",
          source: "date unknown",
        },
      },
    ],
  };
  const r = await new CdfwShorelineProvider(async () => Response.json(v)).get();
  expect(r.features[0].shoreCode).toBe("3A/ZZ");
  expect(r.features[0].codeConflict).toBe(true);
  expect(r.features[0].source).toBe("date unknown");
  expect(r.features[0].sourceYear).toBeNull();
});
it("multiline distance uses all parts without snapping", () => {
  const r = shorelineDistance(
    { latitude: 37.5, longitude: -122.5 },
    {
      type: "MultiLineString",
      coordinates: [
        [
          [-122, 36],
          [-122, 37],
        ],
        [
          [-122.5, 37.4],
          [-122.5, 37.6],
        ],
      ],
    },
  );
  expect(r).toBeCloseTo(0, 5);
});
