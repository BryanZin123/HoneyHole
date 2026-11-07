import { expect, it } from "vitest";
import { NwsWarnings } from "../src/infrastructure/nws-warnings";
const point = { latitude: 36.8, longitude: -121.8 };
const now = new Date("2026-11-07T18:00:00Z");
const alert = {
  type: "Feature",
  id: "https://api.weather.gov/alerts/urn:test:1",
  geometry: null,
  properties: {
    id: "urn:test:1",
    event: "High Surf Advisory",
    senderName: "NWS Monterey",
    status: "Actual",
    messageType: "Alert",
    severity: "Moderate",
    urgency: "Expected",
    certainty: "Likely",
    areaDesc: "Monterey Bay",
    geocode: { UGC: ["CAZ529"] },
    affectedZones: ["https://api.weather.gov/zones/forecast/CAZ529"],
    references: [],
    sent: "2026-11-07T16:00:00Z",
    effective: "2026-11-07T16:00:00Z",
    onset: "2026-11-07T17:00:00Z",
    expires: "2026-11-08T02:00:00Z",
    ends: null,
    instruction: "Stay away from breaking waves.",
  },
};
const collection = (features: unknown[]) => ({
  type: "FeatureCollection",
  updated: now.toISOString(),
  features,
});
const provider = (data: unknown, status = 200) =>
  new NwsWarnings(
    async () =>
      Response.json(data, { status, headers: { Date: now.toUTCString() } }),
    () => now,
  );
