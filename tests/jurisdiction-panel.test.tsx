import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { JurisdictionPanel } from "../src/presentation/jurisdiction-panel";
import { resolveJurisdiction } from "../src/application/resolve-jurisdiction";
it("explains unresolved legal geography without claiming unrestricted fishing", async () => {
  const assessment = await resolveJurisdiction(
    { latitude: 37, longitude: -122 },
    "2026-10-21",
    "2026-10-21",
    {
      getEvidence: async () => {
        throw Error("offline");
      },
    },
  );
  render(<JurisdictionPanel assessment={assessment} />);
  expect(
    screen.getByRole("region", { name: "Geographic jurisdiction" }),
  ).toBeVisible();
  expect(screen.getAllByText(/Not resolved · UNVERIFIED/)).toHaveLength(5);
  expect(screen.getByText(/Jurisdiction source unavailable/)).toBeVisible();
  expect(screen.getByText(/Missing evidence does not mean/)).toBeVisible();
});
