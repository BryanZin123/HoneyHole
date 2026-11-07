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
