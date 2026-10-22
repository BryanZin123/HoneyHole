import {
  resolveJurisdiction,
  type JurisdictionProvider,
} from "./resolve-jurisdiction";
import type { CoastalAssessment } from "../domain/coastal";
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
    jurisdiction?: (access: CoastalAssessment) => JurisdictionProvider;
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
  const checkedOn =
    ports.checkedOn ??
    new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
  const [weather, atmosphere, access, tides] = await Promise.all([
    ports.weather.getForecast(location.coordinates),
    ports.atmosphere.getAtmosphere(location.coordinates),
    assessCoastalAccess(location.coordinates, ports.access),
    ports.tides.get(location.coordinates),
  ]);
  const jurisdiction = await resolveJurisdiction(
    location.coordinates,
    activity.date,
    checkedOn,
    ports.jurisdiction?.(access) ?? { getEvidence: async () => [] },
  );
  const regulatoryAssessment = await getRegulatoryAssessment(
    {
      activity,
      checkedOn,
      scopes: [...(ports.regulatoryScopes ?? []), ...jurisdiction.scopes],
    },
    ports.regulationProvider ?? { getRules: async () => [] },
  );
  return {
    location,
    activity,
    jurisdiction,
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
