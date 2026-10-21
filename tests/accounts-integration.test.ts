// @vitest-environment node
import { afterEach, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openAccounts } from "../src/infrastructure/accounts";
import { handleAccountRequest } from "../src/application/account-http";
const directories: string[] = [];
const stores: Awaited<ReturnType<typeof openAccounts>>[] = [];
afterEach(() => {
  for (const s of stores.splice(0)) s.db.close();
  for (const d of directories.splice(0))
    rmSync(d, { recursive: true, force: true });
});
async function setup() {
  const dir = mkdtempSync(join(tmpdir(), "hh-test-"));
  directories.push(dir);
  const file = join(dir, "test.sqlite");
  const store = await openAccounts({
    file,
    secret: "test-only-secret-with-at-least-32-characters-fixture",
    origin: "http://localhost:3000",
    migrate: true,
  });
  stores.push(store);
  return { store, file };
}
function request(
  path: string,
  method = "GET",
  body?: unknown,
  cookie = "",
  origin = "http://localhost:3000",
) {
  return new Request("http://localhost:3000" + path, {
    method,
    headers: { origin, "content-type": "application/json", cookie },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
async function register(
  store: Awaited<ReturnType<typeof openAccounts>>,
  email = "a@example.test",
) {
  const response = await handleAccountRequest(
    request("/api/auth/sign-up/email", "POST", {
      email,
      password: "fixture-password-9!",
      name: "Fixture",
    }),
    store,
  );
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(JSON.stringify(body)).not.toMatch(/token|password/);
  expect(response.headers.get("set-cookie")).toMatch(/HttpOnly/i);
  return response.headers.get("set-cookie")!.split(";")[0];
}
it("registers, authenticates, rejects invalid credentials and revokes logout", async () => {
  const { store } = await setup();
  const cookie = await register(store);
  expect(
    (
      await handleAccountRequest(
        request("/api/v1/me", "GET", undefined, cookie),
        store,
      )
    ).status,
  ).toBe(200);
  expect(
    (
      await handleAccountRequest(
        request("/api/auth/sign-in/email", "POST", {
          email: "a@example.test",
          password: "wrong-password",
        }),
        store,
      )
    ).status,
  ).toBe(401);
  expect(
    (
      await handleAccountRequest(
        request("/api/auth/sign-out", "POST", {}, cookie),
        store,
      )
    ).status,
  ).toBe(200);
  expect(
    (
      await handleAccountRequest(
        request("/api/v1/me", "GET", undefined, cookie),
        store,
      )
    ).status,
  ).toBe(401);
  const login = await handleAccountRequest(
    request("/api/auth/sign-in/email", "POST", {
      email: "a@example.test",
      password: "fixture-password-9!",
    }),
    store,
  );
  expect(login.status).toBe(200);
  expect(JSON.stringify(await login.json())).not.toMatch(/token|password/);
});
it("enforces expiration, unauthenticated access and CSRF origin checks", async () => {
  const { store } = await setup();
  const cookie = await register(store);
  expect(
    (await handleAccountRequest(request("/api/v1/pins"), store)).status,
  ).toBe(401);
  expect(
    (
      await handleAccountRequest(
        request("/api/v1/pins", "POST", {}, cookie, "https://evil.example"),
        store,
      )
    ).status,
  ).toBe(403);
  store.db.prepare("UPDATE session SET expiresAt = ?").run(1);
  expect(
    (
      await handleAccountRequest(
        request("/api/v1/pins", "GET", undefined, cookie),
        store,
      )
    ).status,
  ).toBe(401);
});
it("persists private CRUD across reopening and isolates owners through actual cookies", async () => {
  const { store, file } = await setup();
  const alice = await register(store);
  const bob = await register(store, "b@example.test");
  const input = {
    name: "Fixture shore",
    latitude: 34,
    longitude: -119,
    notes: "private fixture note",
  };
  const create = await handleAccountRequest(
    request("/api/v1/pins", "POST", input, alice),
    store,
  );
  expect(create.status).toBe(201);
  const pin = await create.json();
  expect(pin.privacy).toBe("PRIVATE");
  expect(pin.sharingEligible).toBe(false);
  expect(
    (
      await handleAccountRequest(
        request("/api/v1/pins", "POST", input, alice),
        store,
      )
    ).status,
  ).toBe(409);
  for (const method of ["GET", "PATCH", "DELETE"]) {
    const denied = await handleAccountRequest(
      request(
        `/api/v1/pins/${pin.id}`,
        method,
        method === "PATCH" ? { ...input, sharingEligible: true } : undefined,
        bob,
      ),
      store,
    );
    expect(denied.status).toBe(404);
    expect(await denied.text()).not.toContain("latitude");
  }
  expect(
    await (
      await handleAccountRequest(
        request("/api/v1/pins", "GET", undefined, bob),
        store,
      )
    ).json(),
  ).toEqual([]);
  expect(
    (await handleAccountRequest(request("/api/v1/pins/unknown"), store)).status,
  ).toBe(401);
  expect(
    (
      await handleAccountRequest(
        request("/api/v1/pins", "POST", { ...input, ownerId: "other" }, alice),
        store,
      )
    ).status,
  ).toBe(400);
  const edited = await handleAccountRequest(
    request(
      `/api/v1/pins/${pin.id}`,
      "PATCH",
      { ...input, name: "Edited", sharingEligible: true },
      alice,
    ),
    store,
  );
  expect((await edited.json()).privacy).toBe("PRIVATE");
  store.db.close();
  stores.splice(stores.indexOf(store), 1);
  const reopened = await openAccounts({
    file,
    secret: "test-only-secret-with-at-least-32-characters-fixture",
    origin: "http://localhost:3000",
  });
  stores.push(reopened);
  const read = await handleAccountRequest(
    request(`/api/v1/pins/${pin.id}`, "GET", undefined, alice),
    reopened,
  );
  expect((await read.json()).name).toBe("Edited");
  expect(
    (
      await handleAccountRequest(
        request(`/api/v1/pins/${pin.id}`, "DELETE", undefined, alice),
        reopened,
      )
    ).status,
  ).toBe(204);
  expect(
    (
      await handleAccountRequest(
        request(`/api/v1/pins/${pin.id}`, "GET", undefined, alice),
        reopened,
      )
    ).status,
  ).toBe(404);
});
it("persists preferences, validates values and keeps favorites owner scoped", async () => {
  const { store } = await setup();
  const a = await register(store),
    b = await register(store, "b@example.test");
  const defaults = await (
    await handleAccountRequest(
      request("/api/v1/preferences", "GET", undefined, a),
      store,
    )
  ).json();
  expect(defaults.alertOptIn).toBe(false);
  const updated = {
    ...defaults,
    species: ["California grunion"],
    alertOptIn: true,
    units: "imperial",
  };
  expect(
    (
      await handleAccountRequest(
        request("/api/v1/preferences", "PUT", updated, a),
        store,
      )
    ).status,
  ).toBe(200);
  expect(
    (
      await (
        await handleAccountRequest(
          request("/api/v1/preferences", "GET", undefined, b),
          store,
        )
      ).json()
    ).alertOptIn,
  ).toBe(false);
  expect(
    (
      await handleAccountRequest(
        request(
          "/api/v1/preferences",
          "PUT",
          { ...updated, favoriteIds: ["someone-elses-pin"] },
          a,
        ),
        store,
      )
    ).status,
  ).toBe(400);
  expect(
    (
      await handleAccountRequest(
        request(
          "/api/v1/preferences",
          "PUT",
          { ...updated, alertOptIn: false },
          a,
        ),
        store,
      )
    ).status,
  ).toBe(200);
});

it("stores only library password hashes and rejects invalid owners and public lookups", async () => {
  const { store } = await setup();
  const cookie = await register(store);
  const account = store.db.prepare("SELECT password FROM account").get() as {
    password: string;
  };
  expect(account.password).not.toBe("fixture-password-9!");
  expect(account.password.length).toBeGreaterThan(50);
  expect(() => store.repository.list("nonexistent-owner")).toThrow();
  const r = await handleAccountRequest(
    request("/api/public/pins", "GET", undefined, cookie),
    store,
  );
  expect(r.status).toBe(404);
  expect(await r.text()).not.toContain("latitude");
  expect(
    (
      await handleAccountRequest(
        request("/api/auth/get-session", "GET", undefined, cookie),
        store,
      )
    ).status,
  ).toBe(404);
  expect(
    (
      await handleAccountRequest(
        request(
          "/api/v1/pins",
          "POST",
          { name: "bad", latitude: 91, longitude: 0 },
          cookie,
        ),
        store,
      )
    ).status,
  ).toBe(400);
});
it("persists preferences across reopening and removes deleted favorites", async () => {
  const { store, file } = await setup();
  const cookie = await register(store);
  const pin = await (
    await handleAccountRequest(
      request(
        "/api/v1/pins",
        "POST",
        { name: "Fixture", latitude: 34, longitude: -119 },
        cookie,
      ),
      store,
    )
  ).json();
  const prefs = await (
    await handleAccountRequest(
      request("/api/v1/preferences", "GET", undefined, cookie),
      store,
    )
  ).json();
  await handleAccountRequest(
    request(
      "/api/v1/preferences",
      "PUT",
      {
        ...prefs,
        favoriteIds: [pin.id],
        species: ["Fixture species"],
        alertOptIn: false,
      },
      cookie,
    ),
    store,
  );
  store.db.close();
  stores.splice(stores.indexOf(store), 1);
  const next = await openAccounts({
    file,
    secret: "test-only-secret-with-at-least-32-characters-fixture",
    origin: "http://localhost:3000",
  });
  stores.push(next);
  const reloaded = await (
    await handleAccountRequest(
      request("/api/v1/preferences", "GET", undefined, cookie),
      next,
    )
  ).json();
  expect(reloaded.favoriteIds).toEqual([pin.id]);
  expect(reloaded.species).toEqual(["Fixture species"]);
  await handleAccountRequest(
    request(`/api/v1/pins/${pin.id}`, "DELETE", undefined, cookie),
    next,
  );
  expect(
    (
      await (
        await handleAccountRequest(
          request("/api/v1/preferences", "GET", undefined, cookie),
          next,
        )
      ).json()
    ).favoriteIds,
  ).toEqual([]);
});
it("resolves Explore source coordinates server-side before saving", async () => {
  const { store } = await setup();
  const cookie = await register(store);
  const r = await handleAccountRequest(
    request(
      "/api/v1/pins",
      "POST",
      { name: "Fixture entry", latitude: 1, longitude: 1, sourceId: "123" },
      cookie,
    ),
    {
      ...store,
      resolveLocation: async () => ({
        name: "Fixture entry",
        latitude: 34,
        longitude: -119,
      }),
    },
  );
  expect(r.status).toBe(201);
  expect(await r.json()).toMatchObject({
    latitude: 34,
    longitude: -119,
    privacy: "PRIVATE",
  });
});
it("rejects oversized bodies and bounds repeated failed login requests", async () => {
  const { store } = await setup();
  expect(
    (
      await handleAccountRequest(
        request("/api/auth/sign-in/email", "POST", {
          email: "a@example.test",
          password: "x".repeat(17000),
        }),
        store,
      )
    ).status,
  ).toBe(413);
  const statuses: number[] = [];
  for (let i = 0; i < 11; i++)
    statuses.push(
      (
        await handleAccountRequest(
          request("/api/auth/sign-in/email", "POST", {
            email: "absent@example.test",
            password: "fixture-password-9!",
          }),
          store,
        )
      ).status,
    );
  expect(statuses).toContain(429);
});
