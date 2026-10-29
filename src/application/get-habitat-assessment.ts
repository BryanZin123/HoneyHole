import {
  assessHabitat,
  type HabitatContext,
  type SpeciesHabitatProfile,
  type LocationHabitatEvidence,
} from "../domain/habitat";
export interface HabitatEvidenceProvider {
  getSpecies(species: string): Promise<SpeciesHabitatProfile | null>;
  getLocation(context: HabitatContext): Promise<LocationHabitatEvidence[]>;
}
export async function getHabitatAssessment(
  context: HabitatContext,
  provider?: HabitatEvidenceProvider,
) {
  let profile: SpeciesHabitatProfile | null = null;
  let records: LocationHabitatEvidence[] = [];
  let providerStatus: "available" | "unavailable" = provider
    ? "available"
    : "unavailable";
  if (provider) {
    const [species, location] = await Promise.allSettled([
      provider.getSpecies(context.species),
      provider.getLocation(context),
    ]);
    if (species.status === "fulfilled") profile = species.value;
    else providerStatus = "unavailable";
    if (location.status === "fulfilled") records = location.value;
    else providerStatus = "unavailable";
  }
  return { ...assessHabitat(context, profile, records), providerStatus };
}
