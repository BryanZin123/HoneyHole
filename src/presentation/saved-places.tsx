"use client";
import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { SavedPin, PinInput, Preferences } from "../domain/user-data";
const Map = dynamic(() => import("./explore-map").then((m) => m.ExploreMap), {
  ssr: false,
  loading: () => <p>Loading map…</p>,
});
const empty: PinInput = {
  name: "",
  latitude: 0,
  longitude: 0,
  notes: "",
  privacy: "PRIVATE",
  sharingEligible: false,
  sourceId: null,
};
async function readSavedData(signal?: AbortSignal): Promise<{
  pins: SavedPin[];
  preferences: Preferences | null;
  unauthorized: boolean;
}> {
  const [a, b] = await Promise.all([
    fetch("/api/v1/pins", { cache: "no-store", signal }),
    fetch("/api/v1/preferences", { cache: "no-store", signal }),
  ]);
  if (a.status === 401 || b.status === 401)
    return { pins: [], preferences: null, unauthorized: true };
  if (!a.ok || !b.ok) throw Error("Unable to load saved data.");
  return {
    pins: await a.json(),
    preferences: await b.json(),
    unauthorized: false,
  };
}
export function SavedPlaces() {
  const [pins, setPins] = useState<SavedPin[]>([]),
    [preferences, setPreferences] = useState<Preferences | null>(null),
    [loading, setLoading] = useState(true),
    [unauthorized, setUnauthorized] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [selected, setSelected] = useState<string | null>(null),
    [editing, setEditing] = useState<SavedPin | null>(null),
    [showMap, setShowMap] = useState(false),
    [deleting, setDeleting] = useState<string | null>(null);
  const applyData = useCallback(
    (data: {
      pins: SavedPin[];
      preferences: Preferences | null;
      unauthorized: boolean;
    }) => {
      setPins(data.pins);
      setPreferences(data.preferences);
      setUnauthorized(data.unauthorized);
    },
    [],
  );
  async function load() {
    applyData(await readSavedData());
  }
  useEffect(() => {
    const controller = new AbortController();
    readSavedData(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) applyData(data);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError(
            "Unable to load saved data. Check account storage and try again.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [applyData]);
  async function mutate(url: string, method: string, value?: unknown) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        ...(value === undefined ? {} : { body: JSON.stringify(value) }),
      });
      if (r.status === 401) {
        setUnauthorized(true);
        setPins([]);
        setPreferences(null);
        return false;
      }
      if (!r.ok) {
        const b = await r.json();
        throw Error(b.error ?? "Could not save changes.");
      }
      await load();
      setMessage("Changes saved.");
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function savePin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      f = new FormData(form);
    const p: PinInput = {
      ...empty,
      name: String(f.get("name")),
      notes: String(f.get("notes")),
      latitude: Number(f.get("latitude")),
      longitude: Number(f.get("longitude")),
      sourceId: editing?.sourceId ?? null,
      sharingEligible: f.get("sharingEligible") === "on",
    };
    if (
      await mutate(
        editing ? `/api/v1/pins/${editing.id}` : "/api/v1/pins",
        editing ? "PATCH" : "POST",
        p,
      )
    ) {
      setEditing(null);
      form.reset();
    }
  }
  async function savePreferences(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!preferences) return;
    const f = new FormData(e.currentTarget),
      list = (key: string) =>
        String(f.get(key))
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean);
    await mutate("/api/v1/preferences", "PUT", {
      ...preferences,
      regions: list("regions"),
      species: list("species"),
      units: f.get("units"),
      timeZone: f.get("timeZone"),
      alertOptIn: f.get("alertOptIn") === "on",
      leadMinutes: Number(f.get("leadMinutes")),
      quietHours:
        f.get("quietEnabled") === "on"
          ? { start: f.get("quietStart"), end: f.get("quietEnd") }
          : null,
    });
  }
  if (loading) return <p>Loading your private Honey Holes…</p>;
  if (unauthorized)
    return (
      <p>
        Sign in to view your private Honey Holes.{" "}
        <Link href="/account">Sign in or register</Link>
      </p>
    );
  return (
    <div>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      <p>
        <Link href="/account">Account and sign out</Link> ·{" "}
        <Link href="/explore">Explore shoreline locations</Link>
      </p>
      <p>
        All saved pins are private. Sharing eligibility does not publish
        coordinates or notes.
      </p>
      <div className="saved-layout">
        <section>
          <h2>Your saved locations</h2>
          {!pins.length && (
            <p>
              No saved Honey Holes yet. Save one from Explore or create a custom
              pin below.
            </p>
          )}
          <ul className="location-list">
            {pins.map((p) => (
              <li key={p.id}>
                <button
                  aria-pressed={selected === p.id}
                  onClick={() => setSelected(p.id)}
                >
                  {p.name}
                </button>
                <p>
                  {p.latitude}, {p.longitude} · PRIVATE
                </p>
                <p>
                  {p.sourceId
                    ? "Source: park entrance reference"
                    : "Source: user-entered coordinates; access and legality unverified"}
                </p>
                <p>{p.notes}</p>
                <p>
                  {p.sharingEligible
                    ? "Eligible for a future sharing choice; not published."
                    : "Sharing disabled."}
                </p>
                <button disabled={busy} onClick={() => setEditing(p)}>
                  Edit {p.name}
                </button>{" "}
                <button disabled={busy} onClick={() => setDeleting(p.id)}>
                  Delete {p.name}
                </button>{" "}
                {preferences && (
                  <button
                    disabled={busy}
                    onClick={() =>
                      mutate("/api/v1/preferences", "PUT", {
                        ...preferences,
                        favoriteIds: preferences.favoriteIds.includes(p.id)
                          ? preferences.favoriteIds.filter((id) => id !== p.id)
                          : [...preferences.favoriteIds, p.id],
                      })
                    }
                  >
                    {preferences.favoriteIds.includes(p.id)
                      ? "Unfavorite"
                      : "Favorite"}{" "}
                    {p.name}
                  </button>
                )}
                {deleting === p.id && (
                  <div>
                    <p>Delete this saved pin?</p>
                    <button
                      disabled={busy}
                      onClick={async () => {
                        if (await mutate(`/api/v1/pins/${p.id}`, "DELETE")) {
                          setDeleting(null);
                          if (editing?.id === p.id) setEditing(null);
                        }
                      }}
                    >
                      Confirm delete
                    </button>
                    <button onClick={() => setDeleting(null)}>Keep pin</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <h2>{editing ? "Edit Honey Hole" : "Create custom pin"}</h2>
          <form
            key={editing?.id ?? "new"}
            className="account-form"
            onSubmit={savePin}
          >
            <label>
              Location name
              <input
                name="name"
                required
                maxLength={100}
                defaultValue={editing?.name ?? ""}
              />
            </label>
            <label>
              Latitude
              <input
                name="latitude"
                required
                type="number"
                step="any"
                min={-90}
                max={90}
                readOnly={!!editing?.sourceId}
                defaultValue={editing?.latitude ?? ""}
              />
            </label>
            <label>
              Longitude
              <input
                name="longitude"
                required
                type="number"
                step="any"
                min={-180}
                max={180}
                readOnly={!!editing?.sourceId}
                defaultValue={editing?.longitude ?? ""}
              />
            </label>
            <label>
              Private notes
              <textarea
                name="notes"
                maxLength={2000}
                defaultValue={editing?.notes ?? ""}
              />
            </label>
            <label>
              <input
                name="sharingEligible"
                type="checkbox"
                defaultChecked={editing?.sharingEligible ?? false}
              />{" "}
              Allow eligibility for future sharing (does not publish)
            </label>
            <button disabled={busy}>
              {editing ? "Save pin changes" : "Create private pin"}
            </button>
            {editing && (
              <button type="button" onClick={() => setEditing(null)}>
                Cancel edit
              </button>
            )}
          </form>
        </section>
        <section>
          <h2>Saved map</h2>
          <p>
            Loading the map requests OpenStreetMap tiles for the viewed area.
            Pin names and notes are not sent to the tile provider.
          </p>
          <button onClick={() => setShowMap((v) => !v)}>
            {showMap ? "Hide map" : "Show saved map"}
          </button>
          {showMap && (
            <Map
              locations={pins.map((p) => ({
                id: p.id,
                name: p.name,
                coordinates: { latitude: p.latitude, longitude: p.longitude },
              }))}
              selectedId={selected}
              onSelect={setSelected}
              label="Your private saved locations"
            />
          )}
          {preferences && (
            <>
              <h2>Your preferences</h2>
              <form
                key={JSON.stringify(preferences)}
                className="account-form"
                onSubmit={savePreferences}
              >
                <label>
                  Preferred regions (comma separated)
                  <input
                    name="regions"
                    defaultValue={preferences.regions.join(", ")}
                  />
                </label>
                <label>
                  Target species (comma separated)
                  <input
                    name="species"
                    defaultValue={preferences.species.join(", ")}
                  />
                </label>
                <label>
                  Measurement units
                  <select name="units" defaultValue={preferences.units}>
                    <option value="metric">Metric</option>
                    <option value="imperial">Imperial</option>
                  </select>
                </label>
                <label>
                  Time zone
                  <input
                    name="timeZone"
                    required
                    defaultValue={preferences.timeZone}
                  />
                </label>
                <label>
                  <input
                    name="alertOptIn"
                    type="checkbox"
                    defaultChecked={preferences.alertOptIn}
                  />{" "}
                  Opt in to future fishing alerts
                </label>
                <p>
                  Notification delivery is not active. This saves your
                  preference only.
                </p>
                <label>
                  Advance notice (minutes)
                  <input
                    name="leadMinutes"
                    type="number"
                    min={0}
                    max={10080}
                    required
                    defaultValue={preferences.leadMinutes}
                  />
                </label>
                <label>
                  <input
                    name="quietEnabled"
                    type="checkbox"
                    defaultChecked={!!preferences.quietHours}
                  />{" "}
                  Enable quiet hours in your time zone
                </label>
                <label>
                  Quiet hours start
                  <input
                    name="quietStart"
                    type="time"
                    defaultValue={preferences.quietHours?.start ?? "22:00"}
                  />
                </label>
                <label>
                  Quiet hours end
                  <input
                    name="quietEnd"
                    type="time"
                    defaultValue={preferences.quietHours?.end ?? "07:00"}
                  />
                </label>
                <button disabled={busy}>Save preferences</button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
