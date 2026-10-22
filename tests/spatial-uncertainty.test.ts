import { expect, it } from "vitest";
import { classifySpatialUncertainty } from "../src/domain/spatial-uncertainty";
const evidence = {
  relation: "inside" as const,
  minimumBoundaryDistanceMeters: 100,
  locationAccuracyMeters: 5,
  sourceAccuracyMeters: 10,
  boundaryUncertaintyMeters: 20,
};
it("uses the sum of independent worst-case errors, never rounding into certainty", () => {
  expect(classifySpatialUncertainty(evidence)).toBe("reliably-inside");
  expect(classifySpatialUncertainty({ ...evidence, relation: "outside" })).toBe(
    "reliably-outside",
  );
  expect(
    classifySpatialUncertainty({
      ...evidence,
      minimumBoundaryDistanceMeters: 35,
    }),
  ).toBe("ambiguous");
  expect(
    classifySpatialUncertainty({
      ...evidence,
      minimumBoundaryDistanceMeters: 34.9999999,
    }),
  ).toBe("ambiguous");
  expect(
    classifySpatialUncertainty({ ...evidence, relation: "boundary" }),
  ).toBe("ambiguous");
});
it.each([null, undefined, -1, NaN, Infinity])(
  "rejects missing or invalid uncertainty %s",
  (value) => {
    expect(
      classifySpatialUncertainty({ ...evidence, sourceAccuracyMeters: value }),
    ).toBe("missing");
  },
);
it("requires a documented positive clearance even for claimed zero errors", () => {
  expect(
    classifySpatialUncertainty({
      ...evidence,
      minimumBoundaryDistanceMeters: 0,
      locationAccuracyMeters: 0,
      sourceAccuracyMeters: 0,
      boundaryUncertaintyMeters: 0,
    }),
  ).toBe("ambiguous");
});
