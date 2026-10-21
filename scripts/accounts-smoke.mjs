import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
const directory = mkdtempSync(join(tmpdir(), "hh-http-test-")),
  origin = "http://127.0.0.1:3111";
const env = {
  ...process.env,
  HONEYHOLE_DATA_DIR: directory,
  BETTER_AUTH_URL: origin,
};
const contract = JSON.parse(readFileSync("docs/api/openapi.json", "utf8")),
  ajv = new Ajv({ strict: false });
addFormats(ajv);
const validatePin = ajv.compile({
  $ref: "#/components/schemas/SavedPin",
  components: contract.components,
});
const validatePreferences = ajv.compile({
  $ref: "#/components/schemas/Preferences",
  components: contract.components,
});
let server;
async function stop() {
  if (!server) return;
  const child = server;
  server = null;
  const exit = new Promise((resolve) => child.once("exit", resolve));
  child.kill("SIGTERM");
  await exit;
}
async function start() {
  server = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3111",
    ],
    { env, stdio: "ignore" },
  );
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(origin)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw Error("Production server did not start.");
}
async function api(path, method = "GET", body, cookie = "") {
  return fetch(origin + path, {
    method,
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(35000),
  });
}
const credentials = {
  email: "http-fixture@example.test",
  name: "HTTP Fixture",
  password: "http-fixture-password-9!",
};
const cookieOf = (r) =>
  r.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
try {
  const init = spawn(
    process.execPath,
    ["--import", "tsx", "scripts/init-storage.ts"],
    { env, stdio: "ignore" },
  );
  assert.equal(await new Promise((r) => init.once("exit", r)), 0);
  await start();
  for (const path of ["/", "/conditions", "/explore", "/saved", "/account"])
    assert.equal((await fetch(origin + path)).status, 200);
  console.log("PASS five production pages");
  const signup = await api("/api/auth/sign-up/email", "POST", credentials);
  assert.equal(signup.status, 200);
  assert.deepEqual(await signup.json(), { ok: true });
  let cookie = cookieOf(signup);
  assert(cookie);
  assert.match(signup.headers.get("set-cookie"), /HttpOnly/i);
  assert.equal((await api("/api/v1/me", "GET", undefined, cookie)).status, 200);
  const input = {
    name: "HTTP fixture pin",
    latitude: 34,
    longitude: -119,
    notes: "Private test note",
  };
  const create = await api("/api/v1/pins", "POST", input, cookie);
  assert.equal(create.status, 201);
  const pin = await create.json();
  assert(validatePin(pin), JSON.stringify(validatePin.errors));
  assert.equal(pin.privacy, "PRIVATE");
  assert.equal(pin.sharingEligible, false);
  const edit = await api(
    `/api/v1/pins/${pin.id}`,
    "PATCH",
    { ...input, name: "Edited fixture pin", sharingEligible: true },
    cookie,
  );
  assert.equal(edit.status, 200);
  assert.equal((await edit.json()).privacy, "PRIVATE");
  const prefs = await (
    await api("/api/v1/preferences", "GET", undefined, cookie)
  ).json();
  assert(validatePreferences(prefs));
  assert.equal(prefs.alertOptIn, false);
  assert.equal(
    (
      await api(
        "/api/v1/preferences",
        "PUT",
        { ...prefs, favoriteIds: [pin.id], species: ["California grunion"] },
        cookie,
      )
    ).status,
    200,
  );
  const bob = await api("/api/auth/sign-up/email", "POST", {
    ...credentials,
    email: "http-fixture-b@example.test",
  });
  assert.equal(bob.status, 200);
  const other = cookieOf(bob);
  for (const method of ["GET", "PATCH", "DELETE"]) {
    const r = await api(
      `/api/v1/pins/${pin.id}`,
      method,
      method === "PATCH" ? input : undefined,
      other,
    );
    assert.equal(r.status, 404);
    assert(!JSON.stringify(await r.json()).includes("latitude"));
  }
  assert.equal((await api("/api/v1/pins")).status, 401);
  assert.equal(
    (await api("/api/auth/sign-out", "POST", {}, cookie)).status,
    200,
  );
  assert.equal((await api("/api/v1/me", "GET", undefined, cookie)).status, 401);
  console.log(
    "PASS registration, private CRUD, preferences, owner isolation, logout and cookie/JSON protections",
  );
  await stop();
  await start();
  const login = await api("/api/auth/sign-in/email", "POST", {
    email: credentials.email,
    password: credentials.password,
  });
  assert.equal(login.status, 200);
  cookie = cookieOf(login);
  const read = await api(`/api/v1/pins/${pin.id}`, "GET", undefined, cookie);
  assert.equal(read.status, 200);
  assert.equal((await read.json()).name, "Edited fixture pin");
  const loaded = await (
    await api("/api/v1/preferences", "GET", undefined, cookie)
  ).json();
  assert.deepEqual(loaded.favoriteIds, [pin.id]);
  console.log(
    "PASS application restart, sign back in and persisted pins/preferences",
  );
  if (process.argv.includes("--live-explore")) {
    const discovery = await api("/api/v1/locations?county=San%20Mateo");
    assert.equal(discovery.status, 200);
    const selected = (await discovery.json()).locations[0];
    assert(selected);
    const saved = await api(
      "/api/v1/pins",
      "POST",
      { name: selected.name, ...selected.coordinates, sourceId: selected.id },
      cookie,
    );
    assert.equal(saved.status, 201);
    const sourcePin = await saved.json();
    assert(validatePin(sourcePin));
    assert.equal(sourcePin.privacy, "PRIVATE");
    assert.equal(sourcePin.latitude, selected.coordinates.latitude);
    assert.equal(sourcePin.longitude, selected.coordinates.longitude);
    assert.equal(
      (await api(`/api/v1/pins/${sourcePin.id}`, "DELETE", undefined, cookie))
        .status,
      204,
    );
    console.log(
      "PASS real Explore discovery → canonical source save → private owner read/delete",
    );
  }
  assert.equal(
    (await api(`/api/v1/pins/${pin.id}`, "DELETE", undefined, cookie)).status,
    204,
  );
  assert.equal(
    (await api(`/api/v1/pins/${pin.id}`, "GET", undefined, cookie)).status,
    404,
  );
  console.log("PASS delete and persistence/API contract checks");
} finally {
  await stop();
  rmSync(directory, { recursive: true, force: true });
}
