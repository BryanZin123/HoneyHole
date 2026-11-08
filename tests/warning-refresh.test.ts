import type { WarningEvidence } from "../src/application/warning-provider";
import { expect, it, vi } from "vitest";
import { entranceWarnings } from "../src/application/entrance-warnings";
import { refreshEntranceWarnings } from "../src/application/refresh-entrance-warnings";
const point = { latitude: 36.8, longitude: -121.8 },
  date = "2026-11-08";
const snapshot: WarningEvidence = {
  status: "empty" as const,
  coordinates: point,
  sourceUrl: "https://api.weather.gov/alerts/active",
  retrievedAt: "2026-11-08T18:00:00Z",
  updatedAt: null,
  alerts: [],
  reason: "No active alerts returned.",
};
const request = (v: unknown) =>
  new Request("http://localhost:3000/api/v1/locations/7/warnings", {
    method: "POST",
    headers: {
      origin: "http://localhost:3000",
      "content-type": "application/json",
    },
    body: JSON.stringify(v),
  });
const payload = { coordinates: point, date, consent: true };
const services = () => ({
  origin: "http://localhost:3000",
  get: vi.fn(async () => ({ id: "7", coordinates: point })),
  load: vi.fn(async () => snapshot),
});
it("refreshes warnings only after current canonical identity confirmation", async () => {
  const s = services();
  const r = await refreshEntranceWarnings(request(payload), "7", s);
  expect(r.status).toBe(200);
  expect(await r.json()).toEqual(snapshot);
  expect(s.load).toHaveBeenCalledWith(point, date);
});
it("shares spacing and cached retrieval timestamps", async () => {
  let time = 100000;
  const get = vi.fn(async () => snapshot);
  const load = entranceWarnings({ get }, () => time);
  const first = await load(point, date);
  const repeat = await load(point, date);
  expect(first.refresh?.delivery).toBe("fresh");
  expect(repeat.refresh?.delivery).toBe("reused");
  expect(repeat.retrievedAt).toBe(first.retrievedAt);
  expect(get).toHaveBeenCalledTimes(1);
  time += 30000;
  expect((await load(point, date)).refresh?.delivery).toBe("fresh");
});
it.each([false, undefined])(
  "rejects missing consent %s without source calls",
  async (consent) => {
    const s = services();
    expect(
      (await refreshEntranceWarnings(request({ ...payload, consent }), "7", s))
        .status,
    ).toBe(400);
    expect(s.get).not.toHaveBeenCalled();
    expect(s.load).not.toHaveBeenCalled();
  },
);
it("rejects cross-origin and query coordinate transmission", async () => {
  const s = services();
  const req = new Request(
    "http://localhost:3000/api/v1/locations/7/warnings?lat=36.8",
    {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );
  expect((await refreshEntranceWarnings(req, "7", s)).status).toBe(400);
  expect(
    (
      await refreshEntranceWarnings(
        new Request("http://localhost:3000", { method: "POST" }),
        "7",
        s,
      )
    ).status,
  ).toBe(403);
  expect(s.get).not.toHaveBeenCalled();
});
it.each([
  { ...point, latitude: 36.80000001 },
  { latitude: 37, longitude: -122 },
])(
  "rejects changed or substituted coordinates before NWS",
  async (coordinates) => {
    const s = services();
    expect(
      (
        await refreshEntranceWarnings(
          request({ ...payload, coordinates }),
          "7",
          s,
        )
      ).status,
    ).toBe(409);
    expect(s.load).not.toHaveBeenCalled();
  },
);
it("rejects mismatched canonical id", async () => {
  const s = services();
  s.get.mockResolvedValue({ id: "8", coordinates: point });
  expect((await refreshEntranceWarnings(request(payload), "7", s)).status).toBe(
    409,
  );
  expect(s.load).not.toHaveBeenCalled();
});
it("handles source failure without NWS or unrelated providers", async () => {
  const s = services();
  s.get.mockRejectedValue(Error());
  expect((await refreshEntranceWarnings(request(payload), "7", s)).status).toBe(
    502,
  );
  expect(s.load).not.toHaveBeenCalled();
});
it("keeps unknown provider evidence unknown and preserves date", async () => {
  const s = services();
  s.load = vi.fn(async () => ({
    ...snapshot,
    status: "unknown" as const,
    reason: "Malformed or stale response",
  }));
  const r = await refreshEntranceWarnings(
    request({ ...payload, date: "2026-11-09" }),
    "7",
    s,
  );
  expect((await r.json()).status).toBe("unknown");
  expect(s.load).toHaveBeenCalledWith(point, "2026-11-09");
});
it("serializes concurrent refreshes and defers another entrance or date", async () => {
  let resolve!: (v: typeof snapshot) => void;
  let time = 100000;
  const get = vi.fn(
    () =>
      new Promise<typeof snapshot>((r) => {
        resolve = r;
      }),
  );
  const load = entranceWarnings({ get }, () => time);
  const a = load(point, date),
    b = load(point, date);
  await Promise.resolve();
  expect(get).toHaveBeenCalledTimes(1);
  time += 40000;
  expect((await load({ ...point, latitude: 37 }, date)).refresh?.delivery).toBe(
    "deferred",
  );
  expect((await load(point, "2026-11-09")).status).toBe("unknown");
  resolve(snapshot);
  expect((await a).refresh?.delivery).toBe("fresh");
  expect((await b).refresh?.delivery).toBe("reused");
  expect(get).toHaveBeenCalledTimes(1);
});
it("does not bypass spacing after a rejected provider promise", async () => {
  const get = vi.fn(async () => {
    throw Error("Network");
  });
  const load = entranceWarnings({ get }, () => 100000);
  expect((await load(point, date)).status).toBe("unknown");
  expect((await load(point, date)).refresh?.delivery).toBe("reused");
  expect(get).toHaveBeenCalledTimes(1);
});
import Ajv from "ajv/dist/2020";
import addFormats from "ajv-formats";
import schema from "../docs/api/openapi.json";
it("keeps the existing evidence API contract with additive refresh metadata", async () => {
  const ajv = new Ajv({ strict: false });
  addFormats(ajv);
  const validate = ajv.compile({
    $ref: "#/components/schemas/WarningEvidence",
    components: schema.components,
  });
  const load = entranceWarnings({ get: async () => snapshot });
  expect(validate(await load(point, date))).toBe(true);
  expect(validate(snapshot)).toBe(true);
});
