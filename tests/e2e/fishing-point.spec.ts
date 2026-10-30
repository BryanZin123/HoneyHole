import { test, expect } from "./fixtures";
test("intentional fishing point, ordered shoreline evidence and private restart persistence", async ({
  page,
  app,
  browser,
}, info) => {
  const email = `point-${info.project.name}@example.test`,
    password = "synthetic-point-password-9!";
  await page.goto("/account");
  await page.getByRole("button", { name: "Register", exact: true }).click();
  await page.getByLabel("Display name").fill("Point test");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByText(`Signed in as Point test (${email}).`, { exact: true }),
  ).toBeVisible();
  await page.goto("/explore");
  await page.getByRole("button", { name: "Find shoreline locations" }).click();
  const map = page.getByRole("region", { name: "California shoreline map" });
  await expect(
    map.locator('[title="Synthetic Browser Fixture SB"]'),
  ).toBeVisible();
  let pointCalls = 0;
  page.on("request", (r) => {
    if (r.url().includes("/api/v1/fishing-point-context")) pointCalls++;
  });
  await page
    .getByRole("button", { name: "Choose a fishing point on the map" })
    .click();
  await expect(
    page.getByRole("button", { name: "Cancel fishing-point selection" }),
  ).toBeVisible();
  await map.click({ position: { x: 130, y: 150 } });
  const panel = page.getByRole("region", { name: "Your fishing point" });
  await expect(panel).toBeVisible();
  expect(pointCalls).toBe(0);
  const coordinateText = await panel
    .getByLabel("Fishing-point coordinates")
    .textContent();
  const [latitude, longitude] = coordinateText!.split(",").map(Number);
  expect({ latitude, longitude }).not.toEqual({
    latitude: 37.5,
    longitude: -122.5,
  });
  await expect(
    panel.getByRole("button", { name: "Load conditions for this point" }),
  ).toBeDisabled();
  const received = page.waitForResponse((r) =>
    r.url().endsWith("/api/v1/fishing-point-context"),
  );
  await panel
    .getByRole("button", { name: "Load mapped shoreline context" })
    .click();
  const detail = await (await received).json();
  expect(detail.environmentConsent).toBe(false);
  expect(detail.environment).toBeNull();
  expect(detail.point.coordinates).toEqual({ latitude, longitude });
  expect(detail.regulatoryEligibility).toBe("UNVERIFIED");
  expect(detail.alertEligible).toBe(false);
  const context = panel.getByRole("region", { name: "Mapped shoreline types" });
  await expect(
    context.getByText("Feature 900001 · 6B/3A", { exact: true }),
  ).toBeVisible();
  await expect(
    context.getByText(
      /Landward → seaward: 6B \(engineered\) → 3A \(fine-medium-sand\)/,
    ),
  ).toBeVisible();
  await expect(
    context.getByText(/Point classification: UNVERIFIED/),
  ).toBeVisible();
  await panel.getByRole("checkbox").check();
  const weather = page.waitForResponse((r) =>
    r.url().endsWith("/api/v1/fishing-point-context"),
  );
  await panel
    .getByRole("button", { name: "Load conditions for this point" })
    .click();
  expect((await (await weather).json()).environmentConsent).toBe(true);
  await expect(panel.getByText(/No usable hourly forecast/)).toBeVisible();
  await panel
    .getByRole("button", { name: "Save fishing point privately" })
    .click();
  await expect(
    panel.getByText("Fishing point saved privately.", { exact: true }),
  ).toBeVisible();
  const pins = await (await page.request.get("/api/v1/pins")).json();
  expect(pins).toHaveLength(1);
  expect(pins[0]).toMatchObject({
    latitude,
    longitude,
    sourceId: null,
    privacy: "PRIVATE",
    sharingEligible: false,
  });
  const id = pins[0].id;
  const other = await browser.newContext({ baseURL: "http://127.0.0.1:3108" });
  try {
    const second = await other.newPage();
    await second.goto("/account");
    await second.getByRole("button", { name: "Register", exact: true }).click();
    await second.getByLabel("Display name").fill("Other point user");
    await second
      .getByLabel("Email", { exact: true })
      .fill(`point-other-${info.project.name}@example.test`);
    await second.getByLabel("Password", { exact: true }).fill(password);
    await second
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    await expect(
      second.getByText(/Signed in as Other point user/),
    ).toBeVisible();
    expect((await second.request.get(`/api/v1/pins/${id}`)).status()).toBe(404);
  } finally {
    await other.close();
  }
  await page.goto("/account");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByText("Signed out.", { exact: true })).toBeVisible();
  expect((await page.request.get(`/api/v1/pins/${id}`)).status()).toBe(401);
  await app.restart();
  await page.goto("/account");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Sign in securely", exact: true })
    .click();
  await expect(
    page.getByText(`Signed in as Point test (${email}).`, { exact: true }),
  ).toBeVisible();
  await page.goto("/saved");
  await expect(
    page.getByText("My selected fishing point", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Edit My selected fishing point",
      exact: true,
    })
    .click();
  await page
    .getByLabel("Location name", { exact: true })
    .fill("Private fishing point edited");
  await page
    .getByLabel("Private notes", { exact: true })
    .fill("Synthetic acceptance notes");
  await page.getByRole("button", { name: "Save pin changes" }).click();
  await expect(
    page.getByText("Synthetic acceptance notes", { exact: true }),
  ).toBeVisible();
  const saved = await (await page.request.get(`/api/v1/pins/${id}`)).json();
  expect(saved).toMatchObject({ latitude, longitude, sourceId: null });
  await page
    .getByRole("button", {
      name: "Delete Private fishing point edited",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Confirm delete", exact: true })
    .click();
  await expect(page.getByText(/No saved Honey Holes yet/)).toBeVisible();
});

