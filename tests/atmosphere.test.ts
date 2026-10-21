import { expect, it } from "vitest";
import { NwsAtmosphereProvider } from "../src/infrastructure/nws-atmosphere";
const p = { latitude: 37, longitude: -122 };
const now = () => new Date("2026-10-18T19:00:00Z");
const geometry = {
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
const astronomy = {
  sunrise: "2026-10-18T07:00:00-07:00",
  sunset: "2026-10-18T18:00:00-07:00",
  civilTwilightBegin: "2026-10-18T06:30:00-07:00",
  civilTwilightEnd: "2026-10-18T18:30:00-07:00",
};
function transport(overrides: Record<string, unknown> = {}) {
  return async (input: string | URL | Request) => {
    const url = String(input);
    let key = "point";
    if (url.includes("/observations")) key = "obs";
    else if (url.endsWith("/stations")) key = "stations";
    else if (url.includes("/gridpoints/")) key = "grid";
    const values: Record<string, unknown> = {
      point: {
        properties: {
          forecastGridData: "https://api.weather.gov/gridpoints/MTR/1,1",
          observationStations:
            "https://api.weather.gov/gridpoints/MTR/1,1/stations",
          timeZone: "America/Los_Angeles",
          astronomicalData: astronomy,
        },
      },
      grid: {
        geometry,
        properties: {
          updateTime: "2026-10-18T18:00:00Z",
          skyCover: {
            uom: "wmoUnit:percent",
            values: [{ validTime: "2026-10-18T19:00:00Z/PT2H", value: 40 }],
          },
          windGust: {
            uom: "wmoUnit:km_h-1",
            values: [{ validTime: "2026-10-18T19:00:00Z/PT2H", value: 36 }],
          },
        },
      },
      stations: {
        features: [
          {
            geometry: { type: "Point", coordinates: [-122, 37] },
            properties: { stationIdentifier: "TEST" },
          },
        ],
      },
      obs: {
        features: ["18:30", "15:30"].map((t, i) => ({
          geometry: { type: "Point", coordinates: [-122, 37] },
          properties: {
            station: "https://api.weather.gov/stations/TEST",
            timestamp: `2026-10-18T${t}:00Z`,
            barometricPressure: {
              value: 101000 - i * 300,
              unitCode: "wmoUnit:Pa",
              qualityControl: "V",
            },
          },
        })),
      },
    };
    if (overrides[key] === null) throw Error("network");
    return new Response(
      JSON.stringify(key in overrides ? overrides[key] : values[key]),
    );
  };
}
it("normalizes grid units, pressure and exact same-station slope with provenance", async () => {
  const r = await new NwsAtmosphereProvider(transport(), now).getAtmosphere(p);
  expect(r.grid.values[0].value).toBe(40);
  expect(r.grid.values[1].value).toBe(10);
  expect(r.pressure.hPa).toBe(1010);
  expect(r.pressure.trendHpaPerHour).toBe(1);
  expect(r.pressure.kind).toBe("observation");
  expect(r.light.phase).toBe("daylight");
});
it("preserves solar and grid evidence on observation outage", async () => {
  const r = await new NwsAtmosphereProvider(
    transport({ obs: null }),
    now,
  ).getAtmosphere(p);
  expect(r.pressure.status).toBe("unavailable");
  expect(r.grid.status).toBe("available");
  expect(r.light.status).toBe("available");
});
it("rejects unrelated grid geometry", async () => {
  const r = await new NwsAtmosphereProvider(
    transport({ grid: { geometry: { type: "Point", coordinates: [0, 0] } } }),
    now,
  ).getAtmosphere(p);
  expect(r.grid.status).toBe("unavailable");
});
it("does not substitute zero for missing pressure", async () => {
  const r = await new NwsAtmosphereProvider(
    transport({ obs: { features: [] } }),
    now,
  ).getAtmosphere(p);
  expect(r.pressure.hPa).toBeNull();
  expect(r.pressure.trendHpaPerHour).toBeNull();
});
it("rejects distant observation stations", async () => {
  const r = await new NwsAtmosphereProvider(
    transport({
      stations: {
        features: [
          {
            geometry: { type: "Point", coordinates: [-100, 40] },
            properties: { stationIdentifier: "FAR" },
          },
        ],
      },
    }),
    now,
  ).getAtmosphere(p);
  expect(r.pressure.status).toBe("unavailable");
});
it("rejects stale astronomy dates", async () => {
  const r = await new NwsAtmosphereProvider(
    transport(),
    () => new Date("2026-10-20T19:00:00Z"),
  ).getAtmosphere(p);
  expect(r.light.status).toBe("unavailable");
  expect(r.pressure.status).toBe("unavailable");
  expect(r.grid.status).toBe("unavailable");
});
it("handles discovery outage without invented fields", async () => {
  const r = await new NwsAtmosphereProvider(
    transport({ point: null }),
    now,
  ).getAtmosphere(p);
  expect(r.grid.status).toBe("unavailable");
  expect(r.light.phase).toBe("unknown");
});
it("rejects invalid coordinates before transport", async () => {
  await expect(
    new NwsAtmosphereProvider(transport(), now).getAtmosphere({
      latitude: 91,
      longitude: 0,
    }),
  ).rejects.toThrow();
});
it.each([
  ["2026-10-18T13:45:00Z", "civil-twilight"],
  ["2026-10-19T02:00:00Z", "night"],
])("classifies calculated light at %s", async (time, phase) => {
  const r = await new NwsAtmosphereProvider(
    transport(),
    () => new Date(time),
  ).getAtmosphere(p);
  expect(r.light.phase).toBe(phase);
});
it("does not follow an external discovery URL", async () => {
  const r = await new NwsAtmosphereProvider(
    transport({
      point: {
        properties: {
          forecastGridData: "https://example.test/gridpoints/MTR/1,1",
        },
      },
    }),
    now,
  ).getAtmosphere(p);
  expect(r.grid.status).toBe("unavailable");
});
it.each([
  ["missing", null],
  [
    "bad quality",
    { value: 101000, unitCode: "wmoUnit:Pa", qualityControl: "X" },
  ],
  ["wrong unit", { value: 1010, unitCode: "wmoUnit:hPa", qualityControl: "V" }],
])("rejects %s pressure without substitution", async (_, q) => {
  const obs = {
    features: [
      {
        geometry: { type: "Point", coordinates: [-122, 37] },
        properties: {
          station: "https://api.weather.gov/stations/TEST",
          timestamp: "2026-10-18T18:30:00Z",
          barometricPressure: q,
        },
      },
    ],
  };
  const r = await new NwsAtmosphereProvider(
    transport({ obs }),
    now,
  ).getAtmosphere(p);
  expect(r.pressure.hPa).toBeNull();
});
it("marks stale grid updates while retaining future validity intervals", async () => {
  const grid = {
    geometry,
    properties: {
      updateTime: "2026-10-18T10:00:00Z",
      skyCover: {
        uom: "wmoUnit:percent",
        values: [{ validTime: "2026-10-18T19:00:00Z/PT1H", value: 30 }],
      },
    },
  };
  const r = await new NwsAtmosphereProvider(
    transport({ grid }),
    now,
  ).getAtmosphere(p);
  expect(r.grid.status).toBe("stale");
  expect(r.grid.values).toHaveLength(1);
});
it("rejects excessive future grid time and malformed validity durations", async () => {
  const grid = {
    geometry,
    properties: {
      updateTime: "2026-10-18T20:00:00Z",
      skyCover: {
        uom: "wmoUnit:percent",
        values: [{ validTime: "2026-10-18T19:00:00Z/PT1H", value: 30 }],
      },
    },
  };
  expect(
    (await new NwsAtmosphereProvider(transport({ grid }), now).getAtmosphere(p))
      .grid.status,
  ).toBe("unavailable");
  grid.properties.updateTime = "2026-10-18T18:00:00Z";
  grid.properties.skyCover.values[0].validTime = "2026-10-18T19:00:00Z/P0D";
  expect(
    (await new NwsAtmosphereProvider(transport({ grid }), now).getAtmosphere(p))
      .grid.status,
  ).toBe("unavailable");
});
it("selects a fresh applicable station after a nearer mismatched observation response", async () => {
  const stations = {
    features: [
      {
        geometry: { type: "Point", coordinates: [-122, 37] },
        properties: { stationIdentifier: "AAA" },
      },
      {
        geometry: { type: "Point", coordinates: [-122, 37] },
        properties: { stationIdentifier: "TEST" },
      },
    ],
  };
  const r = await new NwsAtmosphereProvider(
    transport({ stations }),
    now,
  ).getAtmosphere(p);
  expect(r.pressure.stationId).toBe("TEST");
  expect(r.pressure.status).toBe("available");
  expect(r.pressure.trendFrom).toBe("2026-10-18T15:30:00.000Z");
});
