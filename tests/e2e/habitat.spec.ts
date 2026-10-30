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
  expect(detail.mappedContext.status).toBe("context-only");
  expect(detail.mappedContext.assessment.point.kind).toBe("park-entry");
  expect(detail.mappedContext.assessment.features).toEqual([]);
  const mapped = page.getByRole("region", { name: "Mapped habitat context" });
  await expect(
    mapped.getByText(/Verified location evidence: UNVERIFIED/),
  ).toBeVisible();
  await expect(
    mapped.getByText(/Publication: 2023-04-20; observation dates: unknown/),
  ).toBeVisible();
  await expect(mapped.getByRole("link", { name: "CC BY 4.0" })).toHaveAttribute(
    "href",
    "https://creativecommons.org/licenses/by/4.0/",
  );
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

test("mapped context outage does not manufacture a habitat classification", async ({
  page,
}) => {
  await page.route("**/api/v1/locations/991?*", async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    body.mappedContext.status = "unavailable";
    body.mappedContext.dataset.service = null;
    body.mappedContext.dataset.retrievedAt = null;
    await route.fulfill({ response, json: body });
  });
  await page.goto("/explore");
  await page.getByRole("button", { name: "Find shoreline locations" }).click();
  await page
    .getByRole("region", { name: "California shoreline map" })
    .locator('[title="Synthetic Browser Fixture SB"]')
    .click();
  const mapped = page.getByRole("region", { name: "Mapped habitat context" });
  await expect(
    mapped.getByText(/Live dataset metadata is unavailable or has changed/),
  ).toBeVisible();
  await expect(
    mapped.getByText(/Verified location evidence: UNVERIFIED/),
  ).toBeVisible();
  await expect(
    page.getByText(/Fishing recommendation: unavailable/),
  ).toBeVisible();
});
