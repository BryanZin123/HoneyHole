import { expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AtmospherePanel } from "../src/presentation/atmosphere-panel";
import { NwsAtmosphereProvider } from "../src/infrastructure/nws-atmosphere";
it("renders missing data as unavailable and identifies nearby observations", async () => {
  const data = await new NwsAtmosphereProvider(async () => {
    throw Error("offline");
  }).getAtmosphere({ latitude: 37, longitude: -122 });
  render(<AtmospherePanel data={data} timeZone="America/Los_Angeles" />);
  expect(screen.getByText(/Station pressure: unavailable/)).toBeInTheDocument();
  expect(screen.getByText(/not an on-site measurement/)).toBeInTheDocument();
  expect(
    screen.getByText(/Cloud cover forecast unavailable/),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/Wind gust forecast unavailable/),
  ).toBeInTheDocument();
});
