import { expect, it, vi } from "vitest";
import { getEnvironmentalConditions } from "../src/application/get-environmental-conditions";
import { californiaCoast } from "../src/config/regions";
import type { MarineConditions } from "../src/domain/marine";
import type { WeatherForecast } from "../src/domain/weather";
const emptyProduct = {
  status: "unavailable" as const,
  measurements: [],
  retrievedAt: "2026-10-18T18:00:00Z",
  sourceUrl: "https://example.test",
};
const marineData: MarineConditions = {
  station: {
    id: "test",
    name: "Fixture",
    latitude: 37,
    longitude: -122,
    state: "CA",
    countryCode: "US",
  },
  waterTemperature: emptyProduct,
  tides: emptyProduct,
};
const weatherData: WeatherForecast = {
  status: "unavailable",
  kind: "forecast",
  coordinates: { latitude: 37, longitude: -122 },
  sourceUrl: "https://example.test",
  retrievedAt: "2026-10-18T18:00:00Z",
  issuedAt: null,
  updatedAt: null,
  generatedAt: null,
  timeZone: null,
  periods: [],
  missingFields: [],
};
it("uses verified station coordinates and preserves marine results when forecast is unavailable", async () => {
  const weather = { getForecast: vi.fn(async () => weatherData) };
  const result = await getEnvironmentalConditions(
    "test",
    { getConditions: async () => marineData },
    weather,
    californiaCoast,
  );
  expect(weather.getForecast).toHaveBeenCalledWith({
    latitude: 37,
    longitude: -122,
  });
  expect(result.tides).toEqual(emptyProduct);
  expect(result.weather.status).toBe("unavailable");
});
it("does not query weather for a station outside the active region", async () => {
  const weather = { getForecast: vi.fn(async () => weatherData) };
  await expect(
    getEnvironmentalConditions(
      "test",
      {
        getConditions: async () => ({
          ...marineData,
          station: { ...marineData.station, state: "OR" },
        }),
      },
      weather,
      californiaCoast,
    ),
  ).rejects.toThrow(/region/);
  expect(weather.getForecast).not.toHaveBeenCalled();
});
