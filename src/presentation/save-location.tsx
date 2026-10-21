"use client";
import { useState } from "react";
import Link from "next/link";
import type { ShoreLocation } from "../domain/discovery";
export function SaveLocation({ location }: { location: ShoreLocation }) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [signIn, setSignIn] = useState(false);
  async function save() {
    setBusy(true);
    setMessage("");
    setSignIn(false);
    try {
      const r = await fetch("/api/v1/pins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: location.name,
          ...location.coordinates,
          sourceId: location.id,
        }),
      });
      if (r.status === 401) {
        setSignIn(true);
        setMessage("Sign in to save this Honey Hole.");
        return;
      }
      const b = await r.json();
      if (!r.ok) throw Error(b.error ?? "Unable to save.");
      setMessage("Saved privately. View it in Saved places.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <button disabled={busy} onClick={save}>
        {busy ? "Saving…" : "Save private Honey Hole"}
      </button>
      {message && <p role="status">{message}</p>}
      {signIn ? (
        <Link href="/account">Sign in or register</Link>
      ) : (
        <Link href="/saved">Open Saved places</Link>
      )}
    </div>
  );
}
