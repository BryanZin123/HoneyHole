import { afterEach, expect, it, vi } from "vitest";
import { GET } from "../src/app/api/v1/coastal-access/route";
afterEach(() => vi.unstubAllGlobals());
it.each([
  "",
  "?latitude=&longitude=-122",
  "?latitude=37&longitude=NaN",
  "?latitude=91&longitude=-122",
  "?latitude=40&longitude=-74",
])("rejects missing/invalid/outside-envelope query %s", async (query) => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  const response = await GET(
    new Request("http://localhost/api/v1/coastal-access" + query),
  );
  expect(response.status).toBe(400);
  expect(fetcher).not.toHaveBeenCalled();
});
it("returns explicit unknown status and no legal clearance on outage", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw Error("private transport detail");
    }),
  );
  const response = await GET(
    new Request(
      "http://localhost/api/v1/coastal-access?latitude=37&longitude=-122",
    ),
  );
  expect(response.status).toBe(200);
  expect(response.headers.get("X-API-Version")).toBe("1");
  const body = await response.json();
  expect(body.access.status).toBe("unknown");
  expect(body.legallyVerified).toBe(false);
  expect(JSON.stringify(body)).not.toContain("private transport");
});
