"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Coordinates } from "../domain/geography";
import type { getFishingPoint } from "../application/get-fishing-point";
import { HabitatPanel } from "./habitat-panel";
import { SelectedConditionsPanel } from "./selected-conditions-panel";
type Result = Awaited<ReturnType<typeof getFishingPoint>>;
export function FishingPointPanel({ point }: { point: Coordinates }) {
  const [date, setDate] = useState(() =>
    new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" }),
  );
  const [consent, setConsent] = useState(false),
    [result, setResult] = useState<Result | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [saving, setSaving] = useState(false),
    [saved, setSaved] = useState(false);
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);
  async function load(environmentConsent: boolean) {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/v1/fishing-point-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coordinates: point, date, environmentConsent }),
        signal: controller.signal,
        cache: "no-store",
      });
      if (!response.ok) throw Error("Unavailable");
      const value: Result = await response.json();
      if (
        value.point.coordinates.latitude !== point.latitude ||
        value.point.coordinates.longitude !== point.longitude ||
        value.date !== date
      )
        throw Error("Identity mismatch");
      if (!controller.signal.aborted) setResult(value);
    } catch {
      if (!controller.signal.aborted)
        setError(
          "Fishing-point evidence is unavailable. No permission or recommendation is established.",
        );
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  async function save() {
    if (saving || saved) return;
    setSaving(true);
    setMessage("");
    try {
      const r = await fetch("/api/v1/pins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "My selected fishing point",
          ...point,
          sourceId: null,
          privacy: "PRIVATE",
          sharingEligible: false,
          notes:
            "User-selected fishing point; access, legality and habitat unverified.",
        }),
      });
      if (r.ok) setSaved(true);
      setMessage(
        r.ok
          ? "Fishing point saved privately."
          : r.status === 401
            ? "Sign in to save this fishing point."
            : "Could not save this point; it may already be saved.",
      );
    } catch {
      setMessage("Saving is unavailable.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <section aria-label="Your fishing point">
      <h2>Your selected fishing point</h2>
      <p>
        Source: your intentional map selection, not a State Parks record. No
        snapping applied.
      </p>
      <output aria-label="Fishing-point coordinates">
        {point.latitude}, {point.longitude}
      </output>
      <p>
        Public access: UNVERIFIED. Fishing legality: UNVERIFIED. Nearby entrance
        findings do not apply to this coordinate. Recommendation: unavailable;
        notifications disabled.
      </p>
      <label>
        Fishing-point date
        <input
          type="date"
          value={date}
          onChange={(e) => {
            active.current?.abort();
            setBusy(false);
            setDate(e.target.value);
            setResult(null);
          }}
        />
      </label>
      <p>
        Loading shoreline context sends this coordinate only to HoneyHole. CDFW
        receives a fixed public pilot envelope, not your point. Nothing is saved
        until you choose Save.
      </p>
      <button disabled={busy || !date} onClick={() => load(false)}>
        Load mapped shoreline context
      </button>
      <label>
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => {
            setConsent(e.target.checked);
            if (!e.target.checked) {
              active.current?.abort();
              setBusy(false);
              setResult(null);
            }
          }}
        />
        I consent to sending this fishing coordinate to NWS for weather and
        requesting NOAA station references for this point.
      </label>
      <button disabled={!consent || busy || !date} onClick={() => load(true)}>
        Load conditions for this point
      </button>
      <button disabled={saving || saved} onClick={save}>
        {saved
          ? "Fishing point saved"
          : saving
            ? "Saving fishing point…"
            : "Save fishing point privately"}
      </button>
      <Link href="/saved">View private saved points</Link> ·{" "}
      <Link href="/account" target="_blank" rel="noopener noreferrer">
        Sign in in another tab
      </Link>
      <p>
        Keep this tab open while signing in, then return here to save the same
        point. Unsaved points are not retained if you close or reload this tab.
        You can decline environmental sharing and still view shoreline context
        or save privately.
      </p>
      {busy && <p role="status">Loading point evidence…</p>}
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      {result && (
        <>
          <section aria-label="Mapped shoreline types">
            <h3>
              Historical mapped shoreline types · {result.shoreline.status}
            </h3>
            <p>
              Point classification: UNVERIFIED. These are mapped segments in the
              pilot area, ordered by computed distance, not classifications
              assigned to your point. No nearest-distance threshold establishes
              applicability.
            </p>
            <p>
              Dataset: CDFW ds3115, NOAA ESI. Published 2023-07-06; original
              source years appear per segment. Retrieved{" "}
              {result.shoreline.retrievedAt ?? "unavailable"}. Source scale
              varies; NOAA describes a 50-foot minimum mapping unit, not
              positional accuracy. Positional uncertainty and current conditions
              are unknown.
            </p>
            <p>
              Historical mapped shorelines are not current surf zones or safe
              routes. Do not use ESI for navigation. No fish presence, access,
              fishing permission or catch probability is established.
            </p>
            <p>
              <a
                href="https://filelib.wildlife.ca.gov/public/BDB/GIS/BIOS/metadata/ds3115.html"
                target="_blank"
                rel="noreferrer"
              >
                CDFW ds3115 metadata and attribution
              </a>{" "}
              ·{" "}
              <a
                href="https://creativecommons.org/licenses/by/4.0/"
                target="_blank"
                rel="noreferrer"
              >
                CC BY 4.0
              </a>{" "}
              ·{" "}
              <a
                href="https://shoreline.noaa.gov/esi.html"
                target="_blank"
                rel="noreferrer"
              >
                NOAA mapping limitations
              </a>
            </p>
            <p>
              NOAA and CDFW; BIOS Shoreline Types — R7 [ds3115]. HoneyHole
              calculates distances and groups codes for display; original codes
              and descriptions are retained. No endorsement or data accuracy
              warranty.
            </p>
            {result.shoreline.status === "outside-pilot" && (
              <p>
                Outside the Half Moon Bay-area pilot envelope; no dataset query
                was made.
              </p>
            )}
            {result.shoreline.status === "unavailable" && (
              <p>
                Shoreline features could not be retrieved completely. No
                substitute classifications supplied.
              </p>
            )}
            {result.shoreline.status === "empty" && (
              <p>
                No mapped features were returned. This does not establish
                absence of a shoreline.
              </p>
            )}
            {result.shoreline.conflictingGeometry && (
              <p>
                Overlapping source geometry carries different classifications;
                no classification takes precedence.
              </p>
            )}
            <p>
              {result.shoreline.features.length} mapped features returned.
              Multiple and overlapping segments remain separate.
            </p>
            <ol>
              {result.shoreline.features.slice(0, 8).map((f) => (
                <li key={f.id}>
                  <strong>
                    Feature {f.id} · {f.shoreCode || "unresolved code"}
                  </strong>{" "}
                  · approximately {Math.round(f.distanceMeters)} m from the
                  mapped line. Source: {f.source ?? "unknown"}; year:{" "}
                  {f.sourceYear ?? "unknown"}; feature type:{" "}
                  {f.line || "unknown"}.
                  <p>{f.description || "Source description missing"}</p>
                  <p>
                    Landward → seaward:{" "}
                    {f.codes
                      .map((c) => `${c.code || "missing"} (${c.category})`)
                      .join(" → ")}
                  </p>
                  <p>
                    Original types:{" "}
                    {f.orderedSourceTypes
                      .map((t) => `${t.code}: ${t.name}`)
                      .join(" → ") || "missing"}
                  </p>
                  {f.codeConflict && (
                    <p>
                      Source code fields disagree; interpretation unresolved.
                    </p>
                  )}
                  <a
                    href={`https://services2.arcgis.com/Uq9r85Potqm3MfRV/arcgis/rest/services/biosds3115_fnu/FeatureServer/0/${f.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Source feature {f.id}
                  </a>
                </li>
              ))}
            </ol>
            {result.shoreline.features.length > 8 && (
              <p>
                Showing the first eight by mapped distance within the fixed
                pilot envelope; this is not a fishing-location ranking or a
                complete California search.
              </p>
            )}
          </section>
          <HabitatPanel assessment={result.habitat} />
          {consent && result.environment ? (
            <SelectedConditionsPanel
              detail={{
                ...result.environment,
                location: { coordinates: point },
                activity: { date: result.date },
              }}
            />
          ) : (
            <p>
              Fishing-point environmental conditions have not been loaded.
              Access-point conditions are separate.
            </p>
          )}
        </>
      )}
    </section>
  );
}
