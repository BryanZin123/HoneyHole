import { expect, it } from "vitest";
import {
  assessRegulations,
  type EffectiveRule,
  type RegulatoryContext,
} from "../src/domain/effective-regulations";
import { getRegulatoryAssessment } from "../src/application/get-regulatory-assessment";
const context: RegulatoryContext = {
  activity: {
    species: "fixture fish",
    method: "shore-angling",
    date: "2026-06-01",
    jurisdiction: "US-CA",
    coordinates: { latitude: 37, longitude: -122 },
  },
  scopes: [
    {
      id: "CA-ocean",
      authority: "legal",
      sourceUrl: "https://example.test/boundary",
    },
  ],
  checkedOn: "2026-10-20",
};
const rule = (patch: Partial<EffectiveRule> = {}): EffectiveRule => ({
  id: "fixture-season",
  authority: "Fixture authority",
  sourceUrl: "https://example.test/rule",
  species: ["fixture fish"],
  jurisdiction: "US-CA",
  scopeId: "CA-ocean",
  methods: ["shore-angling"],
  effectiveFrom: "2026-01-01",
  effectiveTo: null,
  expirationKnown: true,
  verifiedOn: "2026-10-20",
  reviewDue: "2026-10-27",
  coverageFrom: "2026-01-01",
  coverageThrough: "2026-10-20",
  verification: "verified",
  exceptions: [],
  question: "season",
  restriction: { kind: "closed-season", from: "04-01", through: "06-30" },
  summary: "Fixture closure",
  ...patch,
});
it.each([
  ["2026-03-31", "UNVERIFIED"],
  ["2026-04-01", "VERIFIED_PROHIBITED"],
  ["2026-06-30", "VERIFIED_PROHIBITED"],
  ["2026-07-01", "UNVERIFIED"],
])("season boundary %s", (date, status) => {
  const r = assessRegulations(
    { ...context, activity: { ...context.activity, date } },
    [rule()],
  );
  expect(r.status).toBe(status);
  expect(r.findings[0].status).toBe(
    status === "UNVERIFIED" ? "VERIFIED_PERMITTED" : status,
  );
});
it.each([
  { effectiveFrom: null },
  { expirationKnown: false },
  { verification: "unverified" as const },
  { reviewDue: "2026-10-19" },
  { coverageThrough: "2026-05-31" },
  { effectiveTo: "2026-05-31" },
])("rejects unknown, stale or out-of-period evidence %j", (patch) =>
  expect(assessRegulations(context, [rule(patch)]).status).toBe("UNVERIFIED"),
);
it("rejects unknown species and different jurisdiction", () => {
  for (const patch of [
    { species: "" },
    { species: "other" },
    { jurisdiction: "US-OR" },
  ])
    expect(
      assessRegulations(
        { ...context, activity: { ...context.activity, ...patch } },
        [rule()],
      ).status,
    ).toBe("UNVERIFIED");
});
it("does not treat advisory boundaries as legal scope", () =>
  expect(
    assessRegulations(
      { ...context, scopes: [{ ...context.scopes[0], authority: "advisory" }] },
      [rule()],
    ).status,
  ).toBe("UNVERIFIED"));
it("location-specific rule does not apply outside matched scope", () =>
  expect(
    assessRegulations(context, [rule({ scopeId: "other-location" })]).status,
  ).toBe("UNVERIFIED"));
it("keeps species-specific limits and missing checks separate", () => {
  const r = assessRegulations(context, [
    rule({
      question: "bag",
      restriction: { kind: "limit", maximum: 30, unit: "fish" },
    }),
  ]);
  expect(r.status).toBe("UNVERIFIED");
  expect(r.findings[0].status).toBe("CONDITIONAL");
  expect(r.findings[0].restriction).toEqual({
    kind: "limit",
    maximum: 30,
    unit: "fish",
  });
  expect(r.missing).toContain("mpa");
});
it("independent prohibitions override partial conditions", () =>
  expect(
    assessRegulations(context, [
      rule(),
      rule({
        id: "limit",
        question: "bag",
        restriction: { kind: "limit", maximum: 30, unit: "fish" },
      }),
    ]).status,
  ).toBe("VERIFIED_PROHIBITED"));
it("contradictory evidence for the same question is unresolved", () => {
  const r = assessRegulations(context, [
    rule(),
    rule({ id: "contradiction", restriction: { kind: "clearance" } }),
  ]);
  expect(r.status).toBe("UNVERIFIED");
  expect(r.conflicts).toContain("season");
});
it("requires complete evidence before permitted or conditional status", () => {
  const questions = [
    "species",
    "method",
    "season",
    "size",
    "bag",
    "possession",
    "mpa",
    "emergency",
    "localRules",
    "license",
  ] as const;
  const all = questions.map((q) =>
    rule({ id: q, question: q, restriction: { kind: "clearance" } }),
  );
  expect(assessRegulations(context, all).status).toBe("VERIFIED_PERMITTED");
  all[4] = rule({
    id: "bag",
    question: "bag",
    restriction: { kind: "limit", maximum: 2, unit: "fish" },
  });
  expect(assessRegulations(context, all).status).toBe("CONDITIONAL");
});
it("fails closed when provider throws", async () => {
  const r = await getRegulatoryAssessment(context, {
    getRules: async () => {
      throw Error("offline");
    },
  });
  expect(r.status).toBe("UNVERIFIED");
  expect(r.reason).toMatch(/unavailable/);
});
it("rejects malformed dates and invalid coordinates", () => {
  for (const activity of [
    { ...context.activity, date: "2026-02-30" },
    { ...context.activity, coordinates: { latitude: 91, longitude: 0 } },
  ])
    expect(assessRegulations({ ...context, activity }, [rule()]).status).toBe(
      "UNVERIFIED",
    );
});
