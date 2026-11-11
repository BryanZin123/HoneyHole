import { expect, it } from "vitest";
import { tripVerification } from "../src/application/trip-verification";
it("never treats an entrance record as current closure or fishing-point evidence", () => {
  const s = tripVerification({
    entrance: {
      id: "1",
      name: "Fixture SB",
      coordinates: { latitude: 36.8, longitude: -121.8 },
      sourceUrl: "https://www.parks.ca.gov/",
      parkUrl: null,
      retrievedAt: "2026-11-10T00:00:00Z",
      datasetUpdatedAt: null,
    },
    plan: {
      date: "2026-11-10",
      species: "barred surfperch",
      method: "shore-angling",
    },
  });
  expect(s.rows.find((r) => r.id === "closures")?.status).toBe("UNKNOWN");
  expect(s.rows.find((r) => r.id === "habitat")?.text).toMatch(
    /Fishing point not yet assessed/,
  );
  expect(s.eligibility).toBe("UNVERIFIED");
});
import { beforeAll } from "vitest";
import { getLocationDetail } from "../src/application/get-location-detail";
import { getFishingPoint } from "../src/application/get-fishing-point";
import { NwsWeatherProvider } from "../src/infrastructure/nws";
import { NwsAtmosphereProvider } from "../src/infrastructure/nws-atmosphere";
import { CaliforniaCoastalProvider } from "../src/infrastructure/california-coastal";
import { CaliforniaHabitatEvidence } from "../src/infrastructure/california-habitat";
import type { ShoreLocation } from "../src/domain/discovery";
import type { WarningEvidence } from "../src/application/warning-provider";
const entrance: ShoreLocation = {
  id: "1",
  name: "Fixture SB",
  coordinates: { latitude: 36.8, longitude: -121.8 },
  sourceUrl: "https://www.parks.ca.gov/",
  parkUrl: null,
  retrievedAt: "2026-11-10T18:00:00Z",
  datasetUpdatedAt: null,
  county: "Monterey",
  type: "beach",
  access: "unknown",
  sourceFeature: {},
};
const plan = {
    date: "2026-11-10",
    species: "barred surfperch",
    method: "shore-angling",
  },
  now = new Date("2026-11-10T18:00:30Z");
const offline = async () => {
  throw Error("offline");
};
const ports = {
  weather: new NwsWeatherProvider(offline),
  atmosphere: new NwsAtmosphereProvider(offline),
  access: new CaliforniaCoastalProvider(offline),
  tides: {
    get: async () => ({
      status: "unavailable",
      transferRelevance: "UNVERIFIED" as const,
      distanceKm: null,
      conditions: null,
      reason: "No reference",
    }),
  },
  regulations: [],
  habitat: new CaliforniaHabitatEvidence(),
};
let detail: Awaited<ReturnType<typeof getLocationDetail>>,
  pointDetail: Awaited<ReturnType<typeof getFishingPoint>>;
beforeAll(async () => {
  detail = await getLocationDetail(
    entrance,
    { ...plan, coordinates: entrance.coordinates, jurisdiction: "US-CA" },
    ports,
  );
  pointDetail = await getFishingPoint(
    {
      date: plan.date,
      species: plan.species,
      coordinates: { latitude: 36.81, longitude: -121.81 },
      environmentConsent: false,
    },
    {
      ...ports,
      shoreline: {
        get: async () => ({ status: "empty", features: [], retrievedAt: null }),
      },
    },
  );
});
const summary = (d = detail) =>
  tripVerification({ entrance, plan, detail: d, now });
