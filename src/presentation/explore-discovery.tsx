"use client";
import { MappedContextPanel } from "./mapped-context-panel";
import { HabitatPanel } from "./habitat-panel";
import { JurisdictionPanel } from "./jurisdiction-panel";
import dynamic from "next/dynamic";
import { useState, useEffect, useCallback } from "react";
import type { DiscoveryResult, ShoreLocation } from "../domain/discovery";
import type { getLocationDetail } from "../application/get-location-detail";
import { coastalCounties } from "../config/coastal-counties";
import { SaveLocation } from "./save-location";
import { SelectedConditionsPanel } from "./selected-conditions-panel";
const Map = dynamic(() => import("./explore-map").then((m) => m.ExploreMap), {
  ssr: false,
  loading: () => <p>Loading interactive map…</p>,
});
type Detail = Awaited<ReturnType<typeof getLocationDetail>>;
export function ExploreDiscovery() {
  const [locations, setLocations] = useState<ShoreLocation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [loading, setLoading] = useState(false);
  const [county, setCounty] = useState("San Mateo");
  const [mode, setMode] = useState("county");
  const [method, setMethod] = useState("shore-angling");
  const [species, setSpecies] = useState("");
  const [date, setDate] = useState(() =>
    new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" }),
  );
  const select = useCallback(
    (id: string) => {
      if (id !== selectedId) {
        setDetail(null);
        setDetailError("");
        setSelectedId(id);
      }
    },
    [selectedId],
  );
  async function search(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSelectedId(null);
    setLocations([]);
    const form = new FormData(event.currentTarget);
    const query =
      mode === "county"
        ? new URLSearchParams({ county })
        : new URLSearchParams({
            latitude: String(form.get("latitude")),
            longitude: String(form.get("longitude")),
            radiusKm: String(form.get("radiusKm")),
          });
    try {
      const response = await fetch("/api/v1/locations?" + query, {
        signal: AbortSignal.timeout(15000),
      });
      const result: DiscoveryResult & { error?: string } =
        await response.json();
      if (!response.ok) throw Error(result.error ?? result.reason);
      setLocations(result.locations);
      if (!result.locations.length)
        setError(
          "No State Beach entry points matched this search. This catalog is not comprehensive.",
        );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Discovery unavailable.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (!selectedId) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      setDetailError(
        "Location evidence timed out. Access and permission remain unverified.",
      );
      controller.abort();
    }, 60000);
    fetch(
      `/api/v1/locations/${selectedId}?` +
        new URLSearchParams({ species, date, method }),
      { signal: controller.signal },
    )
      .then(async (response) => {
        if (!response.ok)
          throw Error("Location evidence could not be retrieved.");
        return response.json();
      })
      .then((result) => {
        if (!controller.signal.aborted) setDetail(result);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setDetailError(
            "Location evidence unavailable. Access and fishing permission remain unverified.",
          );
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [selectedId, species, date, method]);
  return (
    <div>
      <p>
        Discover State Beach park entry points. Pins identify source reference
        locations, not verified fishing positions or safe routes.
      </p>
      <form onSubmit={search} className="coastal-form">
        <label>
          Search by
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="county">Coastal county</option>
            <option value="coordinate">Coordinates and distance</option>
          </select>
        </label>
        {mode === "county" ? (
          <label>
            Coastal county
            <select value={county} onChange={(e) => setCounty(e.target.value)}>
              {coastalCounties.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        ) : (
          <>
            <label>
              Latitude
              <input
                name="latitude"
                type="number"
                min="32"
                max="42.1"
                step="any"
                required
              />
            </label>
            <label>
              Longitude
              <input
                name="longitude"
                type="number"
                min="-125"
                max="-114"
                step="any"
                required
              />
            </label>
            <label>
              Radius (km)
              <input
                name="radiusKm"
                type="number"
                min="1"
                max="50"
                defaultValue="25"
                required
              />
            </label>
          </>
        )}
        <button className="button" disabled={loading}>
          {loading ? "Searching…" : "Find shoreline locations"}
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
      <div className="discovery-layout">
        <div>
          <h2>Shoreline locations ({locations.length})</h2>
          <ul className="location-list">
            {locations.map((l) => (
              <li key={l.id}>
                <button
                  aria-pressed={selectedId === l.id}
                  onClick={() => select(l.id)}
                >
                  {l.name}
                </button>
                <small>{l.county} · Beach entry · Access unknown</small>
              </li>
            ))}
          </ul>
        </div>
        <Map locations={locations} selectedId={selectedId} onSelect={select} />
      </div>
      <p className="source-note">
        Source:{" "}
        <a
          href="https://www.parks.ca.gov/?page_id=29682"
          target="_blank"
          rel="noreferrer"
        >
          California State Parks
        </a>
        . Personal-use development; commercial use requires CSP approval.
        Coverage is limited to State Beach entry records in coastal counties.
        Check the park website for current access and closures.
      </p>
      {selectedId && (
        <section className="location-detail" aria-live="polite">
          <h2>Selected location</h2>
          <div className="coastal-form">
            <label>
              Target species
              <select
                value={species}
                onChange={(e) => {
                  setDetail(null);
                  setDetailError("");
                  setSpecies(e.target.value);
                }}
              >
                <option value="">Not selected</option>
                <option>California grunion</option>
                <option>redtail surfperch</option>
                <option>barred surfperch</option>
                <option>Surfperch</option>
                <option>California halibut</option>
                <option>Northern anchovy</option>
              </select>
            </label>
            <label>
              Fishing method
              <select
                value={method}
                onChange={(e) => {
                  setDetail(null);
                  setDetailError("");
                  setMethod(e.target.value);
                }}
              >
                <option value="shore-angling">Shore angling</option>
                <option value="hand-gathering">Hand gathering</option>
              </select>
            </label>
            <label>
              Fishing date
              <input
                type="date"
                value={date}
                onChange={(e) => {
                  setDetail(null);
                  setDetailError("");
                  setDate(e.target.value);
                }}
              />
            </label>
          </div>
          {!detail && !detailError && <p>Loading location evidence…</p>}
          {detailError && <p role="alert">{detailError}</p>}
          {detail && (
            <>
              <h3>{detail.location.name}</h3>
              <SaveLocation
                key={detail.location.id}
                location={detail.location}
              />
              <p>
                {detail.location.coordinates.latitude},{" "}
                {detail.location.coordinates.longitude} · State Beach entry
              </p>
              <p>
                Source retrieved {detail.location.retrievedAt}; dataset updated{" "}
                {detail.location.datasetUpdatedAt ?? "unknown"}. Dataset updates
                do not verify current access.
              </p>
              <p>
                <a
                  href={detail.location.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Original geographic source
                </a>
                {detail.location.parkUrl && (
                  <>
                    {" "}
                    ·{" "}
                    <a
                      href={detail.location.parkUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Official park information
                    </a>
                  </>
                )}
              </p>
              <h3>
                Access evidence:{" "}
                {detail.access.access.status === "verified-public"
                  ? "Public in CPAD records"
                  : detail.access.access.status}
              </h3>
              <p>
                Regulatory assessment:{" "}
                <strong>{detail.regulations.status}</strong>.{" "}
                {detail.regulations.reason}
              </p>
              <p>
                Recommendation eligibility:{" "}
                <strong>{detail.opportunity.eligibility}</strong>.{" "}
                {detail.opportunity.explanation}
              </p>
              <p>
                Species suitability and environmental safety have not been
                assessed.
              </p>
              <ul>
                {detail.access.access.evidence.records.map((r) => (
                  <li key={r.id}>
                    {r.name}: {r.sourceAccessValue ?? "unknown"}
                  </li>
                ))}
              </ul>
              <a
                href={detail.access.access.evidence.source.url}
                target="_blank"
                rel="noreferrer"
              >
                CPAD access source
              </a>
              <h3>
                Advisory mapped marine protected areas ·{" "}
                {detail.access.protectedAreas.status}
              </h3>
              <p>
                {detail.access.protectedAreas.records
                  .map((r) => r.name)
                  .join(", ") ||
                  "No mapped match or unavailable evidence; this is not legal clearance."}
              </p>
              <a
                href={detail.access.protectedAreas.source.url}
                target="_blank"
                rel="noreferrer"
              >
                CDFW boundary source
              </a>
              {!species && (
                <p>
                  Select a target species for a species-specific assessment.
                </p>
              )}
              <h3>Date-specific regulatory evidence</h3>
              <p>
                Activity: {detail.activity.species || "species not selected"},{" "}
                {detail.activity.method}, {detail.activity.date}. Evidence
                checked {detail.regulations.checkedOn}. Missing or unresolved:{" "}
                {detail.regulations.missing.join(", ") || "none"}.
              </p>
              {detail.regulations.findings.length === 0 && (
                <p>
                  No reviewed effective-dated rules match this species and
                  method.
                </p>
              )}
              <ul>
                {detail.regulations.findings.map((f) => (
                  <li key={f.rule.id}>
                    <strong>{f.status}</strong>: {f.rule.summary} {f.reason}
                    <p>
                      Authority: {f.rule.authority}. Legal effect:{" "}
                      {f.rule.effectiveFrom ?? "unknown"} to{" "}
                      {f.rule.effectiveTo ??
                        (f.rule.expirationKnown
                          ? "no stated expiry"
                          : "unknown")}
                      . Evidence coverage: {f.rule.coverageFrom} to{" "}
                      {f.rule.coverageThrough}; last verified{" "}
                      {f.rule.verifiedOn}; review due {f.rule.reviewDue}.
                    </p>
                    <a href={f.rule.sourceUrl} target="_blank" rel="noreferrer">
                      {f.rule.id} authoritative source
                    </a>
                  </li>
                ))}
              </ul>
              <p>
                Verified rule coverage remains limited to the existing
                California grunion slice. Redtail and barred surfperch records
                are research evidence only: legal effective dates and exact
                water boundaries remain unresolved. Hand-only gear, size,
                licensing, local rules, MPA boundaries and emergency
                restrictions are not comprehensively verified.
              </p>
              <HabitatPanel assessment={detail.habitat} />
              <MappedContextPanel context={detail.mappedContext} />
              <JurisdictionPanel assessment={detail.jurisdiction} />
              <h3>Regulatory questions</h3>
              <ul>
                {detail.regulations.questions.map((q) => (
                  <li key={q.question}>
                    {q.question}: {q.status}
                  </li>
                ))}
              </ul>
              <h3>Regulatory source records</h3>
              <ul>
                {detail.regulations.records.map((r) => (
                  <li key={r.id}>
                    <a href={r.sourceUrl} target="_blank" rel="noreferrer">
                      {r.id}
                    </a>
                    : {r.summary} Reviewed {r.reviewedAt}; effective dates{" "}
                    {r.effectiveFrom ?? "unknown"} –{" "}
                    {r.effectiveTo ?? "unknown"}.
                  </li>
                ))}
              </ul>
              <SelectedConditionsPanel detail={detail} />
            </>
          )}
        </section>
      )}
    </div>
  );
}
