import { expect, it, vi, afterEach } from "vitest";
import { GET } from "../src/app/api/conditions/route";
afterEach(() => vi.unstubAllGlobals());
it("rejects malformed IDs without network requests", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  const r = await GET(
    new Request("http://localhost/api/conditions?station=bad"),
  );
  expect(r.status).toBe(400);
  expect(fetcher).not.toHaveBeenCalled();
});
it("returns a safe error when NOAA is unreachable", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new Error("internal transport details");
    }),
  );
  const r = await GET(
    new Request("http://localhost/api/conditions?station=9414290"),
  );
  expect(r.status).toBe(502);
  expect(await r.text()).not.toContain("internal transport details");
  expect(r.headers.get("Cache-Control")).toBe("no-store");
});
