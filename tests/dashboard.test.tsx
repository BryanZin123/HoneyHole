import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { Dashboard } from "../src/presentation/dashboard";
it("shows missing evidence instead of invented fishing recommendations", () => {
  render(<Dashboard />);
  expect(
    screen.getByRole("heading", { name: "No fishing recommendation yet" }),
  ).toBeVisible();
  expect(
    screen.getByText("Applicable fishing regulations have not been verified."),
  ).toBeVisible();
  expect(screen.getByText("Weather data is missing.")).toBeVisible();
  expect(
    screen.getByRole("link", { name: /Check marine conditions/ }),
  ).toHaveAttribute("href", "/conditions");
});
