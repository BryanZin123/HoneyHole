import type { HabitatEvidenceProvider } from "../application/get-habitat-assessment";
import type {
  SpeciesHabitatProfile,
  LocationHabitatEvidence,
} from "../domain/habitat";
/** Reviewed descriptive evidence, not regulatory rules or catch-prediction parameters. */
export const barredSurfperchHabitat: SpeciesHabitatProfile = {
  commonName: "barred surfperch",
  scientificName: "Amphistichus argenteus",
  facts: [
    {
      statement:
        "Barred surfperch are associated with sandy-beach surf-zone habitat. CDFW describes research on this species along central and southern California sandy beaches.",
      sourceIds: ["cdfw-surf", "cdfw-2012"],
    },
    {
      statement:
        "CDFW lists beaches as both juvenile and adult habitat, with California regional range codes NC, SC and S. These broad regions are not point-level habitat boundaries.",
      sourceIds: ["cdfw-life-history"],
    },
    {
      statement:
        "A January 2012 CDFW species account describes a range from Bodega Bay to central Baja California. This historical range summary is not a current distribution survey or proof of presence at a selected pin.",
      sourceIds: ["cdfw-2012"],
    },
  ],
  sources: [
    {
      id: "cdfw-surf",
      title: "CDFW Surf Zone Fishes — Surfperch Studies",
      url: "https://wildlife.ca.gov/Conservation/Marine/Surf",
      attribution: "California Department of Fish and Wildlife",
      published: null,
      reviewedOn: "2026-10-28",
      geographicScope:
        "California; barred surfperch studies in central and southern California",
      limitations:
        "Page publication date not supplied. Descriptive habitat and research context; historical sampling does not establish present abundance or fishing success.",
    },
    {
      id: "cdfw-life-history",
      title: "CDFW Life History Information — barred surfperch row",
      url: "https://wildlife.ca.gov/Conservation/Marine/Life-History-Fish",
      attribution: "California Department of Fish and Wildlife",
      published: null,
      reviewedOn: "2026-10-28",
      geographicScope: "California regional codes NC, SC, S as listed by CDFW",
      limitations:
        "Broad habitat compilation; no source date, point-level substrate survey or precise range polygon supplied.",
    },
    {
      id: "cdfw-2012",
      title:
        "CDFW Marine Fish Identification — January 2012 barred surfperch account",
      url: "https://wildlife.ca.gov/Fishing/Ocean/Fish-ID/Quiz",
      attribution: "California Department of Fish and Wildlife",
      published: "2012-01",
      reviewedOn: "2026-10-28",
      geographicScope:
        "Described historical range: Bodega Bay to central Baja California",
      limitations:
        "Historical species account. Its old regulatory text is not used. Range endpoints are not a complete current distribution boundary.",
    },
  ],
  limitations: [
    "A park-entry coordinate does not verify sand, a surf zone, species presence, access or fishing permission.",
    "No empirical catch model is implemented for tide, moon, pressure, wind or water temperature. Provider conditions are displayed separately.",
    "The requested CDFW Marine Species Portal monitoring page requires JavaScript; its substantive content was not verified in this review and is not used as evidence.",
  ],
};
export class CaliforniaHabitatEvidence implements HabitatEvidenceProvider {
  async getSpecies(species: string) {
    return ["barred surfperch", "amphistichus argenteus"].includes(
      species.trim().toLowerCase(),
    )
      ? barredSurfperchHabitat
      : null;
  }
  async getLocation(): Promise<LocationHabitatEvidence[]> {
    // Current discovery records are park entrances, not surveyed fishing habitat.
    return [];
  }
}
