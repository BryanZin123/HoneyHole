import { afterEach, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ExploreDiscovery } from "../src/presentation/explore-discovery";
import { getLocationDetail } from "../src/application/get-location-detail";
import { NwsWeatherProvider } from "../src/infrastructure/nws";
import { NwsAtmosphereProvider } from "../src/infrastructure/nws-atmosphere";
import { CaliforniaCoastalProvider } from "../src/infrastructure/california-coastal";
import type { ShoreLocation } from "../src/domain/discovery";
vi.mock("next/dynamic", () => ({
  default: () =>
    function MapFixture({
      locations,
      onSelect,
    }: {
      locations: ShoreLocation[];
      onSelect: (id: string) => void;
    }) {
      return (
        <div>
          {locations.map((l) => (
            <button key={l.id} onClick={() => onSelect(l.id)}>
              Map pin {l.name}
            </button>
          ))}
        </div>
      );
    },
}));
afterEach(() => vi.unstubAllGlobals());
const location: ShoreLocation = {
  id: "1",
  name: "Fixture SB",
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
it("searches, selects a map pin and shows coordinates plus separate unknown eligibility on provider outages", async () => {
  const offline = async () => {
    throw Error("offline");
  };
  const detail = await getLocationDetail(
    location,
    {
      species: "",
      method: "shore-angling",
      date: "2026-10-21",
      jurisdiction: "US-CA",
      coordinates: location.coordinates,
    },
    {
      weather: new NwsWeatherProvider(offline),
      atmosphere: new NwsAtmosphereProvider(offline),
      access: new CaliforniaCoastalProvider(offline),
      tides: {
        get: async () => ({
          status: "unavailable",
          transferRelevance: "UNVERIFIED",
          distanceKm: null,
          conditions: null,
          reason: "No local tide transfer verified.",
        }),
      },
      regulations: [],
    },
  );
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async (url: unknown) =>
        new Response(
          JSON.stringify(
            String(url).includes("/locations/1?")
              ? detail
              : { status: "available", locations: [location] },
          ),
        ),
    ),
  );
  render(<ExploreDiscovery />);
  fireEvent.click(
    screen.getByRole("button", { name: "Find shoreline locations" }),
  );
  fireEvent.click(
    await screen.findByRole("button", { name: "Map pin Fixture SB" }),
  );
  expect(await screen.findByText(/37.5, -122.5/)).toBeInTheDocument();
  expect(
    screen.getByText("UNVERIFIED", { selector: "strong" }),
  ).toBeInTheDocument();
  expect(screen.getByText("emergency: UNVERIFIED")).toBeInTheDocument();
  expect(
    screen.getByText(/No local tide transfer verified/),
  ).toBeInTheDocument();
});
it("reports empty searches without fake pins", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(JSON.stringify({ status: "available", locations: [] })),
    ),
  );
  render(<ExploreDiscovery />);
  fireEvent.click(
    screen.getByRole("button", { name: "Find shoreline locations" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "No State Beach entry points",
  );
  expect(screen.queryByRole("button", { name: /Map pin/ })).toBeNull();
});

it("displays effective-dated prohibition evidence and sends selected species/date/method", async () => {
  const { CaliforniaRegulationProvider } =
    await import("../src/infrastructure/california-effective-rules");
  const offline = async () => {
    throw Error("offline");
  };
  const detail = await getLocationDetail(
    location,
    {
      species: "California grunion",
      method: "hand-gathering",
      date: "2026-06-30",
      coordinates: location.coordinates,
      jurisdiction: "US-CA",
    },
    {
      weather: new NwsWeatherProvider(offline),
      atmosphere: new NwsAtmosphereProvider(offline),
      access: new CaliforniaCoastalProvider(offline),
      tides: {
        get: async () => ({
          status: "unavailable",
          transferRelevance: "UNVERIFIED",
          distanceKm: null,
          conditions: null,
          reason: "Unavailable",
        }),
      },
      regulations: [],
      regulationProvider: new CaliforniaRegulationProvider(),
      regulatoryScopes: [
        {
          id: "US-CA",
          authority: "legal",
          sourceUrl: "https://example.test/state",
        },
      ],
      checkedOn: "2026-10-21",
    },
  );
  const fetcher = vi.fn(
    async (url: unknown) =>
      new Response(
        JSON.stringify(
          String(url).includes("/locations/1?")
            ? detail
            : { status: "available", locations: [location] },
        ),
      ),
  );
  vi.stubGlobal("fetch", fetcher);
  render(<ExploreDiscovery />);
  fireEvent.click(
    screen.getByRole("button", { name: "Find shoreline locations" }),
  );
  fireEvent.click(
    await screen.findByRole("button", { name: "Map pin Fixture SB" }),
  );
  expect(
    await screen.findByText(/California grunion take is closed/),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "CA-28.00-season authoritative source" }),
  ).toHaveAttribute(
    "href",
    "https://nrm.dfg.ca.gov/FileHandler.ashx?DocumentID=202020",
  );
  expect(screen.getByText(/Missing or unresolved:/)).toHaveTextContent("mpa");
  expect(screen.getAllByText(/Legal effect: 2022-06-01/)).toHaveLength(3);
  fireEvent.change(screen.getByLabelText("Target species"), {
    target: { value: "California grunion" },
  });
  fireEvent.change(screen.getByLabelText("Fishing date"), {
    target: { value: "2026-06-30" },
  });
  fireEvent.change(screen.getByLabelText("Fishing method"), {
    target: { value: "hand-gathering" },
  });
  await screen.findByText(/California grunion take is closed/);
  expect(
    fetcher.mock.calls.some(([url]) =>
      String(url).includes(
        "species=California+grunion&date=2026-06-30&method=hand-gathering",
      ),
    ),
  ).toBe(true);
});
