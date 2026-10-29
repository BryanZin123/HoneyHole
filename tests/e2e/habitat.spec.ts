import { test, expect } from "./fixtures";
test("barred surfperch evidence does not convert a park entrance into habitat or a recommendation", async ({
  page,
}) => {
  await page.goto("/explore");
  await page.getByRole("button", { name: "Find shoreline locations" }).click();
  await page
    .getByRole("region", { name: "California shoreline map" })
    .locator('[title="Synthetic Browser Fixture SB"]')
    .click();
  await expect(page.getByText(/No reviewed habitat profile/)).toBeVisible();
  const response = page.waitForResponse(
    (r) =>
      r.url().includes("/api/v1/locations/991?") &&
      r.url().includes("species=barred"),
  );
  await page
    .getByRole("combobox", { name: /^Target species/ })
    .selectOption("barred surfperch");
  const detail = await (await response).json();
  expect(detail.habitat.association.status).toBe("documented");
  expect(detail.habitat.locationEvidence.status).toBe("missing");
  expect(detail.opportunity.eligibility).toBe("UNVERIFIED");
  expect(detail.opportunity.alertEligible).toBe(false);
  const habitat = page.getByRole("region", {
    name: "Species habitat evidence",
  });
  await expect(
    habitat.getByText(/sandy-beach surf-zone habitat/),
  ).toBeVisible();
  await expect(
    habitat.getByRole("heading", {
      name: "Location habitat evidence · missing",
    }),
  ).toBeVisible();
  await expect(
    habitat.getByText(/Fishing recommendation: unavailable/),
  ).toBeVisible();
  await habitat
    .getByText("Habitat sources and limitations", { exact: true })
    .click();
  await expect(habitat.getByText(/Publication: 2012-01/)).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Selected-date environmental evidence" }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: /^Target species/ })
    .selectOption("redtail surfperch");
  await expect(page.getByText(/No reviewed habitat profile/)).toBeVisible();
});
