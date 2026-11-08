"use client";

import { RefreshCoastalWarnings } from "./refresh-coastal-warnings";
import type { WarningEvidence } from "../application/warning-provider";
import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  styles,
  periods,
  type NearbyPlan,
  type NearbyResult,
} from "../application/find-nearby";
import type { Coordinates } from "../domain/geography";
import type { getLocationDetail } from "../application/get-location-detail";
import type { getShorelineContext } from "../application/get-shoreline-context";
import { SelectedConditionsPanel } from "./selected-conditions-panel";
import { selectConditions } from "../domain/selected-conditions";
import { HabitatPanel } from "./habitat-panel";
const AreaMap = dynamic(
  () => import("./explore-map").then((m) => m.ExploreMap),
  { ssr: false },
);
type Candidate = NearbyResult["candidates"][number];
type Detail = Awaited<ReturnType<typeof getLocationDetail>> & {
  warnings?: WarningEvidence;
  shoreline: Awaited<ReturnType<typeof getShorelineContext>>;
};
function datedSummary(d: Detail) {
  if (!d.weather || !d.atmosphere)
    return "No dated environmental evidence supplied.";
  const v = selectConditions({
    point: d.location.coordinates,
    date: d.activity.date,
    weather: d.weather,
    atmosphere: d.atmosphere,
    marine: d.tides.conditions,
  });
  const items = [
    v.weather.periods.length && "hourly weather",
    v.atmosphere.grid.values.length && "grid forecasts",
    v.atmosphere.light.status === "available" && "daylight",
    v.atmosphere.pressure.status === "available" && "station pressure",
    v.marine?.tides.measurements.length && "station tide predictions",
    v.marine?.waterTemperature.measurements.length &&
      "station water temperature",
  ].filter(Boolean);
  return `Available for ${d.activity.date}: ${items.join(", ") || "no usable products"}. Station references are not verified conditions at the entrance.`;
}
export function NearbyAreas() {
  const [lat, setLat] = useState(""),
    [lon, setLon] = useState(""),
    [map, setMap] = useState(false),
    [pick, setPick] = useState(false),
    [result, setResult] = useState<NearbyResult | null>(null),
    [plan, setPlan] = useState<NearbyPlan | null>(null),
    [selected, setSelected] = useState<string | null>(null),
    [consented, setConsented] = useState(false),
    [details, setDetails] = useState<Record<string, Detail>>({}),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const searchReq = useRef<AbortController | null>(null),
    evidenceReq = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      searchReq.current?.abort();
      evidenceReq.current?.abort();
    },
    [],
  );
  const invalidate = useCallback(() => {
    searchReq.current?.abort();
    evidenceReq.current?.abort();
    setResult(null);
    setDetails({});
    setPlan(null);
    setSelected(null);
    setConsented(false);
    setBusy(false);
    setLoading(false);
    setError("");
  }, []);
  const choose = useCallback(
    (p: Coordinates) => {
      invalidate();
      setLat(String(p.latitude));
      setLon(String(p.longitude));
      setPick(false);
    },
    [invalidate],
  );
  const select = useCallback((id: string) => {
    evidenceReq.current?.abort();
    setSelected(id);
    setConsented(false);
    setLoading(false);
    setError("");
  }, []);
  async function search(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    invalidate();
    setPick(false);
    const f = new FormData(e.currentTarget);
    const p: NearbyPlan = {
      center: { latitude: Number(lat), longitude: Number(lon) },
      radiusKm: Number(f.get("radius")),
      species: String(f.get("species")),
      method: String(f.get("method")),
      style: String(f.get("style")),
      date: String(f.get("date")),
      period: String(f.get("period")),
    };
    const ctrl = new AbortController();
    searchReq.current = ctrl;
    setBusy(true);
    try {
      const r = await fetch("/api/v1/nearby", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p),
        signal: ctrl.signal,
        cache: "no-store",
      });
      const b = await r.json();
      if (!r.ok) throw Error(b.reason ?? b.error ?? "Discovery unavailable.");
      if (!ctrl.signal.aborted) {
        setPlan(p);
        setResult(b);
      }
    } catch (e) {
      if (!ctrl.signal.aborted)
        setError(e instanceof Error ? e.message : "Discovery unavailable.");
    } finally {
      if (!ctrl.signal.aborted) setBusy(false);
    }
  }
  async function load(c: Candidate) {
    if (!consented || !plan || selected !== c.id) return;
    evidenceReq.current?.abort();
    const ctrl = new AbortController();
    evidenceReq.current = ctrl;
    setLoading(true);
    setError("");
    try {
      const r = await fetch(`/api/v1/locations/${c.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: plan.date,
          species: plan.species,
          method: plan.method,
          coordinates: c.coordinates,
          consent: true,
        }),
        signal: ctrl.signal,
        cache: "no-store",
      });
      if (!r.ok) throw Error();
      const d: Detail = await r.json();
      if (
        d.location.id !== c.id ||
        d.location.coordinates.latitude !== c.coordinates.latitude ||
        d.location.coordinates.longitude !== c.coordinates.longitude ||
        d.activity.coordinates.latitude !== c.coordinates.latitude ||
        d.activity.coordinates.longitude !== c.coordinates.longitude ||
        d.activity.species !== plan.species ||
        d.activity.method !== plan.method ||
        d.activity.date !== plan.date
      )
        throw Error();
      if (!ctrl.signal.aborted) setDetails((old) => ({ ...old, [c.id]: d }));
    } catch {
      if (!ctrl.signal.aborted)
        setError(
          "Evidence unavailable or source identity changed. Repeat the search before relying on this record.",
        );
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }
  const candidates = result?.candidates ?? [];
  const excluded = (c: Candidate) =>
    c.eligibility === "EXCLUDED" ||
    details[c.id]?.opportunity.eligibility === "EXCLUDED";
  const current = candidates.find((c) => c.id === selected);
  const detail = current && details[current.id];
  function card(c: Candidate) {
    const d = details[c.id];
    return (
      <li key={c.id}>
        <button onClick={() => select(c.id)} aria-pressed={selected === c.id}>
          {c.name}
        </button>
        <p>
          {c.distanceKm.toFixed(2)} km straight-line · {c.county} County · State
          Beach entrance #{c.id}
        </p>
        <strong>{excluded(c) ? "Excluded" : "Insufficient evidence"}</strong>
        <p>
          {excluded(c)
            ? d?.access.access.status === "restricted"
              ? "Verified restricted access."
              : "An applicable fishing prohibition was verified."
            : "Within your radius. Investigate this entrance separately from any fishing point."}
        </p>
        <p>
          Access: {d?.access.access.status ?? c.access}. Regulations:{" "}
          {d?.regulations.status ?? c.regulatoryStatus}. Hazards unresolved;
          suitability unassessed.
        </p>
        <p>
          {d
            ? `Historical shoreline: ${d.shoreline.status}. Species association: ${d.habitat.association.status}; habitat at this entrance: ${d.habitat.locationEvidence.status}. ${datedSummary(d)}`
            : "Habitat and environmental products not loaded. Select this record to review dated evidence."}
        </p>
        {c.findings.map((f, i) => (
          <p key={i}>
            <a href={f.sourceUrl}>{f.status}</a>: {f.reason}
          </p>
        ))}
      </li>
    );
  }
  return (
    <>
      <form onSubmit={search} onChange={invalidate} className="coastal-form">
        <label>
          Center latitude
          <input
            required
            type="number"
            step="any"
            min={-90}
            max={90}
            value={lat}
            onChange={(e) => setLat(e.target.value)}
          />
        </label>
        <label>
          Center longitude
          <input
            required
            type="number"
            step="any"
            min={-180}
            max={180}
            value={lon}
            onChange={(e) => setLon(e.target.value)}
          />
        </label>
        <label>
          Radius (km)
          <input
            name="radius"
            type="number"
            step="any"
            min={1}
            max={50}
            defaultValue={10}
            required
          />
        </label>
        <label>
          Target species
          <select name="species">
            <option value="">Unspecified / unassessed</option>
            <option>barred surfperch</option>
            <option>redtail surfperch</option>
            <option>California grunion</option>
          </select>
        </label>
        <label>
          Fishing date (California)
          <input
            name="date"
            type="date"
            required
            defaultValue={new Date().toLocaleDateString("en-CA", {
              timeZone: "America/Los_Angeles",
            })}
          />
        </label>
        <label>
          Time period
          <select name="period">
            {periods.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          Preferred shoreline style
          <select name="style">
            {styles.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          Method
          <select name="method">
            <option value="shore-angling">Shore angling</option>
            <option value="hand-gathering">Hand gathering</option>
          </select>
        </label>
        <button disabled={busy}>
          {busy ? "Searching…" : "Search nearby areas"}
        </button>
      </form>
      <p>
        Enter coordinates or choose a center on the map. Your center goes only
        to HoneyHole in a private request body. Distance is straight-line, not
        driving time, walking distance or a safe route. This search does not
        read your device location or saved pins.
      </p>
      <p>
        Opening the map requests public tiles from OpenStreetMap for the viewed
        area.
      </p>
      <button
        onClick={() => {
          setMap(!map);
          setPick(false);
        }}
      >
        {map ? "Hide area map" : "Open area map"}
      </button>
      {map && (
        <>
          <button onClick={() => setPick(!pick)}>
            {pick ? "Cancel center selection" : "Choose search center on map"}
          </button>
          {pick && (
            <p>
              Click the map, or focus it, pan with arrow keys and press Enter to
              choose its center.
            </p>
          )}
          <AreaMap
            locations={candidates.filter((c) => !excluded(c))}
            selectedId={selected}
            onSelect={select}
            picking={pick}
            onFishingPoint={choose}
            label="Nearby area map"
          />
        </>
      )}
      {error && <p role="alert">{error}</p>}
      {result && plan && (
        <>
          {result.reason && <p role="status">{result.reason}</p>}
          <h2>
            Areas to investigate (
            {candidates.filter((c) => !excluded(c)).length})
          </h2>
          <p>
            Sorted by distance, then source ID. Distance is not fishing quality.
            Plan: {plan.date}, {plan.period},{" "}
            {plan.species || "species unspecified"}, {plan.style}. Style and
            time are preferences, not verified site attributes or time-specific
            clearance.
          </p>
          {!candidates.length && (
            <p>
              No matching State Beach entrances in this radius. Other shoreline
              access may exist outside this catalog.
            </p>
          )}
          <ul className="location-list">
            {candidates.filter((c) => !excluded(c)).map(card)}
          </ul>
          {candidates.some(excluded) && (
            <section aria-label="Excluded areas">
              <h2>Excluded areas</h2>
              <ul>{candidates.filter(excluded).map(card)}</ul>
            </section>
          )}
        </>
      )}
      {current && (
        <section aria-label="Selected entrance evidence">
          <h2>{current.name}: entrance evidence</h2>
          <p>
            Source entrance {current.id}: {current.coordinates.latitude},{" "}
            {current.coordinates.longitude}. No fishing coordinate has been
            assigned. Verify current public entry and closures with the park,
            then check restrictions and coastal warnings for the actual fishing
            point.
          </p>
          <p>
            Source retrieved {current.retrievedAt}; dataset update{" "}
            {current.datasetUpdatedAt ?? "unknown"}.{" "}
            <a href={current.parkUrl ?? current.sourceUrl}>
              Park/source information
            </a>
          </p>
          <label>
            <input
              type="checkbox"
              checked={consented}
              onChange={(e) => {
                setConsented(e.target.checked);
                if (!e.target.checked) {
                  evidenceReq.current?.abort();
                  setLoading(false);
                }
              }}
            />{" "}
            I agree to request NOAA/NWS/GIS evidence, including official
            warnings, for this public entrance. Providers may receive its
            coordinates, never my search center.
          </label>
          <button
            disabled={!consented || loading || !!detail}
            onClick={() => load(current)}
          >
            {loading
              ? "Loading…"
              : detail
                ? "Evidence loaded for this plan"
                : "Load entrance evidence"}
          </button>
          {detail && (
            <>
              <p>
                {excluded(current) ? "Excluded" : "Insufficient evidence"} ·{" "}
                {detail.opportunity.explanation}
              </p>
              <p>
                Habitat association: {detail.habitat.association.status}; exact
                entrance habitat: {detail.habitat.locationEvidence.status}.
              </p>
              <RefreshCoastalWarnings
                key={`${current.id}:${plan!.date}:${current.coordinates.latitude}:${current.coordinates.longitude}`}
                initial={detail.warnings}
                id={current.id}
                coordinates={current.coordinates}
                date={plan!.date}
                consented={consented}
              />
              <details>
                <summary>Sources and dated entrance conditions</summary>
                <p>
                  Historical mapped context: {detail.shoreline.status}. Nearest
                  returned lines are not verified current substrate.
                </p>
                {detail.shoreline.features.slice(0, 3).map((f) => (
                  <p key={f.id}>
                    Segment {f.id} · {f.shoreCode} ·{" "}
                    {f.sourceYear ?? "unknown year"} ·{" "}
                    {Math.round(f.distanceMeters)} m from entrance
                  </p>
                ))}
                <p>
                  Source: NOAA ESI / CDFW{" "}
                  <a href="https://filelib.wildlife.ca.gov/public/BDB/GIS/BIOS/metadata/ds3115.html">
                    ds3115
                  </a>
                  ,{" "}
                  <a href="https://creativecommons.org/licenses/by/4.0/">
                    CC BY 4.0
                  </a>
                  . Distances computed by HoneyHole.
                </p>
                <HabitatPanel assessment={detail.habitat} />
                <SelectedConditionsPanel detail={detail} />
                <p>{detail.regulations.reason}</p>
                {detail.regulations.findings.map((f) => (
                  <p key={f.rule.id}>
                    <a href={f.rule.sourceUrl}>{f.rule.id}</a>: {f.reason}
                  </p>
                ))}
              </details>
            </>
          )}
        </section>
      )}
      <p>
        California State Parks — coastal State Beach entry records only.
        Personal-use development; commercial use requires CSP approval. No catch
        predictions or alerts.
      </p>
    </>
  );
}
