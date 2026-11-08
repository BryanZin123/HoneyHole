import { test, expect } from "./fixtures";
test("private nearby search, map center, consented entrance evidence and empty radius", async ({
  page,
}) => {
  await page.goto("/explore");
  await page.getByRole("link", { name: "Find fishing areas near me" }).click();
  const calls: string[] = [];
  page.on("request", (r) => calls.push(r.url()));
  await page.getByRole("button", { name: "Open area map" }).click();
  await page
    .getByRole("button", { name: "Choose search center on map" })
    .click();
  const map = page.getByRole("region", { name: "Nearby area map" });
  await map.focus();
  await map.press("Enter");
  await expect(page.getByLabel("Center latitude")).not.toHaveValue("");
  await page.getByLabel("Center latitude").fill("37.512345");
  await page.getByLabel("Center longitude").fill("-122.512345");
  await page.getByLabel("Target species").selectOption("barred surfperch");
  await page.getByLabel("Time period").selectOption("morning");
  await page.getByRole("button", { name: "Search nearby areas" }).click();
  await expect(
    page.getByRole("heading", { name: "Areas to investigate (1)" }),
  ).toBeVisible();
  await expect(page.getByText(/km straight-line · San Mateo/)).toBeVisible();
  await map.locator('[title="Synthetic Browser Fixture SB"]').click();
  const panel = page.getByRole("region", {
    name: "Selected entrance evidence",
  });
  await expect(panel).toContainText("No fishing coordinate has been assigned");
  await expect(
    panel.getByRole("button", { name: "Load entrance evidence" }),
  ).toBeDisabled();
  expect(calls.some((x) => x.includes("/api/v1/locations/"))).toBe(false);
  await panel.getByRole("checkbox").check();
  await panel.getByRole("button", { name: "Load entrance evidence" }).click();
  await expect(
    panel.getByRole("heading", { name: "High Surf Advisory" }),
  ).toBeVisible();
  await expect(panel.getByText(/NWS severity: Moderate/)).toBeVisible();
  await expect(panel.getByText(/Fixture instruction: stay away/)).toBeVisible();
  expect(
    calls.some((x) => /37\.512345|122\.512345|\/api\/v1\/pins/.test(x)),
  ).toBe(false);
  await page.getByLabel("Radius (km)").fill("1");
  await page.getByRole("button", { name: "Search nearby areas" }).click();
  await expect(
    page.getByText(/No matching State Beach entrances/),
  ).toBeVisible();
});
for (const state of ["empty", "unknown"]) {
  test(`entrance warning ${state} remains distinct from safety on desktop/mobile`, async ({
    page,
  }) => {
    await page.route("**/api/v1/locations/991", async (route) => {
      const response = await route.fetch();
      const detail = await response.json();
      detail.warnings = {
        ...detail.warnings,
        status: state,
        alerts: [],
        reason:
          state === "empty"
            ? "No active NWS alerts were returned for this published entrance coordinate at the time checked. Other hazards may exist. This is not a safety clearance."
            : "NWS returned HTTP 503; no warning assessment is available.",
      };
      await route.fulfill({ response, json: detail });
    });
    await page.goto("/explore/nearby");
    await page.getByLabel("Center latitude").fill("37.512345");
    await page.getByLabel("Center longitude").fill("-122.512345");
    await page.getByRole("button", { name: "Search nearby areas" }).click();
    await page
      .getByRole("button", { name: /Synthetic Browser Fixture SB/ })
      .click();
    const panel = page.getByRole("region", {
      name: "Selected entrance evidence",
    });
    await panel.getByRole("checkbox").check();
    await panel.getByRole("button", { name: "Load entrance evidence" }).click();
    const warnings = panel.getByRole("region", {
      name: "Official coastal warnings",
    });
    await expect(
      warnings.getByText(
        state === "empty"
          ? /No active NWS alerts were returned/
          : /NWS returned HTTP 503/,
      ),
    ).toBeVisible();
    await expect(
      warnings.getByText(/Future hazard status beyond published validity/),
    ).toBeVisible();
  });
}
test("warning-only refresh preserves environment, consent and history", async ({
  page,
  app,
}) => {
  test.setTimeout(90000);
  await app.restart();
  await page.goto("/explore/nearby");
  await page.getByLabel("Center latitude").fill("37.512345");
  await page.getByLabel("Center longitude").fill("-122.512345");
  await page.getByRole("button", { name: "Search nearby areas" }).click();
  await page
    .getByRole("button", { name: /Synthetic Browser Fixture SB/ })
    .click();
  const panel = page.getByRole("region", {
    name: "Selected entrance evidence",
  });
  await panel.getByRole("checkbox").check();
  const initialResponse = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/v1/locations/991") &&
      r.request().method() === "POST",
  );
  await panel.getByRole("button", { name: "Load entrance evidence" }).click();
  const initial = await (await initialResponse).json();
  const refresh = panel.getByRole("button", {
    name: "Refresh official warnings",
  });
  await expect(refresh).toBeVisible();
  const requests: string[] = [];
  page.on("request", (r) => requests.push(r.url()));
  await refresh.click();
  await expect(panel.getByText(/Unknown — refresh deferred/)).toBeVisible();
  expect(requests).toHaveLength(0);
  // Direct same-origin API check proves both route bundles share the process throttle.
  const cached = await page.evaluate(
    async ({ coordinates, date }) => {
      const r = await fetch("/api/v1/locations/991/warnings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coordinates, date, consent: true }),
      });
      return r.json();
    },
    { coordinates: initial.location.coordinates, date: initial.activity.date },
  );
  expect(cached.refresh.delivery).toBe("reused");
  expect(cached.retrievedAt).toBe(initial.warnings.retrievedAt);
  await panel.getByRole("checkbox").uncheck();
  await expect(refresh).toBeDisabled();
  await panel.getByRole("checkbox").check();
  const wait = Math.max(
    0,
    Date.parse(initial.warnings.refresh.nextAllowedAt) - Date.now() + 200,
  );
  await page.waitForTimeout(wait);
  requests.length = 0;
  const refreshedResponse = page.waitForResponse((r) =>
    r.url().endsWith("/warnings"),
  );
  await refresh.click();
  const updated = await (await refreshedResponse).json();
  expect(updated.refresh.delivery).toBe("fresh");
  await expect(panel.getByText(/Warning refresh completed/)).toBeVisible();
  expect(requests).toHaveLength(1);
  expect(requests[0]).toMatch(/\/locations\/991\/warnings$/);
  await expect(
    panel.getByText("Sources and dated entrance conditions"),
  ).toBeVisible();
  await expect(
    panel.getByRole("button", { name: "Evidence loaded for this plan" }),
  ).toBeDisabled();
  // Failure display fixture is separate from the preceding actual endpoint/throttle checks.
  await page.route("**/api/v1/locations/991/warnings", (r) =>
    r.fulfill({ status: 503, json: { error: "Synthetic source outage" } }),
  );
  await page.clock.install();
  await page.clock.fastForward(31000);
  await refresh.click();
  await expect(panel.getByText(/Unknown — refresh unsuccessful/)).toBeVisible();
  await expect(
    panel.getByRole("heading", { name: "Historical evidence only" }),
  ).toBeVisible();
  expect(requests.every((u) => u.endsWith("/locations/991/warnings"))).toBe(
    true,
  );
});
