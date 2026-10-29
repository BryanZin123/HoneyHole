import { render, screen } from "@testing-library/react";
import { it, expect } from "vitest";
import { HabitatPanel } from "../src/presentation/habitat-panel";
import { getHabitatAssessment } from "../src/application/get-habitat-assessment";
import { CaliforniaHabitatEvidence } from "../src/infrastructure/california-habitat";
it("separates documented associations, missing location data and unavailable recommendations", async () => {
  render(
    <HabitatPanel
      assessment={await getHabitatAssessment(
        {
          locationId: "fixture",
          coordinates: { latitude: 37, longitude: -122 },
          species: "barred surfperch",
          date: "2026-10-28",
          checkedOn: "2026-10-28",
        },
        new CaliforniaHabitatEvidence(),
      )}
    />,
  );
  expect(
    screen.getByRole("region", { name: "Species habitat evidence" }),
  ).toBeVisible();
  expect(
    screen.getByRole("heading", { name: "Documented habitat association" }),
  ).toBeVisible();
  expect(
    screen.getByRole("heading", {
      name: "Location habitat evidence · missing",
    }),
  ).toBeVisible();
  expect(screen.getByText(/Fishing recommendation: unavailable/)).toBeVisible();
  expect(screen.getByText(/January 2012 CDFW species account/)).toBeVisible();
  expect(
    screen.getByRole("link", { name: "[cdfw-life-history]" }),
  ).toHaveAttribute(
    "href",
    "https://wildlife.ca.gov/Conservation/Marine/Life-History-Fish",
  );
});
