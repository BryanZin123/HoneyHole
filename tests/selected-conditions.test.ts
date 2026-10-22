import { expect, it } from "vitest";
import {
  dateContainsInstant,
  periodOverlapsDate,
  selectConditions,
} from "../src/domain/selected-conditions";
import { NwsWeatherProvider } from "../src/infrastructure/nws";
import { NwsAtmosphereProvider } from "../src/infrastructure/nws-atmosphere";
const point = { latitude: 37, longitude: -122 };
const offline = async () => {
  throw Error("offline");
};
it("uses California local dates and exclusive interval ends", () => {
  expect(dateContainsInstant("2026-10-22T06:59:59Z", "2026-10-21")).toBe(true);
  expect(
    periodOverlapsDate(
      "2026-10-22T06:00:00Z",
      "2026-10-22T07:00:00Z",
      "2026-10-22",
    ),
  ).toBe(false);
  expect(
    periodOverlapsDate(
      "2026-10-22T06:00:00Z",
      "2026-10-22T08:00:00Z",
      "2026-10-22",
    ),
  ).toBe(true);
});
it("handles DST and invalid or reversed intervals", () => {
  expect(
    periodOverlapsDate(
      "2026-11-01T08:00:00Z",
      "2026-11-02T08:00:00Z",
      "2026-11-01",
    ),
  ).toBe(true);
  expect(
    periodOverlapsDate("invalid", "2026-11-02T08:00:00Z", "2026-11-01"),
  ).toBe(false);
  expect(
    periodOverlapsDate(
      "2026-11-02T08:00:00Z",
      "2026-11-01T08:00:00Z",
      "2026-11-01",
    ),
  ).toBe(false);
  expect(dateContainsInstant("2026-10-22T08:00:00Z", "2026-02-30")).toBe(false);
});
it("filters dates, rejects mismatched points, and retains provider provenance without invented values", async () => {
  const weather = await new NwsWeatherProvider(offline).getForecast(point);
  const atmosphere = await new NwsAtmosphereProvider(offline).getAtmosphere(
    point,
  );
  weather.status = "available";
  weather.periods = [
    {
      start: "2026-10-22T08:00:00Z",
      end: "2026-10-22T09:00:00Z",
      airTemperatureC: 12,
      windSpeedMps: null,
      windDirection: null,
      summary: "Cloudy",
      isDaytime: false,
    },
  ];
  const input = {
    point,
    date: "2026-10-22",
    weather,
    atmosphere,
    marine: null,
  };
  const result = selectConditions(input);
  expect(result.weather.periods).toHaveLength(1);
  expect(result.weather.sourceUrl).toBe(weather.sourceUrl);
  expect(result.atmosphere.pressure.hPa).toBeNull();
  expect(
    selectConditions({ ...input, date: "2026-10-23" }).weather.periods,
  ).toHaveLength(0);
  expect(
    selectConditions({ ...input, point: { ...point, latitude: 38 } }).weather
      .periods,
  ).toHaveLength(0);
  expect(
    selectConditions({ ...input, weather: { ...weather, status: "stale" } })
      .weather.periods,
  ).toHaveLength(0);
  expect(weather.periods).toHaveLength(1);
});
it("keeps marine values as dated station references and excludes observations from other dates", async () => {
  const weather = await new NwsWeatherProvider(offline).getForecast(point);
  const atmosphere = await new NwsAtmosphereProvider(offline).getAtmosphere(
    point,
  );
  atmosphere.pressure = {
    ...atmosphere.pressure,
    status: "available",
    observedAt: "2026-10-21T12:00:00Z",
    hPa: 1010,
    trendHpaPerHour: 1,
  };
  const product = {
    status: "available" as const,
    sourceUrl: "https://example.test/noaa",
    retrievedAt: "2026-10-22T08:00:00Z",
    measurements: [
      {
        value: 1,
        unit: "m" as const,
        validAt: "2026-10-22T09:00:00Z",
        kind: "prediction" as const,
      },
    ],
  };
  const result = selectConditions({
    point,
    date: "2026-10-22",
    weather,
    atmosphere,
    marine: {
      station: {
        id: "fixture",
        name: "Fixture station",
        latitude: 38,
        longitude: -122,
        state: "CA",
        countryCode: "US",
      },
      tides: product,
      waterTemperature: { ...product, measurements: [] },
    },
  });
  expect(result.atmosphere.pressure.hPa).toBeNull();
  expect(result.atmosphere.pressure.trendHpaPerHour).toBeNull();
  expect(result.marine?.station.id).toBe("fixture");
  expect(result.marine?.tides.measurements).toHaveLength(1);
  expect(result.marine?.waterTemperature.status).toBe("unavailable");
});
