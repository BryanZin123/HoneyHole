import type { FishingActivity, RegulatoryStatus } from "./regulations";
import type { Atmosphere } from "./atmosphere";
import type { WeatherForecast } from "./weather";
import type { CoastalAssessment } from "./coastal";
import type { MarineConditions } from "./marine";
export interface OpportunityInput {
  activity: FishingActivity;
  weather: WeatherForecast;
  atmosphere: Atmosphere;
  marineReference: MarineConditions | null;
  habitatEvidence: unknown;
  seasonalSpeciesEvidence: unknown;
  access: CoastalAssessment;
  safetyEvidence: unknown;
  eligibility: RegulatoryStatus;
}
export interface OpportunityAssessment {
  suitability: {
    status: "not-assessed" | "provisional" | "assessed";
    explanations: string[];
  };
  confidence: {
    status: "insufficient" | "partial" | "supported";
    missingEvidence: string[];
  };
  eligibility: RegulatoryStatus;
}
export interface OpportunityEngine {
  evaluate(input: OpportunityInput): Promise<OpportunityAssessment>;
}
