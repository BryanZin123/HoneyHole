import { expect, it } from "vitest";
import {
  assessMappedHabitat,
  type MappedFeature,
} from "../src/domain/mapped-habitat";
const point = {
  id: "synthetic",
  kind: "fishing-point" as const,
  coordinates: { latitude: 37.5, longitude: -122.5 },
  accuracyMeters: 2,
};
const geometry = {
  type: "Polygon",
  coordinates: [
    [
      [-122.6, 37.4],
      [-122.4, 37.4],
      [-122.4, 37.6],
      [-122.6, 37.6],
      [-122.6, 37.4],
    ],
  ],
};
const feature: MappedFeature = {
  datasetId: "synthetic",
  featureId: "1",
  pointId: point.id,
  queriedCoordinates: point.coordinates,
  geometry,
  classification: "soft",
  basis: "predicted",
  resolutionMeters: 10,
  positionalAccuracyMeters: null,
  minimumBoundaryDistanceMeters: null,
  observedOn: null,
  validThrough: null,
};
it("never converts a predicted soft polygon into sand or verified habitat", () => {
  const r = assessMappedHabitat(point, "2026-10-29", [feature]);
  expect(r.status).toBe("UNVERIFIED");
  expect(r.features[0].relation).toBe("inside");
  expect(r.features[0].spatialConfidence).toBe("missing");
  expect(r.reasons).toContain(
    "Predicted, mapped or historical context does not establish current sandy surf-zone habitat.",
  );
});
it("does not substitute a park entrance or environmental station for a fishing point", () => {
  for (const kind of [
    "park-entry",
    "environmental-station",
    "unknown",
  ] as const)
    expect(
      assessMappedHabitat({ ...point, kind }, "2026-10-29", [feature]).reasons,
    ).toContain(
      "The selected coordinate is not an independently identified fishing point.",
    );
});
it.each([
  { pointId: "different" },
  { queriedCoordinates: { latitude: 37.500000001, longitude: -122.5 } },
  { featureId: "" },
  { datasetId: "" },
])("rejects mismatched or missing feature identity %j", (change) => {
  expect(
    assessMappedHabitat(point, "2026-10-29", [{ ...feature, ...change }])
      .features[0].relation,
  ).toBe("unverified");
});
it.each([
  [-122.6, 37.5, "boundary"],
  [-122.7, 37.5, "outside"],
  [-122.5, 37.5, "inside"],
])(
  "preserves polygon relation without snapping %s %s",
  (longitude, latitude, relation) => {
    const coordinates = {
      longitude: Number(longitude),
      latitude: Number(latitude),
    };
    expect(
      assessMappedHabitat({ ...point, coordinates }, "2026-10-29", [
        { ...feature, queriedCoordinates: coordinates },
      ]).features[0].relation,
    ).toBe(relation);
  },
);
it("accounts for source resolution and combined uncertainty at polygon edges", () => {
  const f = {
    ...feature,
    positionalAccuracyMeters: 3,
    minimumBoundaryDistanceMeters: 10,
  };
  expect(
    assessMappedHabitat(point, "2026-10-29", [f]).features[0].spatialConfidence,
  ).toBe("ambiguous");
  expect(
    assessMappedHabitat(point, "2026-10-29", [
      { ...f, minimumBoundaryDistanceMeters: 100 },
    ]).features[0].spatialConfidence,
  ).toBe("reliably-inside");
});
it.each([
  { observedOn: null, validThrough: null },
  { observedOn: "1977-01-01", validThrough: "1977-12-31" },
  { observedOn: "2026-11-01", validThrough: "2026-12-01" },
  { observedOn: "bad", validThrough: "2026-12-01" },
])("does not use retrieval as observation freshness %j", (change) => {
  expect(
    assessMappedHabitat(point, "2026-10-29", [{ ...feature, ...change }])
      .features[0].dateApplicable,
  ).toBe(false);
});
it("keeps contradictory source classifications unresolved", () => {
  const r = assessMappedHabitat(point, "2026-10-29", [
    feature,
    { ...feature, featureId: "2", classification: "hard" },
  ]);
  expect(r.conflicting).toBe(true);
  expect(r.status).toBe("UNVERIFIED");
});
it("missing geometry and no features remain unverified", () => {
  expect(
    assessMappedHabitat(point, "2026-10-29", [{ ...feature, geometry: null }])
      .features[0].relation,
  ).toBe("unverified");
  expect(assessMappedHabitat(point, "2026-10-29", []).status).toBe(
    "UNVERIFIED",
  );
});
it("rejects invalid coordinates", () =>
  expect(() =>
    assessMappedHabitat(
      { ...point, coordinates: { latitude: NaN, longitude: 0 } },
      "2026-10-29",
      [],
    ),
  ).toThrow());
