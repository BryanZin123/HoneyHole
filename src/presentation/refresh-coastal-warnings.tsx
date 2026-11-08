"use client";
import { useEffect, useRef, useState } from "react";
import type { Coordinates } from "../domain/geography";
import type { WarningEvidence } from "../application/warning-provider";
import { CoastalWarnings } from "./coastal-warnings";
const time = (s: string) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(s));
export function RefreshCoastalWarnings({
  initial,
  id,
  coordinates,
  date,
  consented,
}: {
  initial?: WarningEvidence;
  id: string;
  coordinates: Coordinates;
  date: string;
  consented: boolean;
}) {
  const [current, setCurrent] = useState(initial),
    [historical, setHistorical] = useState<WarningEvidence>(),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [changes, setChanges] = useState(""),
    [historicalOnly, setHistoricalOnly] = useState(
      initial?.refresh?.delivery === "reused",
    );
  const request = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      request.current?.abort();
    },
    [consented, id, date, coordinates.latitude, coordinates.longitude],
  );
  async function refresh() {
    if (!consented || busy) return;
    const allowed = current?.refresh?.nextAllowedAt;
    if (allowed && Date.now() < Date.parse(allowed)) {
      setHistoricalOnly(true);
      setMessage(
        `Unknown — refresh deferred. Request spacing: next permitted attempt ${time(allowed)} California time. No request was sent. Displayed evidence is the previous snapshot.`,
      );
      return;
    }
    request.current?.abort();
    const ctrl = new AbortController();
    request.current = ctrl;
    ctrl.signal.addEventListener("abort", () => setBusy(false), { once: true });
    setBusy(true);
    setMessage("");
    setChanges("");
    try {
      const response = await fetch(`/api/v1/locations/${id}/warnings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coordinates, date, consent: true }),
        signal: ctrl.signal,
        cache: "no-store",
      });
      const v = await response.json();
      if (!response.ok) throw Error(v.error ?? "Provider unavailable.");
      const next = v as WarningEvidence;
      if (
        !next.coordinates ||
        next.coordinates.latitude !== coordinates.latitude ||
        next.coordinates.longitude !== coordinates.longitude ||
        !["available", "empty", "unknown"].includes(next.status) ||
        !Array.isArray(next.alerts) ||
        !Number.isFinite(Date.parse(next.retrievedAt)) ||
        !next.refresh ||
        !["fresh", "reused", "deferred"].includes(next.refresh.delivery)
      )
        throw Error(
          "Returned warning identity or refresh metadata could not be verified.",
        );
      if (ctrl.signal.aborted) return;
      if (next.status === "unknown") {
        if (current && current.status !== "unknown") setHistorical(current);
        setCurrent(next);
        setMessage(`Unknown — refresh unsuccessful. ${next.reason}`);
        return;
      }
      const previous =
        current && current.status !== "unknown" ? current : historical;
      if (previous && next.refresh.delivery === "fresh") {
        const old = new Map(
            previous.alerts.map((a) => [a.id, JSON.stringify(a)]),
          ),
          fresh = new Map(next.alerts.map((a) => [a.id, JSON.stringify(a)]));
        const added = [...fresh.keys()].filter((id) => !old.has(id)),
          removed = [...old.keys()].filter((id) => !fresh.has(id)),
          updated = [...fresh.keys()].filter(
            (id) => old.has(id) && old.get(id) !== fresh.get(id),
          );
        setChanges(
          `Compared with snapshot ${time(previous.retrievedAt)}: added IDs ${added.join(", ") || "none"}; removed IDs ${removed.join(", ") || "none"}; updated IDs ${updated.join(", ") || "none"}. Removal means absent from this response, not proof a hazard ended.`,
        );
      }
      setHistoricalOnly(next.refresh.delivery === "reused");
      setHistorical(undefined);
      setCurrent(next);
      setMessage(
        next.refresh.delivery === "reused"
          ? "Previous snapshot reused — not newly checked."
          : "Warning refresh completed. Only official warnings were refreshed.",
      );
    } catch (e) {
      if (!ctrl.signal.aborted) {
        if (current && current.status !== "unknown") setHistorical(current);
        setCurrent(undefined);
        setMessage(
          `Unknown — refresh unsuccessful. ${e instanceof Error ? e.message : "Provider unavailable."}`,
        );
      }
    } finally {
      if (request.current === ctrl) setBusy(false);
    }
  }
  // Withdrawal aborts the request; a new click after renewed consent starts a new request.
  return (
    <div>
      <button disabled={!consented || busy} onClick={() => void refresh()}>
        Refresh official warnings
      </button>
      {!consented && (
        <p>
          Consent to public-entrance evidence is required to refresh warnings.
        </p>
      )}
      {busy && <p role="status">Refreshing official warnings…</p>}
      {message && <p role="status">{message}</p>}
      {current?.refresh && (
        <p>
          {current.refresh.delivery === "fresh"
            ? "New NWS retrieval attempt; see assessment outcome"
            : current.refresh.delivery === "reused"
              ? "Reused snapshot; retrieval timestamp unchanged"
              : "No new NWS query"}
          . Attempt: {time(current.refresh.attemptedAt)}. Next permitted
          attempt: {time(current.refresh.nextAllowedAt)} California time.
        </p>
      )}
      {changes && <p>{changes}</p>}
      <CoastalWarnings evidence={current} historical={historicalOnly} />
      {historical && (
        <aside aria-label="Historical warning snapshot">
          <h3>Historical evidence only</h3>
          <p>
            Previous snapshot from {time(historical.retrievedAt)} California
            time. Refresh failed; these products are not confirmed active now.
          </p>
          <details>
            <summary>View previous warning snapshot</summary>
            <CoastalWarnings evidence={historical} historical />
          </details>
        </aside>
      )}
    </div>
  );
}
