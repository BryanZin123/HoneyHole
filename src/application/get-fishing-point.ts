import type { Coordinates } from "../domain/geography";
import { validateCoordinates } from "../domain/spatial";
import { validDate } from "../domain/effective-regulations";
import {
  inShorelinePilot,
  shorelineDistance,
  type ShorelineResult,
} from "../domain/shoreline-context";
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
  environmentConsent: boolean;
}
export function validateFishingPointInput(value: unknown): FishingPointInput {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("Invalid point");
  const v = value as FishingPointInput;
  if (
    Object.keys(v).some(
      (k) => !["coordinates", "date", "environmentConsent"].includes(k),
    ) ||
    typeof v.environmentConsent !== "boolean" ||
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
  shoreline: { get(): Promise<ShorelineResult> };
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
  let shoreline: ShorelineResult = {
    status: "empty",
    features: [],
    retrievedAt: null,
  };
  const inside = inShorelinePilot(coordinates);
  if (inside) {
    try {
      shoreline = await ports.shoreline.get();
    } catch {
      shoreline = { status: "unavailable", features: [], retrievedAt: null };
    }
  }
  const geometries = new Map<string, string>();
  let conflictingGeometry = false;
  const features = shoreline.features
    .map(({ geometry, ...feature }) => {
      const key = JSON.stringify(geometry);
      if (geometries.has(key) && geometries.get(key) !== feature.shoreCode)
        conflictingGeometry = true;
      geometries.set(key, feature.shoreCode);
      return {
        ...feature,
        distanceMeters: shorelineDistance(coordinates, geometry),
        positionalAccuracyMeters: null,
      };
    })
    .sort(
      (a, b) => a.distanceMeters - b.distanceMeters || a.id.localeCompare(b.id),
    );
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
        ports.tides.get(coordinates),
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
    shoreline: {
      status: inside ? shoreline.status : "outside-pilot",
      retrievedAt: shoreline.retrievedAt,
      features,
      conflictingGeometry,
      pointClassification: "UNVERIFIED" as const,
    },
    habitat: await getHabitatAssessment(
      {
        locationId: "user-selected",
        coordinates,
        species: "barred surfperch",
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