it("retains official zone attribution and only actual validity overlap", async () => {
  const r = await provider(collection([alert])).get(point, "2026-11-07");
  expect(r.status).toBe("available");
  expect(r.alerts[0].period).toBe("overlap");
  expect(r.coordinates).toEqual(point);
  expect(
    (await provider(collection([alert])).get(point, "2026-11-10")).alerts[0]
      .period,
  ).toBe("outside");
});
it("separates empty source from failures", async () => {
  expect((await provider(collection([])).get(point, "2026-11-07")).status).toBe(
    "empty",
  );
  expect((await provider({}, 503).get(point, "2026-11-07")).status).toBe(
    "unknown",
  );
});
import { entranceWarnings } from "../src/application/entrance-warnings";
import { vi } from "vitest";
const change = (p: Record<string, unknown>) => ({
  ...alert,
  properties: { ...alert.properties, ...p },
});
it.each([
  ["expired", { expires: "2026-11-07T17:00:00Z" }],
  ["cancelled", { messageType: "Cancel" }],
  ["test", { status: "Test" }],
  ["future effective", { effective: "2026-11-07T19:00:00Z" }],
  ["invalid timestamp", { sent: "tomorrow" }],
  ["future issued", { sent: "2026-11-07T18:03:00Z" }],
  ["missing timestamp", { sent: null }],
  ["invalid severity", { severity: "Safe" }],
])("keeps %s products from a positive current assessment", async (_, p) => {
  const r = await provider(collection([change(p)])).get(point, "2026-11-07");
  expect(r.status).toBe("unknown");
});
it("retains overlapping distinct products without scoring", async () => {
  const second = {
    ...alert,
    id: "https://api.weather.gov/alerts/urn:test:2",
    properties: {
      ...alert.properties,
      id: "urn:test:2",
      event: "Beach Hazards Statement",
    },
  };
  expect(
    (await provider(collection([alert, second])).get(point, "2026-11-07"))
      .alerts,
  ).toHaveLength(2);
});
it("removes referenced prior products on official update or cancellation", async () => {
  const updated = {
    ...alert,
    id: "https://api.weather.gov/alerts/urn:test:2",
    properties: {
      ...alert.properties,
      id: "urn:test:2",
      messageType: "Update",
      references: [{ identifier: alert.properties.id }],
    },
  };
  const r = await provider(collection([alert, updated])).get(
    point,
    "2026-11-07",
  );
  expect(r.alerts.map((a) => a.id)).toEqual(["urn:test:2"]);
  expect(
    (
      await provider(
        collection([
          alert,
          {
            ...updated,
            properties: { ...updated.properties, messageType: "Cancel" },
          },
        ]),
      ).get(point, "2026-11-07")
    ).alerts,
  ).toHaveLength(0);
});
it("does not infer marine-zone applicability without geocodes", async () => {
  const marine = change({
    event: "Small Craft Advisory",
    geocode: { UGC: ["PZZ535"] },
    affectedZones: ["https://api.weather.gov/zones/forecast/PZZ535"],
  });
  expect(
    (await provider(collection([marine])).get(point, "2026-11-07")).alerts[0]
      .applicability,
  ).toBe("NWS point/zone");
  const r = await provider(collection([change({ geocode: { UGC: [] } })])).get(
    point,
    "2026-11-07",
  );
  expect(r.status).toBe("unknown");
  expect(r.alerts[0].period).toBe("unknown");
});
it("checks polygon geometry including boundaries without snapping coordinates", async () => {
  const geometry = {
    type: "Polygon",
    coordinates: [
      [
        [-122, 36],
        [-121, 36],
        [-121, 37],
        [-122, 37],
        [-122, 36],
      ],
    ],
  };
  expect(
    (
      await provider(collection([{ ...alert, geometry }])).get(
        point,
        "2026-11-07",
      )
    ).alerts[0].applicability,
  ).toBe("polygon");
  expect(
    (
      await provider(collection([{ ...alert, geometry }])).get(
        { latitude: 36, longitude: -122 },
        "2026-11-07",
      )
    ).status,
  ).toBe("available");
  expect(
    (
      await provider(collection([{ ...alert, geometry }])).get(
        { latitude: 38, longitude: -122 },
        "2026-11-07",
      )
    ).status,
  ).toBe("unknown");
});
it.each([
  { type: "FeatureCollection", features: [] },
  { ...collection([]), pagination: { next: "https://api.weather.gov/alerts" } },
  collection([alert, alert]),
  collection([{ ...alert, id: "https://evil.example/alerts/urn:test:1" }]),
])("rejects incomplete/conflicting source response", async (data) =>
  expect((await provider(data).get(point, "2026-11-07")).status).toBe(
    "unknown",
  ),
);
it("separates response age from collection change age and alert issue age", async () => {
  expect(
    (
      await provider({
        ...collection([]),
        updated: "2026-10-01T00:00:00Z",
      }).get(point, "2026-11-07")
    ).status,
  ).toBe("empty");
  const stale = new NwsWarnings(
    async () =>
      Response.json(collection([]), {
        headers: { Date: "Sat, 07 Nov 2026 17:50:00 GMT" },
      }),
    () => now,
  );
  expect((await stale.get(point, "2026-11-07")).reason).toMatch(/freshness/);
});
it("allows provider time after request start before receipt", async () => {
  let calls = 0;
  const p = new NwsWarnings(
    async () =>
      Response.json(collection([]), { headers: { Date: now.toUTCString() } }),
    () => new Date(now.getTime() + (calls++ ? 1000 : -1000)),
  );
  expect((await p.get(point, "2026-11-07")).status).toBe("empty");
});
it("handles network failure without fabricated alerts", async () => {
  const p = new NwsWarnings(
    async () => {
      throw Error("Network unavailable");
    },
    () => now,
  );
  expect((await p.get(point, "2026-11-07")).status).toBe("unknown");
});
it("uses exact consented coordinates, official origin, timeout and no redirects", async () => {
  const f = vi.fn<typeof fetch>(async () =>
    Response.json(collection([]), { headers: { Date: now.toUTCString() } }),
  );
  await new NwsWarnings(f, () => now).get(point, "2026-11-07");
  expect(f.mock.calls[0][0]).toBe(
    "https://api.weather.gov/alerts/active?point=36.8,-121.8",
  );
  expect(f.mock.calls[0][1]?.redirect).toBe("error");
});
it("throttles repeated requests and never reuses another entrance assessment", async () => {
  let clock = 0;
  const get = vi.fn(
    provider(collection([])).get.bind(provider(collection([]))),
  );
  const load = entranceWarnings({ get }, () => clock);
  await load(point, "2026-11-07");
  await load(point, "2026-11-07");
  const other = await load({ ...point, latitude: 36.9 }, "2026-11-07");
  expect(other.status).toBe("unknown");
  expect(get).toHaveBeenCalledTimes(1);
  clock = 30000;
  await load(point, "2026-11-07");
  expect(get).toHaveBeenCalledTimes(2);
});
it("respects California midnight and DST boundaries", async () => {
  const r = await provider(
    collection([change({ onset: "2026-11-08T00:00:00Z" })]),
  ).get(point, "2026-11-08");
  expect(r.alerts[0].period).toBe("outside");
});
import Ajv from "ajv/dist/2020";
import addFormats from "ajv-formats";
import schema from "../docs/api/openapi.json";
it("matches the additive entrance warning API contract", async () => {
  const ajv = new Ajv({ strict: false });
  addFormats(ajv);
  const validate = ajv.compile({
    $ref: "#/components/schemas/WarningEvidence",
    components: schema.components,
  });
  expect(
    validate(await provider(collection([alert])).get(point, "2026-11-07")),
  ).toBe(true);
});
it.each([119000, 121000])(
  "enforces explicit future clock skew tolerance %s ms",
  async (skew) => {
    const p = new NwsWarnings(
      async () =>
        Response.json(collection([]), {
          headers: { Date: new Date(now.getTime() + skew).toUTCString() },
        }),
      () => now,
    );
    expect((await p.get(point, "2026-11-07")).status).toBe(
      skew <= 120000 ? "empty" : "unknown",
    );
  },
);
it("does not extend information validity to a later event end", async () => {
  const r = await provider(
    collection([change({ ends: "2026-11-15T00:00:00Z" })]),
  ).get(point, "2026-11-10");
  expect(r.alerts[0].period).toBe("outside");
});