it("distinguishes unavailable sources from unknown closures without assuming poor conditions", () => {
  const s = summary();
  expect(s.rows.find((r) => r.id === "access")?.status).toBe("SOURCE FAILURE");
  expect(s.rows.find((r) => r.id === "closures")?.status).toBe("UNKNOWN");
  expect(s.rows.find((r) => r.id === "environment")?.next).toMatch(
    /not unfavorable/,
  );
});
it.each(["restricted", "verified-public"] as const)(
  "published access %s does not establish current closure state",
  (status) => {
    const d = structuredClone(detail);
    d.access.access.status = status;
    const s = summary(d);
    expect(s.rows.find((r) => r.id === "closures")?.status).toBe("UNKNOWN");
    expect(s.eligibility).toBe(
      status === "restricted" ? "EXCLUDED" : "UNVERIFIED",
    );
  },
);
it.each(["old closure notice", "conflicting closure notices"])(
  "cannot promote %s in access metadata into verified closure evidence",
  (name) => {
    const d = structuredClone(detail);
    d.access.access.evidence.status = "available";
    d.access.access.evidence.source.retrievedAt = "2000-01-01T00:00:00Z";
    d.access.access.evidence.records = [
      {
        id: "x",
        name,
        access: "unknown",
        sourceAccessValue: null,
        shoreType: "unknown",
        designation: null,
      },
    ];
    expect(summary(d).rows.find((r) => r.id === "closures")?.status).toBe(
      "UNKNOWN",
    );
  },
);
it("preserves verified prohibitions independently of missing and favorable data", () => {
  const d = structuredClone(detail);
  d.regulations.status = "VERIFIED_PROHIBITED";
  d.access.access.status = "verified-public";
  expect(summary(d).eligibility).toBe("EXCLUDED");
  expect(summary(d).rows.find((r) => r.id === "regulations")?.status).toBe(
    "EXCLUDED",
  );
});
it.each(["species", "date", "method"] as const)(
  "does not reuse a mismatched %s assessment",
  (key) => {
    const d = structuredClone(detail);
    d.activity[key] = "different";
    const s = summary(d);
    expect(s.eligibility).toBe("NOT COMPARABLE");
    expect(s.rows.find((r) => r.id === "identity")?.status).toBe("CONFLICTING");
  },
);
it("does not transfer entrance habitat to an unassessed fishing point", () => {
  const d = structuredClone(detail);
  d.habitat.locationEvidence.status = "supported";
  const s = tripVerification({
    entrance,
    plan,
    detail: d,
    point: pointDetail.point.coordinates,
    now,
  });
  expect(s.rows.find((r) => r.id === "habitat")?.status).toBe("MISSING");
});
it("keeps historical mapped point context separate from present habitat", () => {
  const s = tripVerification({
    entrance,
    plan,
    detail,
    point: pointDetail.point.coordinates,
    pointDetail,
    now,
  });
  expect(s.rows.find((r) => r.id === "habitat")?.status).toBe("UNKNOWN");
  expect(s.rows.find((r) => r.id === "habitat")?.text).toMatch(
    /cannot establish current substrate/,
  );
});
it("rejects a fishing-point species/date/coordinate mismatch", () => {
  const s = tripVerification({
    entrance,
    plan,
    detail,
    point: entrance.coordinates,
    pointDetail,
    now,
  });
  expect(s.rows.find((r) => r.id === "habitat")?.status).toBe("CONFLICTING");
});
const warning: WarningEvidence = {
  status: "empty",
  coordinates: entrance.coordinates,
  sourceUrl: "https://api.weather.gov/alerts/active",
  retrievedAt: "2026-11-10T18:00:00Z",
  updatedAt: null,
  alerts: [],
  reason: "No alerts returned",
};
it.each([
  ["current", "AVAILABLE"],
  ["reused", "HISTORICAL"],
  ["unavailable", "UNKNOWN"],
  ["old", "OUTDATED"],
  ["failure", "UNKNOWN"],
] as const)("separates %s warning evidence", (kind, status) => {
  const w = {
    ...warning,
    ...(kind === "unavailable" ? { status: "unknown" as const } : {}),
    ...(kind === "old" ? { retrievedAt: "2020-01-01T00:00:00Z" } : {}),
  };
  const s = tripVerification({
    entrance,
    plan,
    detail,
    now,
    warnings: w,
    warningHistorical: kind === "reused",
    warningFailed: kind === "failure",
  });
  expect(s.rows.find((r) => r.id === "warnings")?.status).toBe(status);
  expect(s.eligibility).toBe("UNVERIFIED");
});
it("opening sources or providing acknowledgment cannot grant eligibility", () => {
  const input = { entrance, plan, detail, now, acknowledged: true };
  expect(tripVerification(input).eligibility).toBe("UNVERIFIED");
  expect(tripVerification(input).recommendation).toBe("unavailable");
});
it("retains discovery exclusion before and after an incomplete detail assessment", () => {
  const excludedEntrance = { ...entrance, eligibility: "EXCLUDED" as const };
  expect(
    tripVerification({ entrance: excludedEntrance, plan, now }).eligibility,
  ).toBe("EXCLUDED");
  expect(
    tripVerification({ entrance: excludedEntrance, plan, detail, now })
      .eligibility,
  ).toBe("EXCLUDED");
});
import { compareTrips } from "../src/application/compare-trips";
it("keeps an upstream exclusion even when later identity conflicts", () => {
  const d = structuredClone(detail);
  d.location.id = "wrong";
  const s = tripVerification({
    entrance: { ...entrance, eligibility: "EXCLUDED" },
    plan,
    detail: d,
    now,
  });
  expect(s.eligibility).toBe("EXCLUDED");
  expect(s.rows[0].status).toBe("CONFLICTING");
});
it.each(["id", "coordinates"])(
  "rejects changed source %s without inventing a prohibition",
  (field) => {
    const d = structuredClone(detail);
    if (field === "id") d.location.id = "wrong";
    else d.location.coordinates.latitude += 0.001;
    expect(summary(d).eligibility).toBe("NOT COMPARABLE");
  },
);
it("compares independent snapshots and point evidence without transferring either", () => {
  const b = {
    ...entrance,
    id: "2",
    name: "Second fixture",
    coordinates: { latitude: 36.9, longitude: -121.9 },
  };
  const result = compareTrips([
    {
      entrance,
      plan,
      detail,
      point: pointDetail.point.coordinates,
      pointDetail,
      warnings: warning,
      now,
    },
    {
      entrance: b,
      plan,
      warnings: {
        ...warning,
        coordinates: b.coordinates,
        retrievedAt: "2020-01-01T00:00:00Z",
      },
      now,
    },
  ]);
  expect(result[0].evidenceLoaded).toBe(true);
  expect(result[1].evidenceLoaded).toBe(false);
  expect(result[0].summary.rows.find((r) => r.id === "warnings")?.status).toBe(
    "AVAILABLE",
  );
  expect(result[1].summary.rows.find((r) => r.id === "warnings")?.status).toBe(
    "OUTDATED",
  );
  expect(result[1].summary.rows.find((r) => r.id === "habitat")?.text).toMatch(
    /not yet assessed/,
  );
  expect(
    result.every(
      (s) =>
        s.summary.rows.find((r) => r.id === "closures")?.status === "UNKNOWN",
    ),
  ).toBe(true);
  expect(result[0].summary.rows[0].text).toContain(entrance.retrievedAt);
  expect(result[0].summary.rows[0].sources).toContain(entrance.sourceUrl);
});
