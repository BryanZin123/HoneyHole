import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { CoastalWarnings } from "../src/presentation/coastal-warnings";
import type { WarningEvidence } from "../src/application/warning-provider";
const base: WarningEvidence = {
  status: "empty",
  coordinates: { latitude: 36.8, longitude: -121.8 },
  retrievedAt: "2026-11-07T18:00:00Z",
  updatedAt: null,
  sourceUrl: "https://api.weather.gov/alerts/active",
  alerts: [],
  reason: "No active NWS alerts were returned.",
};
it("keeps zero results separate from a safety clearance and future forecast", () => {
  render(<CoastalWarnings evidence={base} />);
  expect(screen.getByText(/No active NWS/)).toBeVisible();
  expect(screen.getByText(/not a safety clearance/)).toBeVisible();
  expect(screen.getByText(/Future hazard status/)).toBeVisible();
});
it("explains unavailable evidence and attribution without inventing observations", () => {
  render(
    <CoastalWarnings
      evidence={{ ...base, status: "unknown", reason: "NWS returned HTTP 503" }}
    />,
  );
  expect(screen.getByText(/HTTP 503/)).toBeVisible();
  expect(screen.queryByText(/No active NWS/)).toBeNull();
});
it("missing evidence remains unknown", () => {
  render(<CoastalWarnings />);
  expect(screen.getByText(/hazard status is unknown/)).toBeVisible();
});
