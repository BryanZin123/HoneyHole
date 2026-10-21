import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MarinePanel } from "../src/presentation/marine-panel";
afterEach(() => vi.unstubAllGlobals());
it("makes no provider request until the user asks and shows a failure without invented data", async () => {
  const fetcher = vi.fn(
    async () =>
      new Response(
        JSON.stringify({ error: "Station could not be verified." }),
        { status: 502 },
      ),
  );
  vi.stubGlobal("fetch", fetcher);
  render(<MarinePanel />);
  expect(fetcher).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Get conditions" }));
  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Station could not be verified.",
    ),
  );
  expect(
    screen.queryByRole("heading", { name: "Water temperature" }),
  ).not.toBeInTheDocument();
});
