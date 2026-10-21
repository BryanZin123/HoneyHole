import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { WeatherPanel } from "../src/presentation/weather-panel";
it("labels unavailable forecast and does not turn missing data into an alert", () => {
  render(
    <WeatherPanel
      timeZone="America/Los_Angeles"
      forecast={{
        status: "unavailable",
        kind: "forecast",
        coordinates: { latitude: 37, longitude: -122 },
        sourceUrl: "https://api.weather.gov",
        retrievedAt: "2026-10-18T18:00:00Z",
        issuedAt: null,
        updatedAt: null,
        generatedAt: null,
        timeZone: null,
        periods: [],
        missingFields: ["pressure"],
        reason: "Hourly coverage unavailable.",
      }}
    />,
  );
  expect(screen.getByText("Hourly coverage unavailable.")).toBeVisible();
  expect(screen.getByText(/No opportunity alert is generated/)).toBeVisible();
  expect(screen.getByRole("link", { name: /NWS source/ })).toHaveAttribute(
    "href",
    "https://api.weather.gov",
  );
});
