import { expect, it, vi } from "vitest";
import {
  getFishingPoint,
  validateFishingPointInput,
  type FishingPointPorts,
} from "../src/application/get-fishing-point";
import { handleFishingPointRequest } from "../src/application/fishing-point-http";
import { CaliforniaHabitatEvidence } from "../src/infrastructure/california-habitat";
const input = {
  coordinates: { latitude: 37.5, longitude: -122.5 },
  date: "2026-10-29",
  environmentConsent: false,
};
const ports = () => ({
  shoreline: {
    get: vi.fn(async () => ({
      status: "empty" as const,
      features: [],
      retrievedAt: null,
    })),
  },
  weather: {
    getForecast: vi.fn(async () => {
      throw Error("offline");
    }),
  },
  atmosphere: {
    getAtmosphere: vi.fn(async () => {
      throw Error("offline");
    }),
  },
  tides: {
    get: vi.fn(async () => {
      throw Error("offline");
    }),
  },
  habitat: new CaliforniaHabitatEvidence(),
});
it("does not transmit coordinates or inherit access, legality or a park identity", async () => {
  const p = ports();
  const r = await getFishingPoint(input, p);
  expect(p.shoreline.get).toHaveBeenCalledWith();
  expect(p.weather.getForecast).not.toHaveBeenCalled();
  expect(p.atmosphere.getAtmosphere).not.toHaveBeenCalled();
  expect(p.tides.get).not.toHaveBeenCalled();
  expect(r.point).toEqual({
    kind: "fishing-point",
    source: "user-selected",
    coordinates: input.coordinates,
  });
  expect(r).toMatchObject({
    access: "UNVERIFIED",
    regulatoryEligibility: "UNVERIFIED",
    recommendation: "unavailable",
    alertEligible: false,
    environment: null,
  });
});
it("explicit weather consent forwards the exact unsnapped point", async () => {
  const p = ports();
  await getFishingPoint({ ...input, environmentConsent: true }, p);
  expect(p.weather.getForecast).toHaveBeenCalledWith(input.coordinates);
  expect(p.atmosphere.getAtmosphere).toHaveBeenCalledWith(input.coordinates);
});
it.each([
  { ...input, sourceId: "991" },
  { ...input, environmentConsent: "yes" },
  { ...input, coordinates: { latitude: 91, longitude: 0 } },
  { ...input, date: "2026-02-30" },
])("rejects spoofing and invalid inputs %j", (v) =>
  expect(() => validateFishingPointInput(v)).toThrow(),
);
it("outside pilot makes no shoreline call", async () => {
  const p = ports();
  const r = await getFishingPoint(
    { ...input, coordinates: { latitude: 34, longitude: -118 } },
    p,
  );
  expect(p.shoreline.get).not.toHaveBeenCalled();
  expect(r.shoreline.status).toBe("outside-pilot");
});
it("unexpected provider failure remains unavailable", async () => {
  const p = ports();
  p.shoreline.get.mockRejectedValue(Error("offline"));
  expect((await getFishingPoint(input, p)).shoreline.status).toBe(
    "unavailable",
  );
});
it("rejects hostile origin before any provider work", async () => {
  const p = ports();
  const r = await handleFishingPointRequest(
    new Request("http://localhost:3000/api/v1/fishing-point-context", {
      method: "POST",
      headers: {
        Origin: "https://other.test",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    }),
    "http://localhost:3000",
    p,
  );
  expect(r.status).toBe(403);
  expect(p.shoreline.get).not.toHaveBeenCalled();
});
it("private no-store response keeps conditions absent without consent", async () => {
  const r = await handleFishingPointRequest(
    new Request("http://localhost:3000/api/v1/fishing-point-context", {
      method: "POST",
      headers: {
        Origin: "http://localhost:3000",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    }),
    "http://localhost:3000",
    ports() as FishingPointPorts,
  );
  expect(r.status).toBe(200);
  expect(r.headers.get("Cache-Control")).toBe("private, no-store");
  expect((await r.json()).environment).toBeNull();
});

it("distant and overlapping conflicting segments remain context without assignment", async () => {
  const { CdfwShorelineProvider } =
    await import("../src/infrastructure/cdfw-shoreline");
  const feature = {
    type: "Feature",
    properties: {
      OBJECTID: 1,
      line: "S",
      shore_code: "3A",
      source: "ESI 2006",
      shoretype_1: "3A",
      shoretype_1_name: "sand",
    },
    geometry: {
      type: "LineString",
      coordinates: [
        [-120, 35],
        [-120, 36],
      ],
    },
  };
  const p = ports();
  const provider = new CdfwShorelineProvider(async () =>
    Response.json({
      type: "FeatureCollection",
      features: [
        feature,
        {
          ...feature,
          properties: {
            ...feature.properties,
            OBJECTID: 2,
            shore_code: "1A",
            shoretype_1: "1A",
            shoretype_1_name: "rock",
          },
        },
      ],
    }),
  );
  const r = await getFishingPoint(input, { ...p, shoreline: provider });
  expect(r.shoreline.features).toHaveLength(2);
  expect(r.shoreline.features[0].distanceMeters).toBeGreaterThan(100000);
  expect(r.shoreline.conflictingGeometry).toBe(true);
  expect(r.shoreline.pointClassification).toBe("UNVERIFIED");
  expect(r.habitat.locationEvidence.status).toBe("missing");
  expect(r.alertEligible).toBe(false);
});
