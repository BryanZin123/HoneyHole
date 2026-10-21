import { expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ExploreMap } from "../src/presentation/explore-map";
import type { ShoreLocation } from "../src/domain/discovery";
it("renders source coordinates as a selectable Leaflet pin and preserves attribution", () => {
  const location: ShoreLocation = {
    id: "fixture",
    name: "Fixture Beach SB",
    coordinates: { latitude: 37.5, longitude: -122.5 },
    type: "beach",
    county: "San Mateo",
    access: "unknown",
    sourceUrl: "https://example.test",
    parkUrl: null,
    retrievedAt: "2026-10-21T00:00:00Z",
    datasetUpdatedAt: null,
    sourceFeature: {},
  };
  const select = vi.fn();
  render(
    <ExploreMap locations={[location]} selectedId={null} onSelect={select} />,
  );
  fireEvent.click(screen.getByTitle("Fixture Beach SB"));
  expect(select).toHaveBeenCalledWith("fixture");
  expect(
    screen.getByRole("link", { name: "OpenStreetMap" }),
  ).toBeInTheDocument();
});
