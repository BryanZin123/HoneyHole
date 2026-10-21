import { selectObservation } from "../application/select-observation";
import type { AtmosphereProvider } from "../application/atmosphere-provider";
import type { Atmosphere } from "../domain/atmosphere";
import type { Coordinates } from "../domain/geography";
import {
  containsCoordinate,
  distanceKm,
  validateCoordinates,
} from "../domain/spatial";
import { instant } from "./nws";
function trusted(value: unknown, pattern: RegExp): string {
  if (typeof value !== "string") throw Error("Missing discovery URL");
  const u = new URL(value);
  if (
    u.origin !== "https://api.weather.gov" ||
    u.username ||
    u.password ||
    !pattern.test(u.pathname) ||
    u.search ||
    u.hash
  )
    throw Error("Untrusted discovery");
  return u.href;
}
function localDay(date: Date, zone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
function interval(value: unknown): { start: string; end: string } {
  if (typeof value !== "string") throw Error("Invalid interval");
  const [raw, duration] = value.split("/");
  const start = instant(raw);
  const m = duration?.match(
    /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/,
  );
  if (!m) throw Error("Invalid duration");
  const ms =
    ((Number(m[1] ?? 0) * 24 + Number(m[2] ?? 0)) * 3600 +
      Number(m[3] ?? 0) * 60 +
      Number(m[4] ?? 0)) *
    1000;
  if (ms <= 0 || ms > 8 * 86400000) throw Error("Invalid duration");
  return { start, end: new Date(Date.parse(start) + ms).toISOString() };
}
export class NwsAtmosphereProvider implements AtmosphereProvider {
  constructor(
    private fetcher: typeof fetch = fetch,
    private now: () => Date = () => new Date(),
  ) {}
  private async request(url: string) {
    const r = await this.fetcher(url, {
      headers: {
        "User-Agent":
          "HoneyHole/0.1 (https://github.com/BryanZin123/HoneyHole)",
        Accept: "application/geo+json",
      },
      signal: AbortSignal.timeout(8000),
      redirect: "error",
      cache: "no-store",
    });
    if (!r.ok) throw Error("Provider HTTP " + r.status);
    return r.json();
  }
  async getAtmosphere(coordinates: Coordinates): Promise<Atmosphere> {
    validateCoordinates(coordinates);
    const sourceUrl = `https://api.weather.gov/points/${coordinates.latitude.toFixed(4)},${coordinates.longitude.toFixed(4)}`;
    const base = {
      status: "unavailable" as const,
      sourceUrl,
      retrievedAt: this.now().toISOString(),
    };
    const result: Atmosphere = {
      coordinates,
      grid: { ...base, kind: "forecast", updatedAt: null, values: [] },
      pressure: {
        ...base,
        kind: "observation",
        stationId: null,
        stationCoordinates: null,
        distanceKm: null,
        observedAt: null,
        hPa: null,
        trendHpaPerHour: null,
        trendFrom: null,
      },
      light: {
        ...base,
        kind: "calculated",
        sunrise: null,
        sunset: null,
        civilDawn: null,
        civilDusk: null,
        phase: "unknown",
      },
    };
    const failure =
      "Provider data unavailable, stale for this purpose, or invalid; no values inferred.";
    let point;
    try {
      point = (await this.request(sourceUrl)).properties;
      if (!point) throw Error("Invalid discovery");
    } catch {
      for (const product of [result.grid, result.pressure, result.light])
        product.reason = failure;
      return result;
    }
    await Promise.all([
      (async () => {
        try {
          const url = trusted(
            point.forecastGridData,
            /^\/gridpoints\/[A-Z]{3,4}\/\d+,\d+$/,
          );
          result.grid.sourceUrl = url;
          const body = await this.request(url);
          const receipt = this.now();
          result.grid.retrievedAt = receipt.toISOString();
          if (!containsCoordinate(coordinates, body.geometry))
            throw Error("Unrelated grid");
          const updatedAt = instant(body.properties.updateTime);
          const age = receipt.getTime() - Date.parse(updatedAt);
          if (age < -120000) throw Error("Future grid");
          const values: Atmosphere["grid"]["values"] = [];
          for (const [key, parameter] of [
            ["skyCover", "cloudCover"],
            ["windGust", "windGust"],
          ] as const) {
            const field = body.properties[key];
            if (!field || !Array.isArray(field.values)) continue;
            const factor =
              key === "skyCover"
                ? field.uom === "wmoUnit:percent"
                  ? 1
                  : null
                : field.uom === "wmoUnit:km_h-1"
                  ? 1 / 3.6
                  : field.uom === "wmoUnit:m_s-1"
                    ? 1
                    : field.uom === "wmoUnit:kn"
                      ? 0.514444
                      : null;
            if (factor === null) continue;
            for (const item of field.values) {
              if (
                typeof item.value !== "number" ||
                !Number.isFinite(item.value) ||
                item.value < 0 ||
                (key === "skyCover" && item.value > 100)
              )
                continue;
              const span = interval(item.validTime);
              if (Date.parse(span.end) <= receipt.getTime()) continue;
              values.push({
                parameter,
                value: item.value * factor,
                unit: key === "skyCover" ? "%" : "m/s",
                ...span,
              });
            }
          }
          if (!values.length) throw Error("No valid grid fields");
          values.sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
          Object.assign(result.grid, {
            status: age > 21600000 ? "stale" : "available",
            updatedAt,
            values,
          });
        } catch {
          result.grid.reason = failure;
        }
      })(),
      (async () => {
        try {
          const stationsUrl = trusted(
            point.observationStations,
            /^\/gridpoints\/[A-Z]{3,4}\/\d+,\d+\/stations$/,
          );
          const stations = await this.request(stationsUrl);
          if (!Array.isArray(stations.features)) throw Error("No stations");
          const candidates = stations.features
            .flatMap(
              (f: {
                geometry?: { type?: string; coordinates?: number[] };
                properties?: { stationIdentifier?: string };
              }) => {
                try {
                  const c = f.geometry?.coordinates;
                  if (
                    f.geometry?.type !== "Point" ||
                    !c ||
                    !f.properties?.stationIdentifier?.match(/^[A-Z0-9]{3,8}$/)
                  )
                    return [];
                  const position = { latitude: c[1], longitude: c[0] };
                  return [
                    {
                      id: f.properties.stationIdentifier,
                      position,
                      distance: distanceKm(coordinates, position),
                    },
                  ];
                } catch {
                  return [];
                }
              },
            )
            .filter((s: { distance: number }) => s.distance <= 25)
            .sort(
              (a: { distance: number }, b: { distance: number }) =>
                a.distance - b.distance,
            );
          const selected = await selectObservation(
            candidates as {
              id: string;
              position: Coordinates;
              distance: number;
            }[],
            async (station) => {
              const candidatePressure: Atmosphere["pressure"] = {
                ...result.pressure,
              };
              Object.assign(candidatePressure, {
                stationId: station.id,
                stationCoordinates: station.position,
                distanceKm: station.distance,
              });
              const url = `https://api.weather.gov/stations/${station.id}/observations?limit=50`;
              candidatePressure.sourceUrl = url;
              const body = await this.request(url);
              const receipt = this.now();
              candidatePressure.retrievedAt = receipt.toISOString();
              if (!Array.isArray(body.features))
                throw Error("Invalid observations");
              const readings = body.features
                .flatMap(
                  (f: {
                    geometry?: { type?: string; coordinates?: number[] };
                    properties?: {
                      station?: string;
                      timestamp?: string;
                      barometricPressure?: {
                        value?: number;
                        unitCode?: string;
                        qualityControl?: string;
                      };
                    };
                  }) => {
                    try {
                      const props = f.properties;
                      const c = f.geometry?.coordinates;
                      const q = props?.barometricPressure;
                      if (
                        props?.station !==
                          `https://api.weather.gov/stations/${station.id}` ||
                        f.geometry?.type !== "Point" ||
                        !c ||
                        distanceKm(station.position, {
                          latitude: c[1],
                          longitude: c[0],
                        }) > 1 ||
                        q?.unitCode !== "wmoUnit:Pa" ||
                        q.qualityControl !== "V" ||
                        typeof q.value !== "number" ||
                        !Number.isFinite(q.value) ||
                        q.value <= 0
                      )
                        return [];
                      const time = instant(props.timestamp);
                      if (Date.parse(time) > receipt.getTime() + 120000)
                        return [];
                      return [{ time, value: q.value / 100 }];
                    } catch {
                      return [];
                    }
                  },
                )
                .sort(
                  (a: { time: string }, b: { time: string }) =>
                    Date.parse(b.time) - Date.parse(a.time),
                );
              const latest = readings[0];
              if (!latest) throw Error("No valid pressure");
              const previous = readings.find((r: { time: string }) => {
                const h =
                  (Date.parse(latest.time) - Date.parse(r.time)) / 3600000;
                return h >= 2 && h <= 4;
              });
              Object.assign(candidatePressure, {
                status:
                  receipt.getTime() - Date.parse(latest.time) > 5400000
                    ? "stale"
                    : "available",
                hPa: latest.value,
                observedAt: latest.time,
                trendFrom: previous?.time ?? null,
                trendHpaPerHour: previous
                  ? (latest.value - previous.value) /
                    ((Date.parse(latest.time) - Date.parse(previous.time)) /
                      3600000)
                  : null,
              });

              return candidatePressure;
            },
          );
          if (selected) result.pressure = selected;
          else
            result.pressure.reason =
              "No sufficiently fresh, quality-checked pressure in the five nearest stations within 25 km.";
        } catch {
          result.pressure.reason = failure;
        }
      })(),
      (async () => {
        try {
          if (typeof point.timeZone !== "string")
            throw Error("Missing time zone");
          const a = point.astronomicalData;
          const sunrise = instant(a?.sunrise),
            sunset = instant(a?.sunset),
            civilDawn = instant(a?.civilTwilightBegin),
            civilDusk = instant(a?.civilTwilightEnd);
          const receipt = this.now();
          const times = [civilDawn, sunrise, sunset, civilDusk].map(Date.parse);
          if (
            times.some(
              (t, i) =>
                localDay(new Date(t), point.timeZone) !==
                  localDay(receipt, point.timeZone) ||
                (i > 0 && t <= times[i - 1]),
            )
          )
            throw Error("Wrong solar day/order");
          const time = receipt.getTime();
          const phase =
            time >= times[1] && time < times[2]
              ? "daylight"
              : time >= times[0] && time < times[3]
                ? "civil-twilight"
                : "night";
          Object.assign(result.light, {
            status: "available",
            retrievedAt: receipt.toISOString(),
            sunrise,
            sunset,
            civilDawn,
            civilDusk,
            phase,
          });
        } catch {
          result.light.reason = failure;
        }
      })(),
    ]);
    return result;
  }
}
