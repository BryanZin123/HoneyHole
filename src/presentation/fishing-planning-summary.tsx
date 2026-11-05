import type { getFishingPoint } from "../application/get-fishing-point";
import { selectConditions } from "../domain/selected-conditions";
import { planningStatus } from "../domain/planning-summary";
type Result = Awaited<ReturnType<typeof getFishingPoint>>;
export function FishingPlanningSummary({ result }: { result: Result }) {
  const e = result.environment;
  const view = e
    ? selectConditions({
        point: result.point.coordinates,
        date: result.date,
        weather: e.weather,
        atmosphere: e.atmosphere,
        marine: e.tides.conditions,
      })
    : null;
  const available = !!(
    view?.weather.periods.length ||
    view?.atmosphere.grid.values.length ||
    view?.marine?.tides.measurements.length ||
    view?.marine?.waterTemperature.measurements.length ||
    view?.atmosphere.pressure.hPa
  );
  // This endpoint has no verified access/legal/hazard evidence. Never promote it to further review.
  const status = planningStatus(false, available, false);
  return (
    <section aria-label="Fishing planning summary">
      <h3>{status}</h3>
      <p>
        {result.date} · America/Los_Angeles · Target:{" "}
        {result.species === "unassessed"
          ? "not selected / unassessed"
          : result.species}
      </p>
      <p>
        There is insufficient evidence to classify this point as a good or bad
        fishing spot. Missing data does not mean unfavorable conditions.
      </p>
      <dl>
        <dt>Species habitat association</dt>
        <dd>
          {result.habitat.association.profile
            ? "Barred surfperch: documented sandy-beach surf-zone association; presence here is not established."
            : "Unassessed. Select barred surfperch for the reviewed profile; other targets have no reviewed profile."}
        </dd>
        <dt>Evidence at this fishing point</dt>
        <dd>
          {result.habitat.locationEvidence.status}.{" "}
          {result.shoreline.status === "available"
            ? `${result.shoreline.features.length} historical mapped segments provide nearby context, not current substrate verification.`
            : result.shoreline.status === "outside-pilot"
              ? "Outside the validated shoreline pilot areas."
              : "Mapped shoreline context is missing or unavailable; no classification inferred."}
        </dd>
        <dt>Environmental availability for this day</dt>
        <dd>
          {!e
            ? "Not loaded. Environmental access is optional."
            : `Hourly forecast: ${view!.weather.periods.length ? "available" : e.weather.status === "stale" ? "stale" : e.weather.status === "unavailable" ? "provider unavailable or unsupported" : "outside selected date"}. Grid fields: ${view!.atmosphere.grid.values.length ? "available" : "no usable selected-day values"}. Station tides: ${view!.marine?.tides.measurements.length ? "reference available; transfer unverified" : "unavailable for this day"}.`}
        </dd>
        <dt>Coastal hazards</dt>
        <dd>
          UNVERIFIED. No hazard clearance; missing warnings do not establish
          safety.
        </dd>
        <dt>Public access / fishing regulations</dt>
        <dd>
          UNVERIFIED / UNVERIFIED. An entrance or mapped beach does not grant
          permission here.
        </dd>
      </dl>
      {e?.weather.reason && <p>{e.weather.reason}</p>}
      {result.shoreline.features[0] && (
        <p>
          Nearest returned mapped segment: approximately{" "}
          {(result.shoreline.features[0].distanceMeters / 1000).toFixed(2)} km
          away. This distance is not proof that its classification applies here.
        </p>
      )}
      <h4>What to verify next</h4>
      <ol>
        <li>
          Confirm public entry, current closures and the exact fishing area’s
          rules with the land manager and CDFW.
        </li>
        <li>
          Check official coastal forecasts and warnings before travel; verify
          shoreline conditions on site without assuming safe entry.
        </li>
        <li>
          Confirm sandy surf-zone habitat independently; historical shoreline
          mapping cannot verify today’s habitat.
        </li>
        <li>
          {!e
            ? "Optionally consent and load environmental information for your selected date."
            : "Review dated provider evidence below. For dates beyond forecast coverage, return nearer your trip; observations are not future forecasts."}
        </li>
      </ol>
      <p>
        <a href="https://www.weather.gov/mtr/" target="_blank" rel="noreferrer">
          NWS Bay Area / Monterey forecasts and warnings
        </a>{" "}
        ·{" "}
        <a
          href="https://wildlife.ca.gov/Fishing/Ocean/Regulations"
          target="_blank"
          rel="noreferrer"
        >
          CDFW ocean regulations
        </a>
      </p>
      <p>
        Fishing recommendation unavailable. Alerts disabled. These statuses do
        not rank locations or predict catches.
      </p>
    </section>
  );
}
