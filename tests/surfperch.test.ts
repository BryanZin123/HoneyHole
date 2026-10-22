import { expect, it } from "vitest";
import { californiaSurfperchRules } from "../src/infrastructure/california-surfperch";
import {
  assessRegulations,
  type RegulatoryContext,
} from "../src/domain/effective-regulations";
const context: RegulatoryContext = {
  activity: {
    species: "redtail surfperch",
    method: "shore-angling",
    date: "2026-10-21",
    jurisdiction: "US-CA",
    coordinates: { latitude: 37, longitude: -122 },
  },
  checkedOn: "2026-10-21",
  scopes: [
    {
      id: "CA-ocean-bay",
      authority: "legal",
      sourceUrl: "https://example.test",
    },
    {
      id: "CA-SF-SanPablo-bays",
      authority: "legal",
      sourceUrl: "https://example.test",
    },
  ],
};
it("keeps researched redtail cases unverified until legal dates and geography are established", () => {
  const r = assessRegulations(context, californiaSurfperchRules);
  expect(r.status).toBe("UNVERIFIED");
  expect(r.findings.length).toBeGreaterThan(0);
  expect(r.findings.every((f) => f.status === "UNVERIFIED")).toBe(true);
  expect(
    r.findings.find((f) => f.rule.question === "size")?.restriction,
  ).toEqual({
    kind: "minimum-size",
    minimum: 10.5,
    unit: "inches",
    measurement: "total-length",
  });
});
it.each(["barred surfperch", "shiner surfperch", "surfperch"])(
  "does not apply redtail size to %s",
  (species) => {
    const r = assessRegulations(
      { ...context, activity: { ...context.activity, species } },
      californiaSurfperchRules,
    );
    expect(r.findings.some((f) => f.rule.question === "size")).toBe(false);
  },
);
it("does not apply the selected shore-angling cases to hand-gathering", () => {
  expect(
    assessRegulations(
      {
        ...context,
        activity: { ...context.activity, method: "hand-gathering" },
      },
      californiaSurfperchRules,
    ).findings,
  ).toEqual([]);
});
it("does not establish bay restrictions from an ocean scope", () => {
  const r = assessRegulations(
    { ...context, scopes: context.scopes.slice(0, 1) },
    californiaSurfperchRules,
  );
  expect(r.findings.find((f) => f.rule.question === "season")?.reason).toMatch(
    /geographic/,
  );
});

it("models one shared aggregate limit excluding shiner, not separate per-species allowances", () => {
  const limits = californiaSurfperchRules.filter(
    (r) => r.question === "bag" || r.question === "possession",
  );
  expect(limits).toHaveLength(2);
  for (const rule of limits) {
    expect(rule.restriction).toEqual({
      kind: "aggregate-limit",
      maximum: 5,
      unit: "fish",
      group: "Embiotocidae",
      excludedSpecies: ["Cymatogaster aggregata"],
    });
    expect(rule.verification).toBe("unverified");
  }
});
