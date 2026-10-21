import { containsCoordinate } from "../domain/spatial";
import type { WeatherProvider } from "../application/weather-provider";
import type { Coordinates } from "../domain/geography";
import type { ForecastPeriod, WeatherForecast } from "../domain/weather";
class ProviderFailure extends Error {
  constructor(public code: string) {
    super(code);
  }
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid provider object");
  return value as Record<string, unknown>;
}
export function instant(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value,
    )
  )
    throw new Error("Invalid timestamp");
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (
    new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) !==
    value.slice(0, 10)
  )
    throw new Error("Invalid date");
  if (
    Number(value.slice(11, 13)) > 23 ||
    Number(value.slice(14, 16)) > 59 ||
    Number(value.slice(17, 19)) > 59
  )
    throw new Error("Invalid clock time");
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) throw new Error("Invalid timestamp");
  return parsed.toISOString();
}
function wind(value: unknown): ForecastPeriod["windSpeedMps"] {
  if (typeof value !== "string") return null;
  const m = value.match(
    /^(\d+(?:\.\d+)?)(?: to (\d+(?:\.\d+)?))? (mph|km\/h|m\/s)$/,
  );
  if (!m) return null;
  const factor = m[3] === "mph" ? 0.44704 : m[3] === "km/h" ? 1 / 3.6 : 1;
  const minimum = Number(m[1]) * factor,
    maximum = Number(m[2] ?? m[1]) * factor;
  return Number.isFinite(maximum) && maximum >= minimum
    ? { minimum, maximum }
    : null;
}
export class NwsWeatherProvider implements WeatherProvider {
  constructor(
    private fetcher: typeof fetch = fetch,
    private now: () => Date = () => new Date(),
    private maxAgeMs = 6 * 60 * 60 * 1000,
    private userAgent = "HoneyHole/0.1 (https://github.com/BryanZin123/HoneyHole)",
    private clockSkewMs = 2 * 60 * 1000,
  ) {
    if (!Number.isFinite(maxAgeMs) || maxAgeMs <= 0)
      throw new Error("Forecast freshness must be positive");
    if (!Number.isFinite(clockSkewMs) || clockSkewMs < 0)
      throw new Error("Clock skew must be nonnegative");
  }
  private async request(url: string) {
    let response: Response;
    try {
      response = await this.fetcher(url, {
        headers: {
          Accept: "application/geo+json",
          "User-Agent": this.userAgent,
        },
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
        redirect: "error",
      });
    } catch {
      throw new ProviderFailure("network");
    }
    if (!response.ok)
      throw new ProviderFailure(`provider-http-${response.status}`);
    return object(await response.json());
  }
  async getForecast(coordinates: Coordinates): Promise<WeatherForecast> {
    const now = this.now();
    const base: WeatherForecast = {
      status: "unavailable",
      kind: "forecast",
      coordinates,
      sourceUrl: "https://api.weather.gov",
      retrievedAt: now.toISOString(),
      requestStartedAt: now.toISOString(),
      issuedAt: null,
      updatedAt: null,
      generatedAt: null,
      timeZone: null,
      periods: [],
      missingFields: [
        "barometricPressure",
        "pressureTrend",
        "cloudCoverPercent",
        "sunrise",
        "sunset",
        "windGust",
        "hazardAssessment",
        "forecastIssueTime",
      ],
    };
    try {
      if (
        !Number.isFinite(coordinates.latitude) ||
        !Number.isFinite(coordinates.longitude) ||
        Math.abs(coordinates.latitude) > 90 ||
        Math.abs(coordinates.longitude) > 180
      )
        throw new Error("Invalid coordinates");
      base.sourceUrl = `https://api.weather.gov/points/${coordinates.latitude.toFixed(4)},${coordinates.longitude.toFixed(4)}`;
      const discovery = object((await this.request(base.sourceUrl)).properties);
      if (typeof discovery.timeZone !== "string")
        throw new Error("Missing time zone");
      new Intl.DateTimeFormat("en-US", { timeZone: discovery.timeZone });
      base.timeZone = discovery.timeZone;
      if (typeof discovery.forecastHourly !== "string")
        throw new Error("No hourly coverage");
      const url = new URL(discovery.forecastHourly);
      if (
        url.origin !== "https://api.weather.gov" ||
        url.username ||
        url.password ||
        !/^\/gridpoints\/[A-Z]{3,4}\/\d+,\d+\/forecast\/hourly$/.test(
          url.pathname,
        )
      )
        throw new Error("Invalid forecast discovery URL");
      url.search = "units=si";
      url.hash = "";
      base.sourceUrl = url.toString();
      const forecastResponse = await this.request(base.sourceUrl);
      if (!containsCoordinate(coordinates, forecastResponse.geometry))
        throw new ProviderFailure("location-mismatch");
      const properties = object(forecastResponse.properties);
      const receivedAt = this.now();
      base.responseReceivedAt = receivedAt.toISOString();
      base.retrievedAt = base.responseReceivedAt;
      if (receivedAt.getTime() < now.getTime() - this.clockSkewMs)
        throw new ProviderFailure("local-clock-reversal");
      base.updatedAt = instant(properties.updateTime);
      base.generatedAt = instant(properties.generatedAt);
      if (
        Date.parse(base.updatedAt) > receivedAt.getTime() + this.clockSkewMs ||
        Date.parse(base.generatedAt) > receivedAt.getTime() + this.clockSkewMs
      )
        throw new ProviderFailure("future-provider-timestamp");
      if (!Array.isArray(properties.periods) || !properties.periods.length)
        throw new Error("No forecast");
      const missing = new Set(base.missingFields);
      const periods = properties.periods
        .map((raw): ForecastPeriod => {
          const p = object(raw),
            start = instant(p.startTime),
            end = instant(p.endTime);
          if (Date.parse(end) <= Date.parse(start))
            throw new Error("Reversed forecast window");
          let airTemperatureC: number | null = null;
          if (
            typeof p.temperature === "number" &&
            Number.isFinite(p.temperature)
          ) {
            if (p.temperatureUnit === "C") airTemperatureC = p.temperature;
            else if (p.temperatureUnit === "F")
              airTemperatureC = ((p.temperature - 32) * 5) / 9;
          }
          const windSpeedMps = wind(p.windSpeed);
          const windDirection =
            typeof p.windDirection === "string" &&
            /^(N|NNE|NE|ENE|E|ESE|SE|SSE|S|SSW|SW|WSW|W|WNW|NW|NNW|VRB)$/.test(
              p.windDirection,
            )
              ? p.windDirection
              : null;
          const isDaytime =
            typeof p.isDaytime === "boolean" ? p.isDaytime : null;
          const summary =
            typeof p.shortForecast === "string" && p.shortForecast.trim()
              ? p.shortForecast
              : null;
          for (const [key, value] of Object.entries({
            airTemperature: airTemperatureC,
            windSpeed: windSpeedMps,
            windDirection,
            isDaytime,
            skySummary: summary,
          }))
            if (value === null) missing.add(key);
          return {
            start,
            end,
            airTemperatureC,
            windSpeedMps,
            windDirection,
            isDaytime,
            summary,
          };
        })
        .filter((p) => Date.parse(p.end) > receivedAt.getTime())
        .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
      if (!periods.length) throw new Error("Forecast expired");
      const stale =
        receivedAt.getTime() - Date.parse(base.updatedAt) > this.maxAgeMs;
      return {
        ...base,
        status: stale ? "stale" : "available",
        periods,
        missingFields: [...missing],
        ...(stale
          ? { reason: "Forecast exceeds the configured freshness limit." }
          : {}),
      };
    } catch (error) {
      return {
        ...base,
        status: "unavailable",
        errorCode:
          error instanceof ProviderFailure
            ? error.code
            : "invalid-provider-data",
        periods: [],
        reason:
          "NWS hourly forecast is unavailable or failed validation. Coastal coverage may be incomplete.",
      };
    }
  }
}
