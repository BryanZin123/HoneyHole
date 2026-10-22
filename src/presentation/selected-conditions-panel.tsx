import type { getLocationDetail } from "../application/get-location-detail";
import { selectConditions } from "../domain/selected-conditions";
import { WeatherPanel } from "./weather-panel";
import { AtmospherePanel } from "./atmosphere-panel";
type Detail = Awaited<ReturnType<typeof getLocationDetail>>;
export function SelectedConditionsPanel({
  detail,
}: {
  detail: Pick<
    Detail,
    "location" | "activity" | "weather" | "atmosphere" | "tides"
  >;
}) {
  const view = selectConditions({
    point: detail.location.coordinates,
    date: detail.activity.date,
    weather: detail.weather,
    atmosphere: detail.atmosphere,
    marine: detail.tides.conditions,
  });
  return (
    <section aria-label="Selected-date environmental evidence">
      <h3>Conditions for {detail.activity.date} · California local time</h3>
      <p>
        Forecast intervals shown overlap the selected day; their full validity
        times remain visible. Available samples do not establish full-day
        coverage. No fishing prediction, safety clearance or fishing permission
        is inferred.
      </p>
      <p>
        Provider freshness: weather {detail.weather.status}, grid{" "}
        {detail.atmosphere.grid.status}, pressure{" "}
        {detail.atmosphere.pressure.status}, light{" "}
        {detail.atmosphere.light.status}. Weather retrieved{" "}
        {detail.weather.retrievedAt}; generated{" "}
        {detail.weather.generatedAt ?? "unknown"}.
      </p>
      {!view.weather.periods.length && (
        <p>No usable hourly forecast for this selected date and location.</p>
      )}
      <WeatherPanel forecast={view.weather} timeZone={view.timeZone} />
      <AtmospherePanel data={view.atmosphere} timeZone={view.timeZone} />
      <h3>Nearby marine station reference</h3>
      <p>
        {detail.tides.reason} Transfer relevance UNVERIFIED: station tides and
        water temperature are not verified conditions at this fishing location.
      </p>
      {view.marine ? (
        <>
          <p>
            {view.marine.station.name} ·{" "}
            {detail.tides.distanceKm?.toFixed(1) ?? "unknown"} km away ·{" "}
            {view.marine.station.latitude}, {view.marine.station.longitude}
          </p>
          {(["tides", "waterTemperature"] as const).map((key) => (
            <div key={key}>
              <h4>
                {key === "tides"
                  ? "Tide predictions"
                  : "Water temperature observations"}{" "}
                · {view.marine![key].status}
              </h4>
              <p>
                Original provider status: {detail.tides.conditions![key].status}
                . Retrieved {view.marine![key].retrievedAt}.
              </p>
              {view.marine![key].measurements.length ? (
                <ul>
                  {view.marine![key].measurements.map((m, i) => (
                    <li key={i}>
                      {m.phase} {m.value} {m.unit} {m.datum} · {m.validAt} ·{" "}
                      {m.kind}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No usable station samples for the selected date.</p>
              )}
              <a
                href={view.marine![key].sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                NOAA {key === "tides" ? "tide" : "water temperature"} source
              </a>
            </div>
          ))}
        </>
      ) : (
        <p>Marine station evidence unavailable.</p>
      )}
    </section>
  );
}
