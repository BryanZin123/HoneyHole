import { expect, it } from "vitest";
import {
  assessHabitat,
  type LocationHabitatEvidence,
} from "../src/domain/habitat";
import { barredSurfperchHabitat } from "../src/infrastructure/california-habitat";
const point = { latitude: 37.5, longitude: -122.5 };
const input = {
  locationId: "fixture",
  coordinates: point,
  species: "barred surfperch",
  date: "2026-10-28",
  checkedOn: "2026-10-28",
};
const evidence = (
  patch: Partial<LocationHabitatEvidence> = {},
): LocationHabitatEvidence => ({
  id: "fixture-substrate",
  locationId: "fixture",
  coordinates: point,
  attribute: "substrate",
  value: "sand",
  verification: "verified",
  basis: "field-survey",
  sourceUrl: "https://example.test/survey",
  attribution: "Synthetic survey fixture",
  reviewedOn: "2026-10-28",
  reviewDue: "2026-11-01",
  validFrom: "2026-10-01",
  validThrough: "2026-10-31",
  ...patch,
});
it("documents the association but leaves an entrance without habitat evidence missing", () => {
  const r = assessHabitat(input, barredSurfperchHabitat, []);
  expect(r.association.status).toBe("documented");
  expect(r.locationEvidence.status).toBe("missing");
  expect(r.status).toBe("unknown");
  expect(r.speciesPresence).toBe("not-assessed");
});
it("requires reviewed point-matched sand AND surf-zone evidence, without predicting catches", () => {
  const records = [
    evidence(),
    evidence({ id: "zone", attribute: "zone", value: "surf-zone" }),
  ];
  expect(
    assessHabitat(input, barredSurfperchHabitat, records).locationEvidence
      .status,
  ).toBe("supported");
  expect(
    assessHabitat(input, barredSurfperchHabitat, records.slice(0, 1))
      .locationEvidence.status,
  ).toBe("missing");
});
it("incompatible means mismatch with this association, not absence of the species", () => {
  const r = assessHabitat(input, barredSurfperchHabitat, [
    evidence({ value: "rock" }),
  ]);
  expect(r.locationEvidence.status).toBe("incompatible");
  expect(r.speciesPresence).toBe("not-assessed");
});
it.each([
  { basis: "park-entry" as const },
  { verification: "unverified" as const },
  { locationId: "different" },
  { coordinates: { ...point, latitude: 37.5000000001 } },
  { reviewDue: "2026-10-27" },
  { reviewedOn: "2026-10-29" },
  { validThrough: "2026-10-27" },
  { validFrom: "invalid" },
  { sourceUrl: "http://example.test" },
  { attribution: "" },
])(
  "does not promote unsupported/stale/location-mismatched evidence %j",
  (patch) => {
    expect(
      assessHabitat(input, barredSurfperchHabitat, [evidence(patch)])
        .locationEvidence.attributes[0].status,
    ).toBe("missing");
  },
);
it("keeps conflicting substrate records unresolved", () => {
  const r = assessHabitat(input, barredSurfperchHabitat, [
    evidence(),
    evidence({ id: "conflict", value: "rock" }),
  ]);
  expect(r.locationEvidence.status).toBe("missing");
  expect(r.locationEvidence.attributes[0].reason).toMatch(/conflicting/);
});
it.each(["redtail surfperch", "surfperch", "", "Amphistichus rhodoterus"])(
  "does not reuse barred evidence for %s",
  (species) => {
    expect(
      assessHabitat({ ...input, species }, barredSurfperchHabitat, [])
        .association.status,
    ).toBe("not-reviewed");
  },
);
it("accepts the exact scientific name and preserves source review/publication distinction", () => {
  const r = assessHabitat(
    { ...input, species: "Amphistichus argenteus" },
    barredSurfperchHabitat,
    [],
  );
  expect(r.association.status).toBe("documented");
  expect(
    r.association.profile?.sources.some(
      (s) => s.published === null && s.reviewedOn === "2026-10-28",
    ),
  ).toBe(true);
});