test("keyboard fishing point survives separate-tab registration without environmental consent", async ({
  page,
  context,
}, info) => {
  await page.goto("/explore");
  await page.getByRole("button", { name: "Find shoreline locations" }).click();
  const map = page.getByRole("region", { name: "California shoreline map" });
  await expect(
    map.locator('[title="Synthetic Browser Fixture SB"]'),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Choose a fishing point on the map" })
    .click();
  await map.focus();
  await map.press("Enter");
  const panel = page.getByRole("region", { name: "Your fishing point" });
  await expect(panel).toBeVisible();
  const coordinates = await panel
    .getByLabel("Fishing-point coordinates")
    .textContent();
  await panel
    .getByRole("button", { name: "Save fishing point privately" })
    .click();
  await expect(
    panel.getByRole("button", { name: "Save fishing point privately" }),
  ).toBeEnabled();
  const opened = context.waitForEvent("page");
  await panel.getByRole("link", { name: "Sign in in another tab" }).click();
  const account = await opened;
  await account.getByRole("button", { name: "Register", exact: true }).click();
  await account.getByLabel("Display name").fill("Acceptance user");
  await account
    .getByLabel("Email", { exact: true })
    .fill(`acceptance-${info.project.name}@example.test`);
  await account
    .getByLabel("Password", { exact: true })
    .fill("synthetic-acceptance-password-9!");
  await account
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(account.getByText(/Signed in as Acceptance user/)).toBeVisible();
  await page.bringToFront();
  await expect(panel.getByLabel("Fishing-point coordinates")).toHaveText(
    coordinates!,
  );
  await expect(panel.getByRole("checkbox")).not.toBeChecked();
  await panel
    .getByRole("button", { name: "Save fishing point privately" })
    .click();
  await expect(
    panel.getByRole("button", { name: "Fishing point saved", exact: true }),
  ).toBeDisabled();
  const pins = await (await page.request.get("/api/v1/pins")).json();
  expect(pins).toHaveLength(1);
  const [latitude, longitude] = coordinates!.split(",").map(Number);
  expect(pins[0]).toMatchObject({
    latitude,
    longitude,
    sourceId: null,
    privacy: "PRIVATE",
    sharingEligible: false,
  });
});
