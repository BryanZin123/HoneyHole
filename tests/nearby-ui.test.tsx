import { render, screen, fireEvent, act } from "@testing-library/react";
import { it, expect, vi, afterEach } from "vitest";
import { NearbyAreas } from "../src/presentation/nearby-areas";
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("../src/presentation/habitat-panel", () => ({
  HabitatPanel: () => null,
}));
vi.mock("../src/presentation/selected-conditions-panel", () => ({
  SelectedConditionsPanel: () => null,
}));
afterEach(() => vi.unstubAllGlobals());
const c = {
  id: "7",
  name: "Fixture SB",
  distanceKm: 3,
  eligibility: "UNVERIFIED",
  access: "unknown",
  regulatoryStatus: "UNVERIFIED",
  coordinates: { latitude: 37.5, longitude: -122.5 },
  reasons: [],
  findings: [],
};
function submit() {
  fireEvent.click(screen.getByRole("button", { name: "Search nearby areas" }));
}
function setup() {
  render(<NearbyAreas />);
  fireEvent.change(screen.getByLabelText("Center latitude"), {
    target: { value: "37.51" },
  });
  fireEvent.change(screen.getByLabelText("Center longitude"), {
    target: { value: "-122.52" },
  });
  fireEvent.change(screen.getByLabelText("Fishing date (California)"), {
    target: { value: "2026-11-07" },
  });
}
it("ignores a late first search after the radius changes", async () => {
  let finish!: (r: Response) => void;
  const f = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise<Response>((r) => {
          finish = r;
        }),
    )
    .mockResolvedValueOnce(
      Response.json({ status: "available", candidates: [] }),
    );
  vi.stubGlobal("fetch", f);
  setup();
  submit();
  fireEvent.change(screen.getByLabelText("Radius (km)"), {
    target: { value: "1" },
  });
  submit();
  await screen.findByText(/No matching State Beach entrances/);
  await act(async () => finish(Response.json({ candidates: [c] })));
  expect(screen.queryByRole("button", { name: c.name })).toBeNull();
});
it.each([true, false])(
  "validates source identity and separates newly restricted entrances (mismatch=%s)",
  async (mismatch) => {
    const d = {
      location: {
        ...c,
        coordinates: { ...c.coordinates, latitude: mismatch ? 37.51 : 37.5 },
      },
      activity: {
        coordinates: c.coordinates,
        species: "",
        date: "2026-11-07",
        method: "shore-angling",
      },
      opportunity: { eligibility: "EXCLUDED", reasons: ["ACCESS_RESTRICTED"] },
      access: { access: { status: "restricted" } },
      habitat: {
        association: { status: "not-reviewed" },
        locationEvidence: { status: "missing" },
      },
      regulations: { status: "UNVERIFIED", findings: [] },
      shoreline: { features: [], status: "empty" },
    };
    const f = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ candidates: [c] }))
      .mockResolvedValueOnce(Response.json(d));
    vi.stubGlobal("fetch", f);
    setup();
    submit();
    fireEvent.click(await screen.findByRole("button", { name: c.name }));
    expect(f).toHaveBeenCalledTimes(1);
    const load = screen.getByRole("button", { name: "Load entrance evidence" });
    expect(load).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(load);
    if (mismatch) {
      await screen.findByRole("alert");
      expect(
        screen.queryByRole("heading", { name: "Excluded areas" }),
      ).toBeNull();
    } else {
      await screen.findByRole("heading", { name: "Excluded areas" });
      expect(
        screen.getByRole("heading", { name: "Areas to investigate (0)" }),
      ).toBeInTheDocument();
    }
  },
);
