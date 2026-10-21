import { expect, it } from "vitest";
import { CaliforniaRegulationProvider } from "../src/infrastructure/california-effective-rules";
import { getRegulatoryAssessment } from "../src/application/get-regulatory-assessment";
const context = {
  activity: {
    species: "California grunion",
    method: "shore-angling",
    date: "2026-06-30",
    jurisdiction: "US-CA",
    coordinates: { latitude: 34, longitude: -119 },
  },
  scopes: [
    {
      id: "US-CA",
      authority: "legal" as const,
      sourceUrl: "https://www.parks.ca.gov/",
    },
  ],
  checkedOn: "2026-10-21",
};
it("evaluates reviewed California grunion closure and preserves legal effective date", async () => {
  const r = await getRegulatoryAssessment(
    context,
    new CaliforniaRegulationProvider(),
  );
  expect(r.status).toBe("VERIFIED_PROHIBITED");
  expect(r.findings[0].rule.effectiveFrom).toBe("2022-06-01");
  expect(r.findings[0].rule.effectiveTo).toBeNull();
  expect(r.missing).toContain("emergency");
});
it("outside the grunion closure returns limits but never full clearance", async () => {
  const r = await getRegulatoryAssessment(
    { ...context, activity: { ...context.activity, date: "2026-07-01" } },
    new CaliforniaRegulationProvider(),
  );
  expect(r.status).toBe("UNVERIFIED");
  expect(r.findings.filter((f) => f.restriction.kind === "limit")).toHaveLength(
    2,
  );
});
it("does not extrapolate snapshot coverage into future dates or other species", async () => {
  for (const patch of [{ date: "2027-04-01" }, { species: "Surfperch" }])
    expect(
      (
        await getRegulatoryAssessment(
          { ...context, activity: { ...context.activity, ...patch } },
          new CaliforniaRegulationProvider(),
        )
      ).status,
    ).toBe("UNVERIFIED");
});
