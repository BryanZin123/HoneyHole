import { afterEach, expect, it, vi } from "vitest";
import { GET } from "../src/app/api/v1/locations/route";
import { GET as detail } from "../src/app/api/v1/locations/[id]/route";
afterEach(() => vi.unstubAllGlobals());
it.each([
  "?latitude=&longitude=-122&radiusKm=5",
  "?latitude=91&longitude=0&radiusKm=5",
  "?county=Lake",
])("rejects invalid geographic search %s before network", async (q) => {
  const f = vi.fn();
  vi.stubGlobal("fetch", f);
  expect(
    (await GET(new Request("http://localhost/api/v1/locations" + q))).status,
  ).toBe(400);
  expect(f).not.toHaveBeenCalled();
});
it("returns explicit provider failure instead of fake locations", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw Error("private transport");
    }),
  );
  const r = await GET(
    new Request("http://localhost/api/v1/locations?county=San Mateo"),
  );
  expect(r.status).toBe(502);
  expect((await r.json()).locations).toEqual([]);
});
it("rejects impossible regulatory date before provider access", async () => {
  const f = vi.fn();
  vi.stubGlobal("fetch", f);
  expect(
    (
      await detail(
        new Request("http://localhost/api/v1/locations/1?date=2026-02-30"),
        { params: Promise.resolve({ id: "1" }) },
      )
    ).status,
  ).toBe(400);
  expect(f).not.toHaveBeenCalled();
});
it("rejects unsupported methods before provider access", async () => {
  const f = vi.fn();
  vi.stubGlobal("fetch", f);
  expect(
    (
      await detail(
        new Request("http://localhost/api/v1/locations/1?method=net"),
        { params: Promise.resolve({ id: "1" }) },
      )
    ).status,
  ).toBe(400);
  expect(f).not.toHaveBeenCalled();
});
