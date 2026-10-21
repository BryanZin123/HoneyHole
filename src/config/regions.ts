import type { Region } from "../domain/geography";
/** Deployment configuration, not a geographic boundary or access dataset. */
export const californiaCoast: Region = {
  id: "US-CA-coast",
  countryCode: "US",
  stateCode: "CA",
  timeZone: "America/Los_Angeles",
  modes: ["shore"],
};
export const activeRegion = californiaCoast;
export const regionalProviders = {
  regionId: californiaCoast.id,
  marine: "noaa-coops",
  weather: "nws",
  regulations: null,
} as const;
