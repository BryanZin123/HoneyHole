import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { SelectedConditionsPanel } from "../src/presentation/selected-conditions-panel";
import { NwsWeatherProvider } from "../src/infrastructure/nws";
import { NwsAtmosphereProvider } from "../src/infrastructure/nws-atmosphere";
it("shows selected date, missing evidence and independent legal and station limitations", async () => {
  const offline = async () => {
    throw Error("offline");
  };
  const coordinates = { latitude: 37, longitude: -122 };
  render(
    <SelectedConditionsPanel
      detail={{
        location: {
          id: "fixture",
          name: "Fixture",
          coordinates,
          type: "beach",
          county: "San Mateo",
          access: "unknown",
          sourceUrl: "https://example.test",
          parkUrl: null,
          retrievedAt: "2026-10-22T00:00:00Z",
          datasetUpdatedAt: null,
          sourceFeature: {},
        },
        activity: {
          species: "redtail surfperch",
          method: "shore-angling",
          jurisdiction: "US-CA",
          date: "2026-10-23",
          coordinates,
        },
        weather: await new NwsWeatherProvider(offline).getForecast(coordinates),
        atmosphere: await new NwsAtmosphereProvider(offline).getAtmosphere(
          coordinates,
        ),
        tides: {
          status: "unavailable",
          conditions: null,
          distanceKm: null,
          transferRelevance: "UNVERIFIED",
          reason: "Offline",
        },
      }}
    />,
  );
  expect(
    screen.getByRole("region", {
      name: "Selected-date environmental evidence",
    }),
  ).toBeVisible();
  expect(screen.getByText(/Conditions for 2026-10-23/)).toBeVisible();
  expect(screen.getByText(/No usable hourly forecast/)).toBeVisible();
  expect(screen.getByText(/No fishing prediction/)).toBeVisible();
  expect(screen.getByText(/Transfer relevance UNVERIFIED/)).toBeVisible();
  expect(screen.getByText(/Marine station evidence unavailable/)).toBeVisible();
});
