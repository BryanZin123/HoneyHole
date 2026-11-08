import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { RefreshCoastalWarnings } from "../src/presentation/refresh-coastal-warnings";
import type { WarningEvidence } from "../src/application/warning-provider";
const point = { latitude: 36.8, longitude: -121.8 };
const initial: WarningEvidence = {
  status: "empty",
  coordinates: point,
  sourceUrl: "https://api.weather.gov/alerts/active",
  retrievedAt: "2026-11-08T18:00:00Z",
  updatedAt: null,
  alerts: [],
  reason: "Original empty snapshot",
};
const props = {
  initial,
  id: "7",
  coordinates: point,
  date: "2026-11-08",
  consented: true,
};
const fresh = {
  ...initial,
  reason: "Fresh empty snapshot",
  refresh: {
    delivery: "fresh",
    attemptedAt: "2026-11-08T19:00:00Z",
    nextAllowedAt: "2026-11-08T19:00:30Z",
  },
};
afterEach(() => vi.unstubAllGlobals());
it("refreshes only the warning endpoint with exact public coordinates and consent", async () => {
  const f = vi.fn(async () => Response.json(fresh));
  vi.stubGlobal("fetch", f);
  render(<RefreshCoastalWarnings {...props} />);
  expect(f).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button"));
  await screen.findByText("Fresh empty snapshot");
  expect(f).toHaveBeenCalledTimes(1);
  expect(f.mock.calls[0]).toEqual(
    expect.arrayContaining(["/api/v1/locations/7/warnings"]),
  );
  expect(
    screen.getByText(/Only official warnings were refreshed/),
  ).toBeVisible();
});
it("requires consent and ignores results after withdrawal", async () => {
  let resolve!: (r: Response) => void;
  vi.stubGlobal(
    "fetch",
    vi.fn(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    ),
  );
  const { rerender } = render(
    <RefreshCoastalWarnings {...props} consented={false} />,
  );
  expect(screen.getByRole("button")).toBeDisabled();
  rerender(<RefreshCoastalWarnings {...props} />);
  fireEvent.click(screen.getByRole("button"));
  rerender(<RefreshCoastalWarnings {...props} consented={false} />);
  await act(async () => resolve(Response.json(fresh)));
  expect(screen.queryByText("Fresh empty snapshot")).toBeNull();
  expect(screen.getByText("Original empty snapshot")).toBeVisible();
});
it("retains previous evidence as historical after failure", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({ error: "Source identity changed" }, { status: 409 }),
    ),
  );
  render(<RefreshCoastalWarnings {...props} />);
  fireEvent.click(screen.getByRole("button"));
  await screen.findByText(/Unknown — refresh unsuccessful/);
  expect(
    screen.getByRole("heading", { name: "Historical evidence only" }),
  ).toBeVisible();
  expect(screen.getByText(/Previous snapshot from/)).toBeVisible();
});
it("explains early attempts without a request and labels previous evidence historical", async () => {
  const f = vi.fn();
  vi.stubGlobal("fetch", f);
  render(
    <RefreshCoastalWarnings
      {...props}
      initial={{
        ...initial,
        refresh: {
          delivery: "fresh",
          attemptedAt: new Date().toISOString(),
          nextAllowedAt: new Date(Date.now() + 30000).toISOString(),
        },
      }}
    />,
  );
  fireEvent.click(screen.getByRole("button"));
  expect(f).not.toHaveBeenCalled();
  expect(screen.getByText(/Unknown — refresh deferred/)).toBeVisible();
});
it("prevents an obsolete request from overwriting a newer refresh", async () => {
  let finish!: (r: Response) => void;
  const f = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise((r) => {
          finish = r;
        }),
    )
    .mockResolvedValueOnce(Response.json(fresh));
  vi.stubGlobal("fetch", f);
  const { rerender } = render(<RefreshCoastalWarnings {...props} />);
  fireEvent.click(screen.getByRole("button"));
  rerender(<RefreshCoastalWarnings {...props} consented={false} />);
  rerender(<RefreshCoastalWarnings {...props} />);
  await waitFor(() => expect(screen.getByRole("button")).toBeEnabled());
  fireEvent.click(screen.getByRole("button"));
  await screen.findByText("Fresh empty snapshot");
  await act(async () =>
    finish(Response.json({ ...fresh, reason: "Obsolete response" })),
  );
  expect(screen.queryByText("Obsolete response")).toBeNull();
});
it("reports added, removed and updated IDs without treating removal as ended hazard", async () => {
  const a = {
    id: "old",
    sourceUrl: "https://api.weather.gov/alerts/old",
    event: "Advisory",
    sender: "NWS",
    severity: "Minor",
    urgency: "Expected",
    certainty: "Likely",
    area: "Zone",
    sent: initial.retrievedAt,
    effective: initial.retrievedAt,
    onset: null,
    expires: "2026-11-09T00:00:00Z",
    ends: null,
    instruction: null,
    applicability: "NWS point/zone" as const,
    period: "overlap" as const,
    zones: [],
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({
        ...fresh,
        status: "available",
        alerts: [
          { ...a, id: "new" },
          { ...a, id: "same", severity: "Moderate" },
        ],
      }),
    ),
  );
  render(
    <RefreshCoastalWarnings
      {...props}
      initial={{
        ...initial,
        status: "available",
        alerts: [a, { ...a, id: "same" }],
      }}
    />,
  );
  fireEvent.click(screen.getByRole("button"));
  expect(
    await screen.findByText(/added IDs new; removed IDs old; updated IDs same/),
  ).toBeVisible();
});
it("unknown response preserves prior snapshot rather than implying empty results", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({
        ...fresh,
        status: "unknown",
        reason: "Stale HTTP response",
      }),
    ),
  );
  render(<RefreshCoastalWarnings {...props} />);
  fireEvent.click(screen.getByRole("button"));
  await screen.findByText(/Unknown — refresh unsuccessful/);
  expect(
    screen.getByRole("heading", { name: "Historical evidence only" }),
  ).toBeVisible();
});
