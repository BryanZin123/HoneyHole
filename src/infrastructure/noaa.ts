import type { MarineProvider } from "../application/get-marine-conditions";
import type {
  MarineConditions,
  Measurement,
  ProductResult,
  Station,
} from "../domain/marine";
type RecordValue = Record<string, unknown>;
function record(value: unknown): RecordValue {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid provider response.");
  return value as RecordValue;
}
function numeric(value: unknown): number {
  if (
    typeof value !== "number" &&
    (typeof value !== "string" ||
      !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim()))
  )
    throw new Error("Invalid measurement.");
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error("Invalid measurement.");
  return parsed;
}
function timestamp(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(value)
  )
    throw new Error("Invalid timestamp.");
  const iso = value.replace(" ", "T") + ":00.000Z";
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== iso)
    throw new Error("Invalid timestamp.");
  return iso;
}
export class NoaaMarineProvider implements MarineProvider {
  constructor(
    private fetcher: typeof fetch = fetch,
    private now: () => Date = () => new Date(),
    private freshnessMs = 30 * 60 * 1000,
  ) {
    if (!Number.isFinite(freshnessMs) || freshnessMs <= 0)
      throw new Error("Freshness must be positive.");
  }
  private async request(url: string): Promise<RecordValue> {
    const response = await this.fetcher(url, {
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error("NOAA request failed.");
    return record(await response.json());
  }
  async getConditions(stationId: string): Promise<MarineConditions> {
    if (!/^\d{7}$/.test(stationId))
      throw new Error("Enter a seven-digit NOAA station ID.");
    const now = this.now();
    const retrievedAt = now.toISOString();
    const metadata = await this.request(
      `https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations/${stationId}.json`,
    );
    if (!Array.isArray(metadata.stations) || metadata.stations.length !== 1)
      throw new Error("Station metadata unavailable.");
    const row = record(metadata.stations[0]);
    if (typeof row.state !== "string" || !/^[A-Z]{2}$/.test(row.state))
      throw new Error("Invalid station state metadata.");
    if (
      row.id !== stationId ||
      typeof row.name !== "string" ||
      !row.name.trim()
    )
      throw new Error("Invalid station metadata.");
    const latitude = numeric(row.lat),
      longitude = numeric(row.lng);
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180)
      throw new Error("Invalid station coordinates.");
    const station: Station = {
      id: stationId,
      name: row.name,
      latitude,
      longitude,
      state: row.state,
      countryCode: "US",
    };
    const url = (product: string) => {
      const u = new URL(
        "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter",
      );
      u.search = new URLSearchParams({
        station: stationId,
        product,
        units: "metric",
        time_zone: "gmt",
        format: "json",
        application: "HoneyHole",
      }).toString();
      return u;
    };
    const tempUrl = url("water_temperature");
    tempUrl.searchParams.set("date", "latest");
    const tideUrl = url("predictions");
    tideUrl.searchParams.set(
      "begin_date",
      retrievedAt.slice(0, 16).replace("T", " "),
    );
    tideUrl.searchParams.set("range", "24");
    tideUrl.searchParams.set("interval", "hilo");
    tideUrl.searchParams.set("datum", "MLLW");
    const product = async (
      sourceUrl: string,
      kind: "observation" | "prediction",
    ): Promise<ProductResult> => {
      const base = { sourceUrl, retrievedAt };
      try {
        const body = await this.request(sourceUrl);
        if (body.error) throw new Error("Provider has no usable data.");
        const rows = kind === "observation" ? body.data : body.predictions;
        if (!Array.isArray(rows) || !rows.length) throw new Error("No data.");
        const measurements: Measurement[] = rows
          .map((raw): Measurement => {
            const item = record(raw);
            const validAt = timestamp(item.t);
            const value = numeric(item.v);
            if (kind === "observation") {
              if (Date.parse(validAt) > now.getTime())
                throw new Error("Future observation.");
              if (
                typeof item.f !== "string" ||
                !/^0,0,0$/.test(item.f.replace(/\s/g, ""))
              )
                throw new Error("Quality flags missing or raised.");
              return { value, unit: "°C", validAt, kind };
            }
            if (item.type !== "H" && item.type !== "L")
              throw new Error("Invalid tide phase.");
            if (
              Date.parse(validAt) < now.getTime() ||
              Date.parse(validAt) > now.getTime() + 24 * 60 * 60 * 1000
            )
              throw new Error("Prediction outside requested window.");
            return {
              value,
              unit: "m",
              validAt,
              kind,
              datum: "MLLW",
              phase: item.type === "H" ? "high" : "low",
            };
          })
          .sort((a, b) => Date.parse(a.validAt) - Date.parse(b.validAt));
        const stale =
          kind === "observation" &&
          now.getTime() -
            Date.parse(measurements[measurements.length - 1].validAt) >
            this.freshnessMs;
        return {
          ...base,
          status: stale ? "stale" : "available",
          measurements,
          ...(stale
            ? { reason: "Observation exceeds the configured freshness limit." }
            : {}),
        };
      } catch {
        return {
          ...base,
          status: "unavailable",
          measurements: [],
          reason:
            "NOAA data is unavailable or failed validation. Try again later or check the source.",
        };
      }
    };
    const [waterTemperature, tides] = await Promise.all([
      product(tempUrl.toString(), "observation"),
      product(tideUrl.toString(), "prediction"),
    ]);
    return { station, waterTemperature, tides };
  }
}
