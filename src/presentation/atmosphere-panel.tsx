import type { Atmosphere } from "../domain/atmosphere";
export function AtmospherePanel({
  data,
  timeZone,
}: {
  data: Atmosphere;
  timeZone: string;
}) {
  const format = (time: string | null) =>
    time
      ? new Date(time).toLocaleString("en-US", {
          timeZone,
          timeZoneName: "short",
        })
      : "unavailable";
  return (
    <section className="card">
      <h2>Atmosphere and natural light</h2>
      <h3>Nearby atmospheric pressure · {data.pressure.status}</h3>
      <p>
        Station pressure:{" "}
        {data.pressure.hPa === null
          ? "unavailable"
          : `${data.pressure.hPa.toFixed(1)} hPa`}
        . Observed {format(data.pressure.observedAt)}.
      </p>
      <p>
        Station {data.pressure.stationId ?? "unavailable"} ·{" "}
        {data.pressure.distanceKm?.toFixed(1) ?? "unknown"} km from your
        coordinate. This is a nearby observation, not an on-site measurement.
      </p>
      <p>
        Pressure change:{" "}
        {data.pressure.trendHpaPerHour === null
          ? "unavailable"
          : `${data.pressure.trendHpaPerHour.toFixed(2)} hPa/hour`}{" "}
        {data.pressure.trendFrom && `since ${format(data.pressure.trendFrom)}`}.
        No fishing suitability inferred.
      </p>
      <h3>Cloud cover and wind gust forecast · {data.grid.status}</h3>
      <p>Updated {format(data.grid.updatedAt)}</p>
      <ul>
        {data.grid.values.slice(0, 24).map((v, i) => (
          <li key={i}>
            {v.parameter === "cloudCover" ? "Cloud cover" : "Wind gust"}:{" "}
            {v.value.toFixed(1)} {v.unit} · {format(v.start)} – {format(v.end)}
          </li>
        ))}
      </ul>
      {!data.grid.values.some((v) => v.parameter === "cloudCover") && (
        <p>Cloud cover forecast unavailable.</p>
      )}
      {!data.grid.values.some((v) => v.parameter === "windGust") && (
        <p>Wind gust forecast unavailable.</p>
      )}
      <h3>Calculated light · {data.light.status}</h3>
      <p>
        {data.light.phase}. These astronomical events do not measure actual
        brightness or cloud effects.
      </p>
      <p>
        Sunrise: {format(data.light.sunrise)}
        <br />
        Sunset: {format(data.light.sunset)}
        <br />
        Civil dawn: {format(data.light.civilDawn)}
        <br />
        Civil dusk: {format(data.light.civilDusk)}
      </p>
      {[data.pressure, data.grid, data.light].map((product, i) => (
        <p key={i}>
          {product.reason}{" "}
          <a href={product.sourceUrl} target="_blank" rel="noreferrer">
            NWS {product.kind} source
          </a>{" "}
          · retrieved {format(product.retrievedAt)}
        </p>
      ))}
    </section>
  );
}
