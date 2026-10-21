import { describe, it, expect, vi } from "vitest";
import { NwsWeatherProvider } from "../src/infrastructure/nws";
const coordinates = { latitude: 37.8063, longitude: -122.4659 };
const now = () => new Date("2026-10-18T18:00:00Z");
const points = {
  properties: {
    forecastHourly:
      "https://api.weather.gov/gridpoints/MTR/85,105/forecast/hourly",
    timeZone: "America/Los_Angeles",
  },
};
const period = {
  startTime: "2026-10-18T11:00:00-07:00",
  endTime: "2026-10-18T12:00:00-07:00",
  temperature: 68,
  temperatureUnit: "F",
  windSpeed: "5 to 10 mph",
  windDirection: "W",
  isDaytime: true,
  shortForecast: "Partly Cloudy",
};
function fixture(
  p: unknown = period,
  updateTime = "2026-10-18T17:30:00Z",
  pointBody: unknown = points,
) {
  const fetcher = vi.fn(async (url: Parameters<typeof fetch>[0]) =>
    withGeometry(
      JSON.stringify(
        String(url).includes("/points/")
          ? pointBody
          : {
              properties: {
                updateTime,
                generatedAt: updateTime,
                periods: [p],
              },
            },
      ),
      { status: 200 },
    ),
  );
  return {
    provider: new NwsWeatherProvider(fetcher as typeof fetch, now),
    fetcher,
  };
}
describe("NWS forecast adapter contracts, test fixtures only", () => {
  it("normalizes Fahrenheit and wind ranges and distinguishes forecast provenance", async () => {
    const { provider, fetcher } = fixture();
    const r = await provider.getForecast(coordinates);
    expect(r.status).toBe("available");
    expect(r.periods[0].airTemperatureC).toBe(20);
    expect(r.periods[0].windSpeedMps?.maximum).toBeCloseTo(4.4704);
    expect(r.periods[0].start).toBe("2026-10-18T18:00:00.000Z");
    expect(r.kind).toBe("forecast");
    expect(r.issuedAt).toBeNull();
    expect(r.missingFields).toContain("barometricPressure");
    expect(fetcher.mock.calls[1][0]).toContain("units=si");
  });
  it("normalizes metric units", async () => {
    const r = await fixture({
      ...period,
      temperature: 20,
      temperatureUnit: "C",
      windSpeed: "36 km/h",
    }).provider.getForecast(coordinates);
    expect(r.periods[0].windSpeedMps?.maximum).toBe(10);
  });
  it("never coerces absent fields to calm wind or zero temperature", async () => {
    const r = await fixture({
      ...period,
      temperature: null,
      windSpeed: null,
      isDaytime: null,
    }).provider.getForecast(coordinates);
    expect(r.periods[0].airTemperatureC).toBeNull();
    expect(r.periods[0].windSpeedMps).toBeNull();
    expect(r.missingFields).toContain("windSpeed");
  });
  it("marks stale forecast updates", async () =>
    expect(
      (
        await fixture(period, "2026-10-18T10:00:00Z").provider.getForecast(
          coordinates,
        )
      ).status,
    ).toBe("stale"));
  it("rejects future forecast update times", async () =>
    expect(
      (
        await fixture(period, "2026-10-18T19:00:00Z").provider.getForecast(
          coordinates,
        )
      ).status,
    ).toBe("unavailable"));
  it.each(["2026-02-30T12:00:00Z", "bad-time"])(
    "rejects invalid dates %s",
    async (startTime) =>
      expect(
        (
          await fixture({ ...period, startTime }).provider.getForecast(
            coordinates,
          )
        ).status,
      ).toBe("unavailable"),
  );
  it("does not return expired periods", async () =>
    expect(
      (
        await fixture({
          ...period,
          startTime: "2026-10-17T11:00:00Z",
          endTime: "2026-10-17T12:00:00Z",
        }).provider.getForecast(coordinates)
      ).status,
    ).toBe("unavailable"));
  it("rejects reverse time windows", async () =>
    expect(
      (
        await fixture({
          ...period,
          endTime: "2026-10-18T10:00:00-07:00",
        }).provider.getForecast(coordinates)
      ).status,
    ).toBe("unavailable"));
  it("rejects untrusted discovery URLs before following them", async () => {
    const { provider, fetcher } = fixture(period, undefined, {
      properties: {
        ...points.properties,
        forecastHourly: "https://evil.test/private",
      },
    });
    expect((await provider.getForecast(coordinates)).status).toBe(
      "unavailable",
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("reports unavailable hourly coastal coverage", async () =>
    expect(
      (
        await fixture(period, undefined, {
          properties: { timeZone: "America/Los_Angeles", forecastHourly: null },
        }).provider.getForecast(coordinates)
      ).status,
    ).toBe("unavailable"));
  it("isolates network failures as unavailable data", async () => {
    const provider = new NwsWeatherProvider(
      vi.fn(async () => {
        throw new Error("network");
      }),
      now,
    );
    expect((await provider.getForecast(coordinates)).status).toBe(
      "unavailable",
    );
  });
  it("rejects invalid coordinates before network access", async () => {
    const { provider, fetcher } = fixture();
    expect(
      (await provider.getForecast({ latitude: NaN, longitude: 200 })).status,
    ).toBe("unavailable");
    expect(fetcher).not.toHaveBeenCalled();
  });
});
it("accepts forecasts generated during the request, using response receipt time", async () => {
  const clock = vi
    .fn()
    .mockReturnValueOnce(new Date("2026-10-18T18:00:00Z"))
    .mockReturnValue(new Date("2026-10-18T18:00:05Z"));
  const fetcher = vi.fn(async (url: Parameters<typeof fetch>[0]) =>
    withGeometry(
      JSON.stringify(
        String(url).includes("/points/")
          ? points
          : {
              properties: {
                updateTime: "2026-10-18T18:00:02Z",
                generatedAt: "2026-10-18T18:00:03Z",
                periods: [period],
              },
            },
      ),
    ),
  );
  expect(
    (
      await new NwsWeatherProvider(fetcher as typeof fetch, clock).getForecast(
        coordinates,
      )
    ).status,
  ).toBe("available");
});
it.each([
  ["2026-10-18T18:02:00Z", "available"],
  ["2026-10-18T18:02:01Z", "unavailable"],
])(
  "enforces the inclusive two-minute clock-skew boundary %s",
  async (timestamp, status) => {
    const { provider } = fixture(period, timestamp);
    expect((await provider.getForecast(coordinates)).status).toBe(status);
  },
);
it.each([null, undefined, "not-an-iso-time", "2026-10-18T24:00:00Z"])(
  "rejects missing or invalid provider timestamps %s",
  async (timestamp) => {
    const transport = vi.fn(async (url: Parameters<typeof fetch>[0]) =>
      withGeometry(
        JSON.stringify(
          String(url).includes("/points/")
            ? points
            : {
                properties: {
                  updateTime: timestamp,
                  generatedAt: timestamp,
                  periods: [period],
                },
              },
        ),
      ),
    );
    expect(
      (
        await new NwsWeatherProvider(
          transport as typeof fetch,
          now,
        ).getForecast(coordinates)
      ).status,
    ).toBe("unavailable");
  },
);
it("distinguishes an upstream HTTP failure from malformed provider data", async () => {
  const transport = vi.fn(async () =>
    withGeometry("unavailable", { status: 503 }),
  );
  expect(
    (await new NwsWeatherProvider(transport, now).getForecast(coordinates))
      .errorCode,
  ).toBe("provider-http-503");
});
it("records request and response instants separately", async () => {
  const clock = vi
    .fn()
    .mockReturnValueOnce(new Date("2026-10-18T18:00:00Z"))
    .mockReturnValue(new Date("2026-10-18T18:00:05Z"));
  const { fetcher } = fixture();
  const r = await new NwsWeatherProvider(
    fetcher as typeof fetch,
    clock,
  ).getForecast(coordinates);
  expect(r.requestStartedAt).toBe("2026-10-18T18:00:00.000Z");
  expect(r.responseReceivedAt).toBe("2026-10-18T18:00:05.000Z");
  expect(r.retrievedAt).toBe(r.responseReceivedAt);
});

// Explicit fixture grid cell; not production geography.
const forecastArea = {
  type: "Polygon",
  coordinates: [
    [
      [-123, 37],
      [-122, 37],
      [-122, 38],
      [-123, 38],
      [-123, 37],
    ],
  ],
};
function withGeometry(body?: BodyInit | null, init?: ResponseInit) {
  if (typeof body === "string") {
    try {
      const value = JSON.parse(body);
      if (value.properties?.periods && !value.geometry)
        value.geometry = forecastArea;
      body = JSON.stringify(value);
    } catch {}
  }
  return new Response(body, init);
}
it("rejects a valid forecast for an unrelated grid cell", async () => {
  const transport = vi.fn(async (url: Parameters<typeof fetch>[0]) =>
    withGeometry(
      JSON.stringify(
        String(url).includes("/points/")
          ? points
          : {
              geometry: {
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
              },
              properties: {
                updateTime: "2026-10-18T17:00:00Z",
                generatedAt: "2026-10-18T17:00:00Z",
                periods: [period],
              },
            },
      ),
    ),
  );
  expect(
    (
      await new NwsWeatherProvider(transport as typeof fetch, now).getForecast(
        coordinates,
      )
    ).errorCode,
  ).toBe("location-mismatch");
});
