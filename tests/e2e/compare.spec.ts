import { test, expect } from "./fixtures";
test("two independent entrances preserve consent, snapshots and plan boundaries", async ({
  page,
}) => {
  await page.goto("/explore/nearby");
  await page.getByLabel("Center latitude").fill("37.512345");
  await page.getByLabel("Center longitude").fill("-122.512345");
  await page.getByLabel("Radius (km)").fill("50");
  await page.getByLabel("Target species").selectOption("barred surfperch");
  await page.getByRole("button", { name: "Search nearby areas" }).click();
  await expect(
    page.getByRole("heading", { name: "Areas to investigate (2)" }),
  ).toBeVisible();
  const calls: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/v1/locations/")) calls.push(r.url());
  });
  await page
    .getByRole("button", { name: "Synthetic Browser Fixture SB", exact: true })
    .click();
  const panel = page.getByRole("region", {
    name: "Selected entrance evidence",
  });
  await panel.getByRole("checkbox").check();
  await panel.getByRole("button", { name: "Load entrance evidence" }).click();
  await expect(
    panel.getByRole("button", { name: "Evidence loaded for this plan" }),
  ).toBeVisible();
  const firstCalls = calls.length;
  await panel
    .getByRole("button", { name: "Compare with another area" })
    .click();
  await page
    .getByRole("button", {
      name: "Compare Synthetic Second Fixture SB",
      exact: true,
    })
    .click();
  const comparison = page.getByRole("region", {
    name: "Compare coastal areas",
    exact: true,
  });
  await expect(
    comparison.getByText("Evidence not loaded", { exact: true }),
  ).toHaveCount(1);
  await expect(panel.getByRole("checkbox")).not.toBeChecked();
  expect(calls.length).toBe(firstCalls);
  await panel.getByRole("checkbox").check();
  await panel.getByRole("button", { name: "Load entrance evidence" }).click();
  await expect(
    comparison.getByText("Individually loaded assessment"),
  ).toHaveCount(2);
  expect(calls.length).toBe(firstCalls + 1);
  await comparison
    .getByRole("button", {
      name: "Review Synthetic Browser Fixture SB",
      exact: true,
    })
    .click();
  await expect(panel.getByRole("checkbox")).toBeChecked();
  await expect(
    panel.getByRole("button", { name: "Evidence loaded for this plan" }),
  ).toBeVisible();
  await expect(
    panel.getByRole("heading", { name: "High Surf Advisory" }),
  ).toBeVisible();
  expect(calls.length).toBe(firstCalls + 1);
  const secondWarnings = comparison.getByRole("article", {
    name: "Synthetic Second Fixture SB: Coastal warnings",
    exact: true,
  });
  const beforeSecond = await secondWarnings.textContent();
  await page.clock.install();
  await page.clock.fastForward(31000);
  await page.route("**/api/v1/locations/991/warnings", (r) =>
    r.fulfill({
      status: 503,
      json: { error: "Synthetic unavailable refresh" },
    }),
  );
  await panel
    .getByRole("button", { name: "Refresh official warnings" })
    .click();
  await expect(
    panel.getByText(/Unknown — refresh unsuccessful/).first(),
  ).toBeVisible();
  expect(await secondWarnings.textContent()).toBe(beforeSecond);
  await comparison
    .getByRole("button", {
      name: "Review Synthetic Second Fixture SB",
      exact: true,
    })
    .click();
  await comparison
    .getByRole("button", {
      name: "Review Synthetic Browser Fixture SB",
      exact: true,
    })
    .click();
  await expect(
    panel.getByText(/Unknown — refresh unsuccessful/).first(),
  ).toBeVisible();
  await expect(
    panel.getByRole("complementary", { name: "Historical warning snapshot" }),
  ).toBeVisible();
  await panel.getByRole("checkbox").uncheck();
  await comparison
    .getByRole("button", {
      name: "Review Synthetic Second Fixture SB",
      exact: true,
    })
    .click();
  await expect(panel.getByRole("checkbox")).toBeChecked();
  await comparison
    .getByRole("button", { name: "Return to single area" })
    .click();
  await expect(comparison).toHaveCount(0);
  await expect(
    panel.getByRole("button", { name: "Evidence loaded for this plan" }),
  ).toBeVisible();
  await page.getByLabel("Time period").selectOption("morning");
  await expect(panel).toHaveCount(0);
  expect(calls.length).toBe(firstCalls + 2);
});
