import { describe, it, expect, vi } from "vitest";
import { NoaaMarineProvider } from "../src/infrastructure/noaa";
import { californiaCoast } from "../src/config/regions";
import { getMarineConditions } from "../src/application/get-marine-conditions";
const now = () => new Date("2026-10-18T18:00:00Z");
const metadata = {
  stations: [
    {
      id: "9414290",
      name: "San Francisco",
      lat: 37.8063,
      lng: -122.4659,
      state: "CA",
    },
  ],
};
const temperature = {
  data: [{ t: "2026-10-18 17:54", v: "15.2", f: "0,0,0" }],
};
const tides = {
  predictions: [
    { t: "2026-10-18 19:00", v: "1.2", type: "H" },
    { t: "2026-10-19 01:00", v: "0.2", type: "L" },
  ],
};
function fixture(
  temp: unknown = temperature,
  pred: unknown = tides,
  meta: unknown = metadata,
) {
  const calls: string[] = [];
  const transport = vi.fn(async (url: Parameters<typeof fetch>[0]) => {
    calls.push(String(url));
    return new Response(
      JSON.stringify(
        String(url).includes("mdapi")
          ? meta
          : String(url).includes("water_temperature")
            ? temp
            : pred,
      ),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  });
  return {
    provider: new NoaaMarineProvider(transport as typeof fetch, now),
    calls,
  };
}
describe("NOAA adapter contracts (isolated fixtures, not live evidence)", () => {
  it("normalizes observations and predictions with source, units, station and UTC", async () => {
    const { provider, calls } = fixture();
    const result = await provider.getConditions("9414290");
    expect(result.station.state).toBe("CA");
    expect(result.waterTemperature.status).toBe("available");
    expect(result.waterTemperature.measurements[0]).toMatchObject({
      value: 15.2,
      unit: "°C",
      validAt: "2026-10-18T17:54:00.000Z",
      kind: "observation",
    });
    expect(result.tides.measurements[0]).toMatchObject({
      value: 1.2,
      datum: "MLLW",
      kind: "prediction",
    });
    expect(calls.find((x) => x.includes("predictions"))).toContain(
      "time_zone=gmt",
    );
    expect(result.waterTemperature.sourceUrl).toContain(
      "api.tidesandcurrents.noaa.gov",
    );
  });
  it.each(["", "NaN", "Infinity", "15 fish"])(
    "rejects invalid temperature %s instead of coercing to zero",
    async (v) => {
      const { provider } = fixture({ data: [{ ...temperature.data[0], v }] });
      expect(
        (await provider.getConditions("9414290")).waterTemperature.status,
      ).toBe("unavailable");
    },
  );
  it("rejects flagged data", async () =>
    expect(
      (
        await fixture({
          data: [{ ...temperature.data[0], f: "0,1,0" }],
        }).provider.getConditions("9414290")
      ).waterTemperature.status,
    ).toBe("unavailable"));
  it("marks old observations stale", async () =>
    expect(
      (
        await fixture({
          data: [{ ...temperature.data[0], t: "2026-10-18 16:00" }],
        }).provider.getConditions("9414290")
      ).waterTemperature.status,
    ).toBe("stale"));
  it.each(["2026-02-30 17:54", "2026-10-18 19:00", "not-a-time"])(
    "rejects invalid/future observation %s",
    async (t) =>
      expect(
        (
          await fixture({
            data: [{ ...temperature.data[0], t }],
          }).provider.getConditions("9414290")
        ).waterTemperature.status,
      ).toBe("unavailable"),
  );
  it("isolates missing water temperature from available tides", async () => {
    const r = await fixture({
      error: { message: "No data" },
    }).provider.getConditions("9414290");
    expect(r.waterTemperature.status).toBe("unavailable");
    expect(r.tides.status).toBe("available");
  });
  it("does not accept empty predictions", async () =>
    expect(
      (
        await fixture(temperature, { predictions: [] }).provider.getConditions(
          "9414290",
        )
      ).tides.status,
    ).toBe("unavailable"));
  it("rejects a station outside the active region in the application service", async () => {
    const { provider } = fixture(temperature, tides, {
      stations: [{ ...metadata.stations[0], state: "OR" }],
    });
    await expect(
      getMarineConditions("9414290", provider, californiaCoast),
    ).rejects.toThrow(/region/);
  });
  it("rejects a mismatched station", async () =>
    await expect(
      fixture(temperature, tides, {
        stations: [{ ...metadata.stations[0], id: "1234567" }],
      }).provider.getConditions("9414290"),
    ).rejects.toThrow());
  it("rejects malformed coordinates", async () =>
    await expect(
      fixture(temperature, tides, {
        stations: [{ ...metadata.stations[0], lat: 999 }],
      }).provider.getConditions("9414290"),
    ).rejects.toThrow());
  it("reports metadata transport failure", async () => {
    const fetcher = vi.fn(async () => new Response("", { status: 503 }));
    await expect(
      new NoaaMarineProvider(fetcher, now).getConditions("9414290"),
    ).rejects.toThrow();
  });
  it("rejects malicious station input before transport", async () => {
    const { provider, calls } = fixture();
    await expect(
      getMarineConditions("../secret", provider, californiaCoast),
    ).rejects.toThrow(/seven-digit/);
    expect(calls).toHaveLength(0);
  });
});
