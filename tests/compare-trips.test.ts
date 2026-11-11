import { expect, it } from "vitest";
import { compareTrips } from "../src/application/compare-trips";
const area = (id: string) => ({
  entrance: {
    id,
    name: "Fixture " + id,
    coordinates: { latitude: 36.8 + Number(id) / 100, longitude: -121.8 },
    sourceUrl: "https://www.parks.ca.gov/",
    parkUrl: null,
    retrievedAt: "2026-11-11T18:00:00Z",
    datasetUpdatedAt: null,
  },
  plan: {
    species: "barred surfperch",
    date: "2026-11-11",
    method: "shore-angling",
    period: "morning",
  },
});
it("requires exactly two distinct entrances and a shared plan", () => {
  expect(() => compareTrips([area("1")])).toThrow();
  expect(() => compareTrips([area("1"), area("1")])).toThrow();
  expect(compareTrips([area("1"), area("2")]).length).toBe(2);
});
it.each(["species", "date", "method", "period"] as const)(
  "rejects different %s",
  (key) => {
    const b = area("2");
    b.plan[key] = "different";
    expect(() => compareTrips([area("1"), b])).toThrow();
  },
);
