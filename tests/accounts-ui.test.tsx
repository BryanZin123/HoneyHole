import { afterEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SaveLocation } from "../src/presentation/save-location";
import { SavedPlaces } from "../src/presentation/saved-places";
import { AccountPanel } from "../src/presentation/account-panel";
vi.mock("next/dynamic", () => ({
  default: () => () => <div>Map fixture</div>,
}));
afterEach(() => vi.unstubAllGlobals());
it("Explore save defaults private and presents sign-in on unauthorized", async () => {
  const f = vi.fn(
    async () =>
      new Response(JSON.stringify({ error: "Sign in required" }), {
        status: 401,
      }),
  );
  vi.stubGlobal("fetch", f);
  render(
    <SaveLocation
      location={{
        id: "123",
        name: "Fixture SB",
        coordinates: { latitude: 34, longitude: -119 },
        type: "beach",
        county: "Ventura",
        access: "unknown",
        sourceUrl: "https://example.test",
        parkUrl: null,
        retrievedAt: "2026-10-21T00:00:00Z",
        datasetUpdatedAt: null,
        sourceFeature: {},
      }}
    />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Save private Honey Hole" }),
  );
  expect(
    await screen.findByRole("link", { name: "Sign in or register" }),
  ).toHaveAttribute("href", "/account");
  const options = f.mock.calls[0] as unknown as [string, RequestInit];
  expect(JSON.parse(options[1].body as string)).toEqual({
    name: "Fixture SB",
    latitude: 34,
    longitude: -119,
    sourceId: "123",
  });
});
it("Saved hides data and offers sign-in when unauthenticated", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("{}", { status: 401 })),
  );
  render(<SavedPlaces />);
  expect(
    await screen.findByRole("link", { name: "Sign in or register" }),
  ).toBeInTheDocument();
  expect(screen.queryByText("Create custom pin")).toBeNull();
});
it("account form registers then exposes logout and saved workflow", async () => {
  let signed = false;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: unknown) => {
      if (String(url).includes("sign-up")) {
        signed = true;
        return Response.json({ ok: true });
      }
      if (String(url).includes("sign-out")) {
        signed = false;
        return Response.json({ ok: true });
      }
      return signed
        ? Response.json({
            user: { name: "Fixture", email: "fixture@example.test" },
          })
        : new Response("{}", { status: 401 });
    }),
  );
  render(<AccountPanel />);
  fireEvent.click(await screen.findByRole("button", { name: "Register" }));
  fireEvent.change(screen.getByLabelText("Display name"), {
    target: { value: "Fixture" },
  });
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "fixture@example.test" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "fixture-password-9!" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Create account" }));
  fireEvent.click(await screen.findByRole("button", { name: "Sign out" }));
  expect(await screen.findByText("Signed out.")).toBeInTheDocument();
});

it("Saved supports create, edit and deletion without loading external map tiles automatically", async () => {
  const { defaultPreferences } = await import("../src/domain/user-data");
  let pins: Record<string, unknown>[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: unknown, options?: RequestInit) => {
      const path = String(url);
      if (path.includes("preferences"))
        return Response.json(defaultPreferences);
      if (options?.method === "POST") {
        const input = JSON.parse(options.body as string);
        pins = [
          {
            ...input,
            id: "fixture-id",
            privacy: "PRIVATE",
            createdAt: "2026-10-21T00:00:00Z",
            updatedAt: "2026-10-21T00:00:00Z",
          },
        ];
        return Response.json(pins[0], { status: 201 });
      }
      if (options?.method === "PATCH") {
        pins = [{ ...pins[0], ...JSON.parse(options.body as string) }];
        return Response.json(pins[0]);
      }
      if (options?.method === "DELETE") {
        pins = [];
        return new Response(null, { status: 204 });
      }
      return Response.json(pins);
    }),
  );
  render(<SavedPlaces />);
  await screen.findByText("Create custom pin");
  expect(screen.queryByText("Map fixture")).toBeNull();
  fireEvent.change(screen.getByLabelText("Location name"), {
    target: { value: "Fixture cove" },
  });
  fireEvent.change(screen.getByLabelText("Latitude"), {
    target: { value: "34" },
  });
  fireEvent.change(screen.getByLabelText("Longitude"), {
    target: { value: "-119" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Create private pin" }));
  fireEvent.click(
    await screen.findByRole("button", { name: "Edit Fixture cove" }),
  );
  fireEvent.change(screen.getByLabelText("Location name"), {
    target: { value: "Edited cove" },
  });
  fireEvent.change(screen.getByLabelText("Private notes"), {
    target: { value: "Private fixture" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save pin changes" }));
  fireEvent.click(
    await screen.findByRole("button", { name: "Delete Edited cove" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));
  expect(
    await screen.findByText(/No saved Honey Holes yet/),
  ).toBeInTheDocument();
});
