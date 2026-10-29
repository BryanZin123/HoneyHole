import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";
const password = "synthetic-browser-password-9!";
async function account(page: Page, email: string, register = false) {
  await page.goto("/account");
  await expect(
    page.getByRole("button", { name: "Register", exact: true }),
  ).toBeVisible();
  if (register) {
    await page.getByRole("button", { name: "Register", exact: true }).click();
    await page.getByLabel("Display name").fill("Synthetic browser user");
  }
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page
    .getByRole("button", {
      name: register ? "Create account" : "Sign in securely",
      exact: true,
    })
    .click();
  await expect(
    page.getByText(`Signed in as Synthetic browser user (${email}).`, {
      exact: true,
    }),
  ).toBeVisible();
}
test("private Explore save, edit, owner isolation, logout, restart persistence and delete", async ({
  page,
  browser,
  app,
}, testInfo) => {
  const email = `owner-${testInfo.project.name}@example.test`;
  await account(page, email, true);
  const cookies = await page.context().cookies();
  expect(cookies.some((c) => c.httpOnly && c.sameSite === "Strict")).toBe(true);
  await page
    .getByRole("link", { name: "Explore shoreline locations", exact: true })
    .click();
  await page.getByRole("button", { name: "Find shoreline locations" }).click();
  const map = page.getByRole("region", { name: "California shoreline map" });
  await map.locator('[title="Synthetic Browser Fixture SB"]').click();
  await expect(
    page.getByRole("heading", {
      name: "Synthetic Browser Fixture SB",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText(/No usable hourly forecast/)).toBeVisible();
  await expect(
    page.getByText(/No fishing recommendation established/),
  ).toBeVisible();
  await expect(page.locator(".forecast-hour")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Save private Honey Hole", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Saved privately." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Open Saved places" }).click();
  await expect(
    page.getByText("37.5, -122.5 · PRIVATE", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Edit Synthetic Browser Fixture SB",
      exact: true,
    })
    .click();
  await page
    .getByLabel("Location name", { exact: true })
    .fill("Private browser pin");
  await page
    .getByLabel("Private notes", { exact: true })
    .fill("Synthetic notes, never shared");
  await page.getByRole("button", { name: "Save pin changes" }).click();
  await expect(
    page.getByText("Synthetic notes, never shared", { exact: true }),
  ).toBeVisible();
  const pins = await (await page.request.get("/api/v1/pins")).json();
  expect(pins).toHaveLength(1);
  const id = pins[0].id;
  expect(pins[0]).toMatchObject({
    privacy: "PRIVATE",
    sharingEligible: false,
    sourceId: "991",
  });
  const other = await browser.newContext({ baseURL: "http://127.0.0.1:3108" });
  try {
    const second = await other.newPage();
    await account(second, `other-${testInfo.project.name}@example.test`, true);
    await second.goto("/saved");
    await expect(second.getByText(/No saved Honey Holes yet/)).toBeVisible();
    expect((await second.request.get(`/api/v1/pins/${id}`)).status()).toBe(404);
    for (const method of ["PATCH", "DELETE"]) {
      expect(
        (
          await second.request.fetch(`/api/v1/pins/${id}`, {
            method,
            headers: {
              Origin: "http://127.0.0.1:3108",
              "Content-Type": "application/json",
            },
            data: {},
          })
        ).status(),
      ).toBe(404);
    }
  } finally {
    await other.close();
  }
  expect(
    (
      await page.request.post("/api/v1/pins", {
        headers: { Origin: "https://untrusted.example.test" },
        data: {},
      })
    ).status(),
  ).toBe(403);
  await page.getByRole("link", { name: "Account and sign out" }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByText("Signed out.", { exact: true })).toBeVisible();
  expect((await page.request.get(`/api/v1/pins/${id}`)).status()).toBe(401);
  await app.restart();
  await account(page, email);
  await page.getByRole("link", { name: "Your saved Honey Holes" }).click();
  await expect(
    page.getByText("Synthetic notes, never shared", { exact: true }),
  ).toBeVisible();
  expect((await (await page.request.get("/api/v1/pins")).json())[0].id).toBe(
    id,
  );
  await page
    .getByRole("button", { name: "Delete Private browser pin", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm delete", exact: true })
    .click();
  await expect(page.getByText(/No saved Honey Holes yet/)).toBeVisible();
  expect((await page.request.get(`/api/v1/pins/${id}`)).status()).toBe(404);
});
