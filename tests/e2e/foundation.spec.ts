import { test, expect } from "./fixtures";
test("dashboard navigation and responsive layout", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page.screenshot({
    path: testInfo.outputPath("dashboard.png"),
    fullPage: true,
  });
  await expect(
    page.getByRole("heading", { name: "No fishing recommendation yet" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Conditions", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Read the water." }),
  ).toBeVisible();
  await expect(page.getByLabel("California NOAA station ID")).toHaveValue(
    "9414290",
  );
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Explore", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "A place worth knowing." }),
  ).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Saved places" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your spots. Your choice." }),
  ).toBeVisible();
});
test("provider errors stay visible and never become fake conditions", async ({
  page,
}) => {
  await page.route("**/api/v1/conditions?*", (route) =>
    route.fulfill({
      status: 502,
      contentType: "application/json",
      body: JSON.stringify({
        error: "NOAA temporarily unavailable (test fixture).",
      }),
    }),
  );
  await page.goto("/conditions");
  await page.getByRole("button", { name: "Get conditions" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "NOAA temporarily unavailable" }),
  ).toContainText("NOAA temporarily unavailable");
  await expect(
    page.getByRole("button", { name: "Get conditions" }),
  ).toBeEnabled();
  await expect(
    page.getByRole("heading", { name: "Water temperature", exact: true }),
  ).toHaveCount(0);
});
