"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
export function AccountPanel() {
  const [user, setUser] = useState<{ name: string; email: string } | null>(
      null,
    ),
    [loading, setLoading] = useState(true),
    [mode, setMode] = useState("sign-in"),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/v1/me", { signal: controller.signal, cache: "no-store" })
      .then(async (r) => {
        if (r.ok) setUser((await r.json()).user);
        else if (r.status !== 401)
          setMessage("Accounts are unavailable. Run local storage setup.");
      })
      .catch(() => {
        if (!controller.signal.aborted) setMessage("Unable to load account.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(e.currentTarget);
    const input = {
      email: form.get("email"),
      password: form.get("password"),
      ...(mode === "sign-up" ? { name: form.get("name") } : {}),
    };
    try {
      const r = await fetch(`/api/auth/${mode}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!r.ok)
        throw Error(
          "Unable to sign in or register. Check your details, or try again later.",
        );
      const me = await fetch("/api/v1/me", { cache: "no-store" });
      if (!me.ok) throw Error("Session could not be loaded.");
      setUser((await me.json()).user);
      setMessage("Signed in. Your Honey Holes are private by default.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    try {
      const r = await fetch("/api/auth/sign-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!r.ok) throw Error();
      setUser(null);
      setMessage("Signed out.");
    } catch {
      setMessage("Unable to sign out. Try again.");
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <p>Loading account…</p>;
  return (
    <section>
      {user ? (
        <>
          <p>
            Signed in as {user.name} ({user.email}).
          </p>
          <p>
            <Link href="/explore">Explore shoreline locations</Link> ·{" "}
            <Link href="/saved">Your saved Honey Holes</Link>
          </p>
          <button disabled={busy} onClick={logout}>
            Sign out
          </button>
        </>
      ) : (
        <>
          <div className="account-tabs">
            <button
              onClick={() => setMode("sign-in")}
              aria-pressed={mode === "sign-in"}
            >
              Sign in
            </button>
            <button
              onClick={() => setMode("sign-up")}
              aria-pressed={mode === "sign-up"}
            >
              Register
            </button>
          </div>
          <form className="account-form" onSubmit={submit}>
            {mode === "sign-up" && (
              <label>
                Display name
                <input
                  name="name"
                  required
                  maxLength={100}
                  autoComplete="name"
                />
              </label>
            )}
            <label>
              Email
              <input
                name="email"
                type="email"
                required
                maxLength={254}
                autoComplete="email"
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                required
                minLength={12}
                maxLength={128}
                autoComplete={
                  mode === "sign-up" ? "new-password" : "current-password"
                }
              />
            </label>
            <button disabled={busy}>
              {busy
                ? "Working…"
                : mode === "sign-up"
                  ? "Create account"
                  : "Sign in securely"}
            </button>
          </form>
        </>
      )}
      {message && <p role="status">{message}</p>}
      <p>
        Email verification and password recovery are unavailable in this local
        version. No recovery email service is configured.
      </p>
    </section>
  );
}
