import { expect, it, vi } from "vitest";
import { POST } from "../src/app/api/v1/nearby/route";
import { afterEach } from "vitest";
afterEach(() => vi.unstubAllGlobals());
const plan = {
  center: { latitude: 37.512345, longitude: -122.512345 },
  radiusKm: 1,
  date: "2026-11-06",
  species: "barred surfperch",
  method: "shore-angling",
  style: "beach",
  period: "morning",
};
function request(value: unknown, origin = "http://localhost:3000") {
  return new Request("http://localhost:3000/api/v1/nearby", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
}
const item = {
  properties: { PARK_NAME: "Fixture SB", OBJECTID: 7, County: "San Mateo" },
  geometry: {
    type: "Point",
    coordinates: [plan.center.longitude, plan.center.latitude],
  },
};
it.each([1, 50])(
  "preserves identity, units and privacy at radius %i",
  async (radiusKm) => {
    const f = vi.fn<typeof fetch>(async (url) =>
      Response.json(
        String(url).includes("/query?")
          ? { type: "FeatureCollection", features: [item] }
          : {},
      ),
    );
    vi.stubGlobal("fetch", f);
    const r = await POST(request({ ...plan, radiusKm }));
    expect(r.status).toBe(200);
    expect(r.headers.get("cache-control")).toContain("no-store");
    const b = await r.json();
    expect(b.candidates[0]).toMatchObject({
      id: "7",
      kind: "park-entry",
      distanceKm: 0,
      coordinates: plan.center,
      eligibility: "UNVERIFIED",
    });
    expect(b.candidates[0].sourceFeature).toBeUndefined();
    expect(f.mock.calls).toHaveLength(2);
    for (const [url] of f.mock.calls)
      expect(String(url)).not.toMatch(
        /37\.512345|122\.512345|weather\.gov|noaa\.gov/,
      );
  },
);
it.each([0.999, 50.001])(
  "rejects invalid radius %i before network",
  async (radiusKm) => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    expect((await POST(request({ ...plan, radiusKm }))).status).toBe(400);
    expect(f).not.toHaveBeenCalled();
  },
);
it("rejects cross-origin center requests", async () =>
  expect((await POST(request(plan, "https://example.test"))).status).toBe(403));
it("returns outage instead of empty success", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw Error("offline");
    }),
  );
  expect((await POST(request(plan))).status).toBe(502);
});

import { findNearby } from "../src/application/find-nearby";
import { StateParksDiscovery } from "../src/infrastructure/state-parks-discovery";
import { californiaEffectiveRules } from "../src/infrastructure/california-effective-rules";
import { distanceKm } from "../src/domain/spatial";
function fixture(features: unknown[]) {
  return new StateParksDiscovery(async (url) =>
    Response.json(
      String(url).includes("/query?")
        ? { type: "FeatureCollection", features }
        : {},
    ),
  );
}
it("uses inclusive exact geodesic distance and stable source-ID tie breaking", async () => {
  const latitude = 37.55;
  const d = distanceKm(plan.center, {
    latitude,
    longitude: plan.center.longitude,
  });
  const a = {
    ...item,
    geometry: { type: "Point", coordinates: [plan.center.longitude, latitude] },
  };
  const provider = fixture([
    a,
    { ...a, properties: { ...a.properties, OBJECTID: 2 } },
  ]);
  const inside = await findNearby(
    { ...plan, radiusKm: d },
    provider,
    [],
    "2026-11-06",
  );
  expect(inside.candidates.map((c) => c.id)).toEqual(["2", "7"]);
  expect(inside.candidates[0].distanceKm).toBe(d);
  expect(
    (
      await findNearby(
        { ...plan, radiusKm: d - 0.00001 },
        provider,
        [],
        "2026-11-06",
      )
    ).candidates,
  ).toEqual([]);
});
it("fails closed on conflicting source identity even across radius boundary", async () => {
  const r = await findNearby(
    plan,
    fixture([
      item,
      { ...item, geometry: { type: "Point", coordinates: [-120, 34] } },
    ]),
    [],
    "2026-11-06",
  );
  expect(r.status).toBe("unavailable");
  expect(r.candidates).toEqual([]);
});
it("discloses missing coordinates instead of implying exhaustive empty coverage", async () => {
  const r = await findNearby(
    plan,
    fixture([{ ...item, geometry: null }]),
    [],
    "2026-11-06",
  );
  expect(r.candidates).toEqual([]);
  expect(r.reason).toMatch(/incomplete/);
});
it("applies a verified applicable statewide prohibition before any optional detail request", async () => {
  const r = await findNearby(
    { ...plan, species: "California grunion", date: "2026-06-01" },
    fixture([item]),
    californiaEffectiveRules,
    "2026-10-21",
  );
  expect(r.candidates[0].eligibility).toBe("EXCLUDED");
  expect(r.candidates[0].reasons).toContain("REGULATORY_PROHIBITION");
});
it("expired evidence stays unknown", async () => {
  const r = await findNearby(
    { ...plan, species: "California grunion", date: "2026-06-01" },
    fixture([item]),
    californiaEffectiveRules,
    "2026-11-06",
  );
  expect(r.candidates[0].eligibility).toBe("UNVERIFIED");
  expect(r.candidates[0].access).toBe("unknown");
});

import { POST as entrance } from "../src/app/api/v1/locations/[id]/route";
it("rejects absent consent before contacting any provider", async () => {
  const f = vi.fn();
  vi.stubGlobal("fetch", f);
  const r = await entrance(
    request({ coordinates: plan.center, consent: false }),
    { params: Promise.resolve({ id: "7" }) },
  );
  expect(r.status).toBe(400);
  expect(f).not.toHaveBeenCalled();
});
it("refetches public source identity and stops before weather/GIS when consented coordinates differ", async () => {
  const f = vi.fn<typeof fetch>(async (url) =>
    Response.json(
      String(url).includes("/query?")
        ? { type: "FeatureCollection", features: [item] }
        : {},
    ),
  );
  vi.stubGlobal("fetch", f);
  const r = await entrance(
    request({
      coordinates: {
        ...plan.center,
        longitude: plan.center.longitude + 0.000001,
      },
      consent: true,
      species: plan.species,
      date: plan.date,
      method: plan.method,
    }),
    { params: Promise.resolve({ id: "7" }) },
  );
  expect(r.status).toBe(409);
  expect(f.mock.calls).toHaveLength(2);
  expect(
    f.mock.calls.every(([u]) => String(u).includes("ParkEntryPoints")),
  ).toBe(true);
});

import Ajv from "ajv/dist/2020";
import addFormats from "ajv-formats";
import schema from "../docs/api/openapi.json";
it("matches the published private search request and response contracts", async () => {
  const ajv = new Ajv({ strict: false });
  addFormats(ajv);
  const valid = (name: string) =>
    ajv.compile({
      $ref: "#/components/schemas/" + name,
      components: schema.components,
    });
  expect(valid("NearbyPlan")(plan)).toBe(true);
  const r = await findNearby(plan, fixture([item]), [], "2026-11-06");
  expect(valid("NearbyResult")(r)).toBe(true);
});
