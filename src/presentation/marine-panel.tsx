"use client";
import { useState } from "react";
import type { ProductResult } from "../domain/marine";
import type { EnvironmentalConditions } from "../application/get-environmental-conditions";
import { AtmospherePanel } from "./atmosphere-panel";
import { WeatherPanel } from "./weather-panel";
function Product({
  title,
  product,
  timeZone,
}: {
  title: string;
  product: ProductResult;
  timeZone: string;
}) {
  return (
    <article className="card">
      <span className="number">{product.status.toUpperCase()}</span>
      <h2>{title}</h2>
      {product.reason && <p>{product.reason}</p>}
      <ul>
        {product.measurements.map((m, i) => (
          <li key={`${m.validAt}-${i}`}>
            <strong>
              {m.value.toFixed(1)} {m.unit}
            </strong>
            {m.phase ? ` · ${m.phase} tide` : ""}
            <br />
            <small>
              {m.kind} ·{" "}
              {new Date(m.validAt).toLocaleString("en-US", {
                timeZone,
                timeZoneName: "short",
              })}
              {m.datum ? ` · ${m.datum}` : ""}
            </small>
          </li>
        ))}
      </ul>
      <p>
        <a href={product.sourceUrl} target="_blank" rel="noreferrer">
          NOAA source ↗
        </a>
      </p>
      <small>
        Retrieved{" "}
        {new Date(product.retrievedAt).toLocaleString("en-US", {
          timeZone,
          timeZoneName: "short",
        })}
      </small>
    </article>
  );
}
export function MarinePanel() {
  const [station, setStation] = useState("9414290");
  const [data, setData] = useState<EnvironmentalConditions | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function load(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setData(null);
    try {
      const response = await fetch(
        `/api/v1/conditions?station=${encodeURIComponent(station)}`,
        { signal: AbortSignal.timeout(40000) },
      );
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error || "Conditions are unavailable.");
      setData(body);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Conditions are unavailable.",
      );
    } finally {
      setLoading(false);
    }
  }
  return (
    <>
      <form onSubmit={load}>
        <label htmlFor="station">California NOAA station ID</label>
        <div className="form-row">
          <input
            id="station"
            value={station}
            onChange={(e) => setStation(e.target.value)}
            required
            pattern="[0-9]{7}"
            maxLength={7}
            inputMode="numeric"
            aria-describedby="station-help"
            disabled={loading}
          />
          <button type="submit" disabled={loading}>
            {loading ? "Loading NOAA data…" : "Get conditions"}
          </button>
        </div>
        <p id="station-help">
          9414290 is NOAA’s San Francisco station.{" "}
          <a
            href="https://tidesandcurrents.noaa.gov/"
            target="_blank"
            rel="noreferrer"
          >
            Find a station at NOAA ↗
          </a>
        </p>
      </form>
      <div aria-live="polite" aria-busy={loading}>
        {error && <p role="alert">{error}</p>}
        {!loading && !data && !error && (
          <p>No data loaded. Request current station data to begin.</p>
        )}
        {data && (
          <>
            <h2>{data.station.name}</h2>
            <p>
              Station {data.station.id} · {data.station.latitude.toFixed(4)},{" "}
              {data.station.longitude.toFixed(4)}
            </p>
            <div className="cards marine">
              <Product
                title="Water temperature"
                timeZone={data.region.timeZone}
                product={data.waterTemperature}
              />
              <Product
                title="Next 24 hours: tides"
                timeZone={data.region.timeZone}
                product={data.tides}
              />
            </div>
            {data.atmosphere && (
              <AtmospherePanel
                data={data.atmosphere}
                timeZone={data.region.timeZone}
              />
            )}
            <WeatherPanel
              forecast={data.weather}
              timeZone={data.region.timeZone}
            />
          </>
        )}
      </div>
      <div className="notice">
        <p>
          Station data may differ from conditions at your fishing spot. Tide
          heights use MLLW; times use the configured regional time zone.
          Shoreline access, fishing regulations, and recommendation confidence
          are not assessed here. No fishing recommendation is issued.
        </p>
      </div>
    </>
  );
}
