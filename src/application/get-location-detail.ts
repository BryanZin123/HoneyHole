import { assessLocationEligibility } from "../domain/location-eligibility";
import { validateCoordinates } from "../domain/spatial";
import {
  getRegulatoryAssessment,
  type RegulationProvider,
} from "./get-regulatory-assessment";
import type { RegulatoryContext } from "../domain/effective-regulations";
import type { ShoreLocation } from "../domain/discovery";
import type { WeatherProvider } from "./weather-provider";
import type { AtmosphereProvider } from "./atmosphere-provider";
import type { CoastalProvider } from "./assess-coastal-access";
import { assessCoastalAccess } from "./assess-coastal-access";
import type { Coordinates } from "../domain/geography";
import type { MarineConditions } from "../domain/marine";
import {
  type FishingActivity,
  type RegulationRecord,
} from "../domain/regulations";
export interface TideReferencePort {
  get(point: Coordinates): Promise<{
    status: string;
    transferRelevance: "UNVERIFIED";
    distanceKm: number | null;
    conditions: MarineConditions | null;
    reason: string;
  }>;
}
export async function getLocationDetail(
  location: ShoreLocation,
  activity: FishingActivity,
  ports: {
    weather: WeatherProvider;
    atmosphere: AtmosphereProvider;
    access: CoastalProvider;
    tides: TideReferencePort;
    regulations: RegulationRecord[];
    regulationProvider?: RegulationProvider;
    regulatoryScopes?: RegulatoryContext["scopes"];
    checkedOn?: string;
  },
) {
  validateCoordinates(location.coordinates);
  validateCoordinates(activity.coordinates);
  if (
    activity.coordinates.latitude !== location.coordinates.latitude ||
    activity.coordinates.longitude !== location.coordinates.longitude
  ) {
    throw new Error("Activity coordinates must match the selected location");
  }
  const [weather, atmosphere, access, tides, regulatoryAssessment] =
    await Promise.all([
      ports.weather.getForecast(location.coordinates),
      ports.atmosphere.getAtmosphere(location.coordinates),
      assessCoastalAccess(location.coordinates, ports.access),
      ports.tides.get(location.coordinates),
      getRegulatoryAssessment(
        {
          activity,
          scopes: ports.regulatoryScopes ?? [],
          checkedOn:
            ports.checkedOn ??
            new Date().toLocaleDateString("en-CA", {
              timeZone: "America/Los_Angeles",
            }),
        },
        ports.regulationProvider ?? { getRules: async () => [] },
      ),
    ]);
  return {
    location,
    activity,
    weather,
    atmosphere,
    access,
    tides,
    habitat: { status: "unknown" },
    regulations: {
      ...regulatoryAssessment,
      records: ports.regulations,
    },
    opportunity: {
      suitability: "not-assessed",
      confidence: "insufficient",
      ...assessLocationEligibility(
        access.access.status,
        regulatoryAssessment.status,
      ),
    },
  };
}
