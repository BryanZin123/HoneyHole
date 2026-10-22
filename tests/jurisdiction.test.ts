import { expect, it } from "vitest";
import {
  resolveJurisdiction,
  type JurisdictionEvidence,
} from "../src/application/resolve-jurisdiction";
const point = { latitude: 37, longitude: -122 };
const evidence = (
  patch: Partial<JurisdictionEvidence> = {},
): JurisdictionEvidence => ({
  id: "fixture-ocean",
  label: "Fixture ocean",
  kind: "water",
  authority: "legal",
  sourceUrl: "https://example.test/legal",
  attribution: "Fixture authority",
  retrievedAt: "2026-10-21T12:00:00Z",
  verifiedOn: "2026-10-21",
  reviewDue: "2026-10-28",
  effectiveFrom: "2026-01-01",
  effectiveThrough: "2026-12-31",
  precisionMeters: 0,
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [-123, 36],
        [-121, 36],
        [-121, 38],
        [-123, 38],
        [-123, 36],
      ],
    ],
  },
  ...patch,
});
const resolve = (
  records: JurisdictionEvidence[],
  p = point,
  date = "2026-10-21",
) =>
  resolveJurisdiction(p, date, "2026-10-21", {
    getEvidence: async () => records,
  });
it("resolves reviewed interior legal geometry into a regulatory scope", async () => {
  expect((await resolve([evidence()])).scopes.map((s) => s.id)).toEqual([
    "fixture-ocean",
  ]);
});
it.each([-123, -121, -120])(
  "does not resolve boundary/outside longitude %s",
  async (longitude) => {
    expect(
      (await resolve([evidence()], { ...point, longitude })).scopes,
    ).toEqual([]);
  },
);
it("does not confuse ocean and bay or resolve conflicting water classifications", async () => {
  const result = await resolve([
    evidence(),
    evidence({ id: "fixture-bay", label: "Fixture bay" }),
  ]);
  expect(result.dimensions.water.status).toBe("UNVERIFIED");
  expect(result.scopes).toEqual([]);
});
it("allows overlapping legal MPA restrictions without treating them as mutually exclusive water classifications", async () => {
  expect(
    (
      await resolve([
        evidence({ id: "mpa-a", kind: "mpa" }),
        evidence({ id: "mpa-b", kind: "mpa" }),
      ])
    ).scopes,
  ).toHaveLength(2);
});
it.each([
  { authority: "advisory" as const },
  { precisionMeters: null },
  { precisionMeters: 10 },
  { reviewDue: "2026-10-20" },
  { verifiedOn: "2026-10-22" },
  { effectiveFrom: null },
  { effectiveThrough: "2026-10-20" },
  { sourceUrl: "http://example.test" },
])("does not promote incomplete/stale evidence %j", async (patch) => {
  expect((await resolve([evidence(patch)])).scopes).toEqual([]);
});
it.each(["2025-12-31", "2027-01-01"])(
  "rejects outside effective dates %s",
  async (date) => {
    expect((await resolve([evidence()], point, date)).scopes).toEqual([]);
  },
);
it.each(["2026-01-01", "2026-12-31"])(
  "includes effective boundary %s",
  async (date) => {
    expect((await resolve([evidence()], point, date)).scopes).toHaveLength(1);
  },
);
it("keeps missing data and provider failures unverified", async () => {
  expect((await resolve([])).dimensions.state.status).toBe("UNVERIFIED");
  expect(
    (
      await resolveJurisdiction(point, "2026-10-21", "2026-10-21", {
        getEvidence: async () => {
          throw Error("offline");
        },
      })
    ).providerStatus,
  ).toBe("unavailable");
});
it("rejects invalid coordinates without normalization", async () => {
  await expect(
    resolve([], { latitude: NaN, longitude: -122 }),
  ).rejects.toThrow();
});
