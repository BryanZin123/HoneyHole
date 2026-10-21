import { describe, expect, it } from "vitest";
import { assessReadiness, type ReadinessInput } from "../src/domain/readiness";
const complete: ReadinessInput = {
  weather: "available",
  tides: "available",
  waterTemperature: "available",
  access: "verified",
  regulations: "verified",
};
describe("assessment readiness — missing information is not permission or a recommendation", () => {
  it.each(["weather", "tides", "waterTemperature"] as const)(
    "withholds readiness when %s is missing",
    (key) => {
      const result = assessReadiness({ ...complete, [key]: "missing" });
      expect(result.status).toBe("incomplete");
      expect(result.reasons.length).toBeGreaterThan(0);
    },
  );
  it("rejects stale conditions", () =>
    expect(assessReadiness({ ...complete, weather: "stale" }).status).toBe(
      "incomplete",
    ));
  it.each(["access", "regulations"] as const)(
    "does not treat unknown %s as verified",
    (key) =>
      expect(assessReadiness({ ...complete, [key]: "unknown" }).status).toBe(
        "incomplete",
      ),
  );
  it("hard-excludes closed access even with missing weather", () =>
    expect(
      assessReadiness({ ...complete, access: "closed", weather: "missing" })
        .status,
    ).toBe("blocked"));
  it("hard-excludes known restrictions", () =>
    expect(
      assessReadiness({ ...complete, regulations: "restricted" }).status,
    ).toBe("blocked"));
  it("allows analysis of complete inputs without claiming fishing suitability", () =>
    expect(assessReadiness(complete)).toEqual({
      status: "ready-for-analysis",
      reasons: [],
    }));
});
