import type { Coordinates } from "../domain/geography";
import { validateCoordinates } from "../domain/spatial";
import { validDate } from "../domain/effective-regulations";
import {
  getShorelineContext,
  type ShorelinePort,
} from "./get-shoreline-context";
import type { WeatherProvider } from "./weather-provider";
import type { AtmosphereProvider } from "./atmosphere-provider";
import type { TideReferencePort } from "./get-location-detail";
import {
  getHabitatAssessment,
  type HabitatEvidenceProvider,
} from "./get-habitat-assessment";
export interface FishingPointInput {
  coordinates: Coordinates;
  date: string;
  species?: string;
  environmentConsent: boolean;
}
export function validateFishingPointInput(value: unknown): FishingPointInput {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("Invalid point");
  const v = value as FishingPointInput;
  if (
    Object.keys(v).some(
      (k) =>
        !["coordinates", "date", "environmentConsent", "species"].includes(k),
    ) ||
    typeof v.environmentConsent !== "boolean" ||
    (v.species !== undefined &&
      (typeof v.species !== "string" || v.species.length > 80)) ||
    !validDate(v.date) ||
    !v.coordinates ||
    Object.keys(v.coordinates).some(
      (k) => !["latitude", "longitude"].includes(k),
    )
  )
    throw Error("Invalid point");
  validateCoordinates(v.coordinates);
  return v;
}
export interface FishingPointPorts {
  shoreline: ShorelinePort;
  weather: WeatherProvider;
  atmosphere: AtmosphereProvider;
  tides: TideReferencePort;
  habitat: HabitatEvidenceProvider;
}
export async function getFishingPoint(
  input: FishingPointInput,
  ports: FishingPointPorts,
) {
  validateFishingPointInput(input);
  const coordinates = { ...input.coordinates };
  const shoreline = await getShorelineContext(coordinates, ports.shoreline);
  let environment: null | {
    weather: Awaited<ReturnType<WeatherProvider["getForecast"]>>;
    atmosphere: Awaited<ReturnType<AtmosphereProvider["getAtmosphere"]>>;
    tides: Awaited<ReturnType<TideReferencePort["get"]>>;
  } = null;
  if (input.environmentConsent) {
    try {
      const [weather, atmosphere, tides] = await Promise.all([
        ports.weather.getForecast(coordinates),
        ports.atmosphere.getAtmosphere(coordinates),
        ports.tides.get(coordinates, input.date),
      ]);
      environment = { weather, atmosphere, tides };
    } catch {
      /* Never substitute conditions. */
    }
  }
  const checkedOn = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Los_Angeles",
  });
  return {
    point: {
      kind: "fishing-point" as const,
      source: "user-selected" as const,
      coordinates,
    },
    date: input.date,
    species: input.species ?? "unassessed",
    shoreline,
    habitat: await getHabitatAssessment(
      {
        locationId: "user-selected",
        coordinates,
        species: input.species ?? "unassessed",
        date: input.date,
        checkedOn,
      },
      ports.habitat,
    ),
    environment,
    environmentConsent: input.environmentConsent,
    access: "UNVERIFIED" as const,
    regulatoryEligibility: "UNVERIFIED" as const,
    recommendation: "unavailable" as const,
    alertEligible: false as const,
  };
}
