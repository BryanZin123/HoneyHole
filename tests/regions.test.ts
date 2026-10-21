import { describe, it, expect, vi } from "vitest";
import type { MarineConditions } from "../src/domain/marine";
import { getMarineConditions } from "../src/application/get-marine-conditions";
const california = {
  id: "US-CA-coast",
  countryCode: "US",
  stateCode: "CA",
  timeZone: "America/Los_Angeles",
  modes: ["shore"],
};
const oregon = { ...california, id: "US-OR-coast", stateCode: "OR" };
function provider(state: string) {
  return {
    getConditions: vi.fn(async (): Promise<MarineConditions> => ({
      station: {
        id: "station-a",
        name: "Test station",
        latitude: 40,
        longitude: -124,
        countryCode: "US",
        state,
      },
      waterTemperature: {
        status: "unavailable",
        measurements: [],
        sourceUrl: "https://example.test",
        retrievedAt: "2026-10-18T18:00:00Z",
      },
      tides: {
        status: "unavailable",
        measurements: [],
        sourceUrl: "https://example.test",
        retrievedAt: "2026-10-18T18:00:00Z",
      },
    })),
  };
}
describe("regional policy is independent of station provider", () => {
  it("accepts opaque provider station identifiers without NOAA-specific core rules", async () => {
    await expect(
      getMarineConditions("station-a", provider("CA"), california),
    ).resolves.toMatchObject({
      station: { state: "CA" },
      region: { id: "US-CA-coast" },
    });
  });
  it("rejects a station outside the configured deployment region", async () => {
    await expect(
      getMarineConditions("9414290", provider("OR"), california),
    ).rejects.toThrow(/region/);
  });
  it("supports a future state through configuration without changing business logic", async () => {
    await expect(
      getMarineConditions("station-a", provider("OR"), oregon),
    ).resolves.toMatchObject({ station: { state: "OR" } });
  });
  it("does not call a provider with an empty identifier", async () => {
    const p = provider("CA");
    await expect(getMarineConditions("", p, california)).rejects.toThrow();
    expect(p.getConditions).not.toHaveBeenCalled();
  });
});
