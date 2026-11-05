import { expect, it } from "vitest";
import { californiaDayWindow } from "../src/domain/california-day";
import { planningStatus } from "../src/domain/planning-summary";
it.each([
  ["2026-03-08", 23, "2026-03-08T08:00:00.000Z"],
  ["2026-11-01", 25, "2026-11-01T07:00:00.000Z"],
  ["2026-07-01", 24, "2026-07-01T07:00:00.000Z"],
] as const)("uses California civil day %s", (date, hours, start) => {
  const w = californiaDayWindow(date);
  expect(w.start).toBe(start);
  expect((Date.parse(w.end) - Date.parse(w.start)) / 3600000).toBe(hours);
});
it("rejects invalid dates", () =>
  expect(() => californiaDayWindow("2026-02-30")).toThrow());
it("prohibition precedes every evidence state", () =>
  expect(planningStatus(true, true, true)).toBe("EXCLUDED"));
it("missing evidence is not unfavorable conditions", () =>
  expect(planningStatus(false, false, false)).toBe("INSUFFICIENT INFORMATION"));
it("available conditions are not suitability", () =>
  expect(planningStatus(false, true, false)).toBe("CONDITIONS AVAILABLE"));
it("complete reviewed evidence only permits further review", () =>
  expect(planningStatus(false, true, true)).toBe("FURTHER REVIEW POSSIBLE"));

import { inShorelinePilot } from "../src/domain/shoreline-context";
it("includes the synthetic Monterey point but keeps pilot boundaries bounded", () => {
  expect(inShorelinePilot({ latitude: 36.8, longitude: -121.85 })).toBe(true);
  expect(inShorelinePilot({ latitude: 36.65, longitude: -122.05 })).toBe(true);
  expect(inShorelinePilot({ latitude: 36.64999, longitude: -122.05 })).toBe(
    false,
  );
  expect(inShorelinePilot({ latitude: 36.95, longitude: -121.74999 })).toBe(
    false,
  );
});
