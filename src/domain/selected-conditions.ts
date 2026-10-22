import type { Coordinates } from "./geography";
import type { WeatherForecast } from "./weather";
import type { Atmosphere } from "./atmosphere";
import type { MarineConditions, ProductResult } from "./marine";
import { validDate } from "./effective-regulations";
const timeZone = "America/Los_Angeles";
const localDate = (ms: number) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ms);
export function dateContainsInstant(instant: string | null, date: string) {
  const ms = instant ? Date.parse(instant) : NaN;
  return validDate(date) && Number.isFinite(ms) && localDate(ms) === date;
}
/** Half-open provider intervals; California civil date, including DST days. */
export function periodOverlapsDate(start: string, end: string, date: string) {
  const a = Date.parse(start),
    b = Date.parse(end);
  return (
    validDate(date) &&
    Number.isFinite(a) &&
    Number.isFinite(b) &&
    b > a &&
    localDate(a) <= date &&
    localDate(b - 1) >= date
  );
}
/** A dated view of existing evidence, never a suitability score or legal assessment. */
export function selectConditions(input: {
  point: Coordinates;
  date: string;
  weather: WeatherForecast;
  atmosphere: Atmosphere;
  marine: MarineConditions | null;
}) {
  const { point, date, weather, atmosphere, marine } = input;
  const samePoint = (p: Coordinates) =>
    p.latitude === point.latitude && p.longitude === point.longitude;
  const periods =
    weather.status === "available" && samePoint(weather.coordinates)
      ? weather.periods.filter((p) => periodOverlapsDate(p.start, p.end, date))
      : [];
  const values =
    atmosphere.grid.status === "available" && samePoint(atmosphere.coordinates)
      ? atmosphere.grid.values.filter((p) =>
          periodOverlapsDate(p.start, p.end, date),
        )
      : [];
  const pressureAvailable =
    atmosphere.pressure.status === "available" &&
    samePoint(atmosphere.coordinates) &&
    dateContainsInstant(atmosphere.pressure.observedAt, date);
  const light = atmosphere.light;
  const event = (value: string | null) =>
    light.status === "available" &&
    samePoint(atmosphere.coordinates) &&
    dateContainsInstant(value, date)
      ? value
      : null;
  const sunrise = event(light.sunrise),
    sunset = event(light.sunset),
    civilDawn = event(light.civilDawn),
    civilDusk = event(light.civilDusk);
  const unavailable =
    "No usable evidence for this selected location and California date; provider data may be missing, stale or outside the selected day.";
  const product = (p: ProductResult): ProductResult => {
    const measurements =
      p.status === "available"
        ? p.measurements.filter((m) => dateContainsInstant(m.validAt, date))
        : [];
    return {
      ...p,
      measurements,
      status: measurements.length ? "available" : "unavailable",
      reason: measurements.length ? p.reason : unavailable,
    };
  };
  return {
    date,
    timeZone,
    weather: {
      ...weather,
      periods,
      status: periods.length ? "available" : "unavailable",
      reason: periods.length ? weather.reason : unavailable,
    } as WeatherForecast,
    atmosphere: {
      ...atmosphere,
      grid: {
        ...atmosphere.grid,
        values,
        status: values.length ? "available" : "unavailable",
        reason: values.length ? atmosphere.grid.reason : unavailable,
      },
      pressure: pressureAvailable
        ? atmosphere.pressure
        : {
            ...atmosphere.pressure,
            status: "unavailable",
            hPa: null,
            trendHpaPerHour: null,
            trendFrom: null,
            reason: unavailable,
          },
      // Current phase is not a forecast of the phase throughout the selected date.
      light: {
        ...light,
        sunrise,
        sunset,
        civilDawn,
        civilDusk,
        phase: "unknown",
        status:
          sunrise || sunset || civilDawn || civilDusk
            ? "available"
            : "unavailable",
        reason:
          "Calculated events only when dated to the selected day; no daily brightness prediction.",
      },
    } as Atmosphere,
    marine: marine
      ? {
          ...marine,
          tides: product(marine.tides),
          waterTemperature: product(marine.waterTemperature),
        }
      : null,
  };
}
