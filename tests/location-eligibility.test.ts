import { expect, it } from "vitest";
import { assessLocationEligibility } from "../src/domain/location-eligibility";
it.each(["verified-public", "unknown"] as const)(
  "does not clear %s access with incomplete regulations",
  (access) => {
    expect(assessLocationEligibility(access, "UNVERIFIED").eligibility).toBe(
      "UNVERIFIED",
    );
  },
);
it("excludes restricted access independently of fishing permission", () => {
  expect(
    assessLocationEligibility("restricted", "VERIFIED_PERMITTED"),
  ).toMatchObject({
    eligibility: "EXCLUDED",
    reasons: ["ACCESS_RESTRICTED"],
    alertEligible: false,
  });
});
it("excludes a verified prohibition even with unknown access", () => {
  expect(
    assessLocationEligibility("unknown", "VERIFIED_PROHIBITED").reasons,
  ).toContain("REGULATORY_PROHIBITION");
  expect(
    assessLocationEligibility("unknown", "VERIFIED_PROHIBITED").eligibility,
  ).toBe("EXCLUDED");
});
it("retains both independent exclusions", () => {
  expect(
    assessLocationEligibility("restricted", "VERIFIED_PROHIBITED").reasons,
  ).toEqual(["ACCESS_RESTRICTED", "REGULATORY_PROHIBITION"]);
});
it.each(["VERIFIED_PERMITTED", "CONDITIONAL"] as const)(
  "does not turn %s into a recommendation or alert",
  (regulations) => {
    expect(
      assessLocationEligibility("verified-public", regulations),
    ).toMatchObject({ eligibility: "UNVERIFIED", alertEligible: false });
  },
);
