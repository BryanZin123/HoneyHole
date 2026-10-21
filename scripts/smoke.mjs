import { readFileSync } from "node:fs";
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
const contract = JSON.parse(
  readFileSync(new URL("../docs/api/openapi.json", import.meta.url), "utf8"),
);
const ajv = new Ajv({ strict: false });
addFormats(ajv);
const validateConditions = ajv.compile({
  $ref: "#/components/schemas/Conditions",
  components: contract.components,
});
const validateCoastal = ajv.compile({
  $ref: "#/components/schemas/CoastalAssessment",
  components: contract.components,
});
const port = 3107;
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    String(port),
  ],
  { stdio: ["ignore", "pipe", "pipe"] },
);
let logs = "";
server.stdout.on("data", (d) => (logs += d));
server.stderr.on("data", (d) => (logs += d));
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(`http://127.0.0.1:${port}`)).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  assert(ready, `Server did not start: ${logs}`);
  for (const [path, expected] of [
    ["/", "No fishing recommendation yet"],
    ["/conditions", "Read the water."],
    ["/explore", "A place worth knowing."],
    ["/saved", "Your spots. Your choice."],
  ]) {
    const response = await fetch(`http://127.0.0.1:${port}${path}`);
    assert.equal(response.status, 200);
    assert((await response.text()).includes(expected));
    console.log(`PASS ${path}: HTTP 200 and expected content`);
  }
  if (process.argv.includes("--live")) {
    const response = await fetch(
      `http://127.0.0.1:${port}/api/v1/conditions?station=9414290`,
      { signal: AbortSignal.timeout(45000) },
    );
    const body = await response.json();
    assert.equal(response.headers.get("X-API-Version"), "1");
    console.log(
      JSON.stringify(
        { live: true, httpStatus: response.status, body },
        null,
        2,
      ),
    );
    assert.equal(response.status, 200, "Live station request failed");
    assert(validateConditions(body), JSON.stringify(validateConditions.errors));
    assert.equal(
      body.tides.status,
      "available",
      "Live tide data was not available",
    );
    assert(body.atmosphere, "Atmospheric extension missing");
    assert.equal(
      body.atmosphere.grid.status,
      "available",
      "Live grid extension unavailable/stale",
    );
    assert.equal(
      body.atmosphere.light.status,
      "available",
      "Live solar extension unavailable",
    );
    console.log(
      "PASS atmospheric schema and live grid/solar data; pressure status: " +
        body.atmosphere.pressure.status,
    );
    assert.equal(
      body.weather.status,
      "available",
      "Live weather unavailable: " + body.weather.errorCode,
    );
    assert.equal(body.weather.coordinates.latitude, body.station.latitude);
    assert.equal(body.weather.coordinates.longitude, body.station.longitude);
    assert(body.weather.periods.length > 0);
    assert(
      Date.parse(body.weather.updatedAt) <=
        Date.parse(body.weather.responseReceivedAt) + 120000,
    );
    console.log(
      "PASS live versioned endpoint: NOAA tides, NWS forecast, matching coordinates and timestamp tolerance",
    );
  }
  if (process.argv.includes("--coastal")) {
    for (const [latitude, longitude] of [
      [37.8063, -122.4659],
      [37.514, -122.516],
    ]) {
      const response = await fetch(
        `http://127.0.0.1:${port}/api/v1/coastal-access?latitude=${latitude}&longitude=${longitude}`,
        { signal: AbortSignal.timeout(25000) },
      );
      const body = await response.json();
      console.log(
        JSON.stringify(
          { coastalLive: true, httpStatus: response.status, body },
          null,
          2,
        ),
      );
      assert.equal(response.status, 200);
      assert.equal(
        body.access.evidence.status,
        "available",
        "Live CPAD query failed",
      );
      assert.equal(
        body.protectedAreas.status,
        "available",
        "Live CDFW query failed",
      );
      assert(validateCoastal(body), JSON.stringify(validateCoastal.errors));
      assert.equal(body.legallyVerified, false);
      assert.equal(body.fishingPermission, "unknown");
      console.log(
        "PASS live coastal point query with independent access/MPA evidence and no legal clearance",
      );
    }
  }
  if (process.argv.includes("--discovery")) {
    const listResponse = await fetch(
      `http://127.0.0.1:${port}/api/v1/locations?county=San%20Mateo`,
      { signal: AbortSignal.timeout(25000) },
    );
    const list = await listResponse.json();
    assert.equal(listResponse.status, 200);
    const validateList = ajv.compile({
      $ref: "#/components/schemas/DiscoveryResult",
      components: contract.components,
    });
    assert(validateList(list), JSON.stringify(validateList.errors));
    assert(list.locations.length > 0);
    console.log(
      "LIVE discovery",
      JSON.stringify({
        count: list.locations.length,
        locations: list.locations.map((l) => ({
          id: l.id,
          name: l.name,
          coordinates: l.coordinates,
          datasetUpdatedAt: l.datasetUpdatedAt,
        })),
      }),
    );
    const chosen = list.locations[0];
    const nearbyResponse = await fetch(
      `http://127.0.0.1:${port}/api/v1/locations?latitude=${chosen.coordinates.latitude}&longitude=${chosen.coordinates.longitude}&radiusKm=1`,
      { signal: AbortSignal.timeout(25000) },
    );
    const nearby = await nearbyResponse.json();
    assert.equal(nearbyResponse.status, 200);
    assert(validateList(nearby), JSON.stringify(validateList.errors));
    assert(nearby.locations.some((location) => location.id === chosen.id));
    console.log(
      "PASS live coordinate-radius search retains selected source location",
    );
    const detailResponse = await fetch(
      `http://127.0.0.1:${port}/api/v1/locations/${chosen.id}?species=Surfperch`,
      { signal: AbortSignal.timeout(65000) },
    );
    const detail = await detailResponse.json();
    assert.equal(detailResponse.status, 200);
    const validateDetail = ajv.compile({
      $ref: "#/components/schemas/LocationDetail",
      components: contract.components,
    });
    assert(validateDetail(detail), JSON.stringify(validateDetail.errors));
    assert.deepEqual(detail.weather.coordinates, chosen.coordinates);
    assert.deepEqual(detail.atmosphere.coordinates, chosen.coordinates);
    assert.equal(detail.regulations.status, "UNVERIFIED");
    assert.equal(detail.tides.transferRelevance, "UNVERIFIED");
    if (process.argv.includes("--regulations")) {
      for (const [date, expected] of [
        ["2026-06-30", "VERIFIED_PROHIBITED"],
        ["2026-07-01", "UNVERIFIED"],
        ["2027-04-01", "UNVERIFIED"],
      ]) {
        const response = await fetch(
          `http://127.0.0.1:${port}/api/v1/locations/${chosen.id}?species=California%20grunion&method=hand-gathering&date=${date}`,
          { signal: AbortSignal.timeout(65000) },
        );
        assert.equal(response.status, 200);
        const body = await response.json();
        assert(validateDetail(body), JSON.stringify(validateDetail.errors));
        assert.equal(body.regulations.status, expected);
        console.log(
          "PASS date-specific regulatory API",
          date,
          body.regulations.status,
          JSON.stringify(
            body.regulations.findings.map((f) => ({
              id: f.rule.id,
              status: f.status,
              effectiveFrom: f.rule.effectiveFrom,
            })),
          ),
        );
      }
    }
    console.log("LIVE selected evidence", JSON.stringify(detail));
    console.log(
      "PASS discovery → selected location → environmental/access/regulatory evidence and API contracts",
    );
  }
} finally {
  server.kill("SIGTERM");
}
