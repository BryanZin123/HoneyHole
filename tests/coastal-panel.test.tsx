import { afterEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CoastalPanel } from "../src/presentation/coastal-panel";
afterEach(() => vi.unstubAllGlobals());
it("displays an explicit unknown state on network failure", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw Error("offline");
    }),
  );
  render(<CoastalPanel />);
  fireEvent.change(screen.getByLabelText("Latitude"), {
    target: { value: "37" },
  });
  fireEvent.change(screen.getByLabelText("Longitude"), {
    target: { value: "-122" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Check access" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Access remains unknown",
  );
});
it("shows source-derived public access separately from unchecked fishing permission", async () => {
  const evidence = {
    status: "available",
    records: [],
    source: {
      url: "https://example.test",
      attribution: "Fixture source",
      license: "Fixture license",
      datasetVersion: "Fixture",
      retrievedAt: "2026-10-18T00:00:00Z",
    },
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            coordinates: { latitude: 37, longitude: -122 },
            access: { status: "verified-public", evidence },
            protectedAreas: evidence,
            fishingPermission: "unknown",
            legallyVerified: false,
          }),
        ),
    ),
  );
  render(<CoastalPanel />);
  fireEvent.submit(
    screen.getByRole("button", { name: "Check access" }).closest("form")!,
  );
  expect(
    await screen.findByRole("heading", {
      name: "Access: Public in source records",
    }),
  ).toBeInTheDocument();
  expect(screen.getByText(/Fishing permission: unknown/)).toBeInTheDocument();
});
