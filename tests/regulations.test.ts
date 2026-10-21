import { expect, it } from "vitest";
import {
  evaluateRegulations,
  regulatoryQuestions,
  type FishingActivity,
  type RegulatoryEvidence,
} from "../src/domain/regulations";
const activity: FishingActivity = {
  species: "fixture",
  method: "shore-angling",
  date: "2026-10-21",
  coordinates: { latitude: 37, longitude: -122 },
  jurisdiction: "US-CA",
};
const all = (): RegulatoryEvidence[] =>
  regulatoryQuestions.map((question) => ({
    question,
    status: "VERIFIED_PERMITTED",
    activity,
    effectiveFrom: "2026-01-01",
    effectiveTo: "2026-12-31",
    sourceUrl: "https://example.test/fixture",
  }));
it("never grants permission from missing or partial evidence", () => {
  expect(evaluateRegulations(activity, [])).toBe("UNVERIFIED");
  expect(evaluateRegulations(activity, all().slice(1))).toBe("UNVERIFIED");
});
it("requires exact scope and effective dates for every question", () => {
  const e = all();
  expect(evaluateRegulations(activity, e)).toBe("VERIFIED_PERMITTED");
  e[0].effectiveFrom = null;
  expect(evaluateRegulations(activity, e)).toBe("UNVERIFIED");
  expect(evaluateRegulations({ ...activity, species: "other" }, all())).toBe(
    "UNVERIFIED",
  );
});
it("prohibition wins over otherwise permitted evidence", () => {
  const e = all();
  e[0].status = "VERIFIED_PROHIBITED";
  expect(evaluateRegulations(activity, e)).toBe("VERIFIED_PROHIBITED");
});
it("preserves explicit conditions without advertising permission", () => {
  const e = all();
  e[0].status = "CONDITIONAL";
  expect(evaluateRegulations(activity, e)).toBe("CONDITIONAL");
});
