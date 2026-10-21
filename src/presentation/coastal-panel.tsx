"use client";
import { useState, type FormEvent } from "react";
import type { CoastalAssessment, EvidenceResult } from "../domain/coastal";
function Evidence({ title, data }: { title: string; data: EvidenceResult }) {
  return (
    <section className="notice">
      <h3>{title}</h3>
      <p>
        {data.status === "unavailable"
          ? data.reason
          : data.records.length
            ? "Mapped areas intersecting your coordinate:"
            : "No matching area returned. This is not clearance to enter or fish."}
      </p>
      <ul>
        {data.records.map((record) => (
          <li key={record.id}>
            {record.name} —{" "}
            {record.sourceAccessValue ??
              record.designation ??
              "Classification unknown"}
          </li>
        ))}
      </ul>
      <p>
        <a href={data.source.url} target="_blank" rel="noreferrer">
          {data.source.attribution}
        </a>
      </p>
      <p>
        {data.source.datasetVersion} · {data.source.license}
        <br />
        Retrieved {data.source.retrievedAt}
      </p>
    </section>
  );
}
export function CoastalPanel() {
  const [data, setData] = useState<CoastalAssessment | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function check(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setData(null);
    setError("");
    setBusy(true);
    const fields = new FormData(event.currentTarget);
    const params = new URLSearchParams({
      latitude: String(fields.get("latitude")),
      longitude: String(fields.get("longitude")),
    });
    try {
      const response = await fetch("/api/v1/coastal-access?" + params, {
        signal: AbortSignal.timeout(15000),
      });
      const result = await response.json();
      if (!response.ok)
        throw Error(result.error || "Unable to check this coordinate.");
      setData(result);
    } catch {
      setError(
        "Access information could not be retrieved. Check the coordinates and try again. Access remains unknown.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <h2>Check a coastal coordinate</h2>
      <p>
        This checks mapped land access and protected areas. It does not locate
        an entrance, verify shoreline terrain, or recommend a fishing spot.
      </p>
      <form onSubmit={check} className="coastal-form">
        <label>
          Latitude{" "}
          <input
            name="latitude"
            type="number"
            step="any"
            min="32"
            max="42.1"
            required
            placeholder="Decimal degrees"
            disabled={busy}
          />
        </label>
        <label>
          Longitude{" "}
          <input
            name="longitude"
            type="number"
            step="any"
            min="-125"
            max="-114"
            required
            placeholder="Decimal degrees"
            disabled={busy}
          />
        </label>
        <button className="button" disabled={busy}>
          {busy ? "Checking…" : "Check access"}
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
      {data && (
        <div aria-live="polite">
          <h2>
            Access:{" "}
            {data.access.status === "verified-public"
              ? "Public in source records"
              : data.access.status === "restricted"
                ? "Restricted"
                : "Unknown"}
          </h2>
          <p>
            Coordinate: {data.coordinates.latitude},{" "}
            {data.coordinates.longitude}
          </p>
          <p>
            Fishing permission: unknown. Temporary closures and species rules:
            unchecked. No legal fishing verification has been made.
          </p>
          <Evidence title="Land access evidence" data={data.access.evidence} />
          <Evidence
            title="Marine protected area evidence"
            data={data.protectedAreas}
          />
        </div>
      )}
    </div>
  );
}
