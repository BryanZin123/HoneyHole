import { render, screen } from "@testing-library/react";
import { it, expect, vi, afterEach } from "vitest";
import { TripVerification } from "../src/presentation/trip-verification";
import { RefreshCoastalWarnings } from "../src/presentation/refresh-coastal-warnings";
import { fireEvent } from "@testing-library/react";
const entrance = {
  id: "1",
  name: "Fixture SB",
  coordinates: { latitude: 36.8, longitude: -121.8 },
  sourceUrl: "https://www.parks.ca.gov/",
  parkUrl: null,
  retrievedAt: "2026-11-10T18:00:00Z",
  datasetUpdatedAt: null,
};
const plan = {
  date: "2026-11-10",
  species: "barred surfperch",
  method: "shore-angling",
};
afterEach(() => vi.unstubAllGlobals());
it("renders seven evidence categories and next actions without calls or completion controls", () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  render(<TripVerification entrance={entrance} plan={plan} />);
  expect(
    screen.getByRole("region", { name: "Fishing Trip Verification" }),
  ).toBeVisible();
  expect(screen.getAllByText("Next:")).toHaveLength(7);
  expect(screen.queryByRole("checkbox")).toBeNull();
  expect(fetcher).not.toHaveBeenCalled();
  expect(screen.getByText(/Fishing point not yet assessed/)).toBeVisible();
});
it("warning refresh failure updates the trip projection while preserving historical evidence", async () => {
  const initial = {
    status: "empty" as const,
    coordinates: entrance.coordinates,
    sourceUrl: "https://api.weather.gov/alerts/active",
    retrievedAt: new Date().toISOString(),
    updatedAt: null,
    alerts: [],
    reason: "Fixture no alerts",
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({ error: "Provider unavailable" }, { status: 503 }),
    ),
  );
  render(
    <RefreshCoastalWarnings
      initial={initial}
      id="1"
      coordinates={entrance.coordinates}
      date={plan.date}
      consented
      renderSummary={(warnings, historical, failed) => (
        <TripVerification
          entrance={entrance}
          plan={plan}
          warnings={warnings}
          warningHistorical={historical}
          warningFailed={failed}
        />
      )}
    />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Refresh official warnings" }),
  );
  expect(
    await screen.findByText(
      /Refresh unsuccessful; the latest warning assessment is unknown/,
    ),
  ).toBeVisible();
  expect(
    screen.getByRole("heading", { name: "Historical evidence only" }),
  ).toBeVisible();
});
