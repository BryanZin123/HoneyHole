import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { MappedContextPanel } from "../src/presentation/mapped-context-panel";
import { getMappedContext } from "../src/application/get-mapped-context";
import { CdfwMappedContext } from "../src/infrastructure/cdfw-mapped-context";
afterEach(cleanup);
it("shows unknown observation dates, prediction limits and licensed attribution during outages", async () => {
  const context = await getMappedContext(
    {
      id: "fixture",
      kind: "park-entry",
      coordinates: { latitude: 37.5, longitude: -122.5 },
      accuracyMeters: null,
    },
    "2026-10-29",
    new CdfwMappedContext(async () => {
      throw Error("offline");
    }),
  );
  render(<MappedContextPanel context={context} />);
  expect(screen.getByText(/observation dates: unknown/)).toBeVisible();
  expect(
    screen.getByText(/Verified location evidence: UNVERIFIED/),
  ).toBeVisible();
  expect(screen.getByRole("link", { name: "CC BY 4.0" })).toHaveAttribute(
    "href",
    "https://creativecommons.org/licenses/by/4.0/",
  );
  expect(
    screen.getByText(/soft does not establish present beach sand/),
  ).toBeVisible();
  expect(
    screen.getByText(/metadata is unavailable or has changed/),
  ).toBeVisible();
});
it("explains outside-pilot state without implying coverage", async () => {
  const context = await getMappedContext(
    {
      id: "fixture",
      kind: "park-entry",
      coordinates: { latitude: 34, longitude: -118 },
      accuracyMeters: null,
    },
    "2026-10-29",
    new CdfwMappedContext(),
  );
  render(<MappedContextPanel context={context} />);
  expect(
    screen.getByText(/outside the Half Moon Bay-area context prototype/),
  ).toBeVisible();
});
