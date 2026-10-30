import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { it, expect, vi, afterEach } from "vitest";
import { FishingPointPanel } from "../src/presentation/fishing-point-panel";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const point = { latitude: 37.5, longitude: -122.5 };
it("opens sign-in separately so the unsaved coordinate remains in its original tab", () => {
  render(<FishingPointPanel point={point} />);
  const link = screen.getByRole("link", { name: "Sign in in another tab" });
  expect(link).toHaveAttribute("target", "_blank");
  expect(link).toHaveAttribute("rel", "noopener noreferrer");
  expect(screen.getByLabelText("Fishing-point coordinates")).toHaveTextContent(
    "37.5, -122.5",
  );
});
it("prevents repeat saves while pending and after successful private save", async () => {
  let finish!: (r: Response) => void;
  const f = vi.fn(() => new Promise<Response>((r) => (finish = r)));
  vi.stubGlobal("fetch", f);
  render(<FishingPointPanel point={point} />);
  const save = screen.getByRole("button", {
    name: "Save fishing point privately",
  });
  fireEvent.click(save);
  expect(save).toBeDisabled();
  fireEvent.click(save);
  expect(f).toHaveBeenCalledTimes(1);
  finish(Response.json({ id: "synthetic" }, { status: 201 }));
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Fishing point saved" }),
    ).toBeDisabled(),
  );
});
it("allows retry after sign-in without discarding the point or consenting to providers", async () => {
  const f = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ error: "Sign in" }, { status: 401 }))
    .mockResolvedValueOnce(Response.json({ id: "synthetic" }, { status: 201 }));
  vi.stubGlobal("fetch", f);
  render(<FishingPointPanel point={point} />);
  fireEvent.click(
    screen.getByRole("button", { name: "Save fishing point privately" }),
  );
  await screen.findByText("Sign in to save this fishing point.");
  expect(
    screen.getByRole("button", { name: "Save fishing point privately" }),
  ).toBeEnabled();
  expect(screen.getByRole("checkbox")).not.toBeChecked();
  fireEvent.click(
    screen.getByRole("button", { name: "Save fishing point privately" }),
  );
  await screen.findByRole("button", { name: "Fishing point saved" });
  expect(f.mock.calls.every((c) => c[0] === "/api/v1/pins")).toBe(true);
});
