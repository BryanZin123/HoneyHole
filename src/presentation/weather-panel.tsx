import type { WeatherForecast } from "../domain/weather";
export function WeatherPanel({
  forecast,
  timeZone,
}: {
  forecast: WeatherForecast;
  timeZone: string;
}) {
  const format = (value: string) =>
    new Date(value).toLocaleString("en-US", {
      timeZone,
      timeZoneName: "short",
    });
  return (
    <section className="card weather">
      <p className="eyebrow">NWS · {forecast.status.toUpperCase()}</p>
      <h2>Hourly weather forecast</h2>
      {forecast.reason && <p>{forecast.reason}</p>}
      <p>
        Forecast for the station coordinates. This is not an observation or a
        fishing recommendation.
      </p>
      {forecast.updatedAt && (
        <p>Provider updated: {format(forecast.updatedAt)}</p>
      )}
      <div className="forecast-scroll">
        {forecast.periods.slice(0, 12).map((p) => (
          <article className="forecast-hour" key={p.start}>
            <h3>{format(p.start)}</h3>
            <p>{p.summary ?? "Sky conditions unavailable"}</p>
            <p>
              Air:{" "}
              {p.airTemperatureC === null
                ? "unavailable"
                : `${p.airTemperatureC.toFixed(1)} °C`}
            </p>
            <p>
              Wind:{" "}
              {p.windSpeedMps
                ? `${p.windSpeedMps.minimum.toFixed(1)}–${p.windSpeedMps.maximum.toFixed(1)} m/s`
                : "unavailable"}{" "}
              {p.windDirection ?? ""}
            </p>
            <p>
              {p.isDaytime === null
                ? "Daylight status unavailable"
                : p.isDaytime
                  ? "Daytime forecast"
                  : "Nighttime forecast"}
            </p>
          </article>
        ))}
      </div>
      <p>
        Not supplied or assessed by this hourly product (see additional
        evidence):{" "}
        {forecast.missingFields.join(", ") || "none reported by this adapter"}.
      </p>
      <p>
        No opportunity alert is generated from this forecast. Hazard, access,
        regulatory and species assessments are pending.
      </p>
      <a href={forecast.sourceUrl} target="_blank" rel="noreferrer">
        NWS source ↗
      </a>
    </section>
  );
}
