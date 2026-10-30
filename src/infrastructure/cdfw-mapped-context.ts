import type {
  MappedContextProvider,
  MappedContextResult,
  MappedDatasetContext,
} from "../application/get-mapped-context";
import type { HabitatPoint } from "../domain/mapped-habitat";
import { validateCoordinates } from "../domain/spatial";
export const DS3091_SERVICE =
  "https://tiledimageservices2.arcgis.com/Uq9r85Potqm3MfRV/arcgis/rest/services/biosds3091_cru/ImageServer";
const itemId = "40dc0b4522b94bcf95910801e322be0a";
/** Deliberately only retrieves metadata, never tiles, pixels or user-coordinate queries. */
export class CdfwMappedContext implements MappedContextProvider {
  constructor(
    private readonly fetcher: typeof fetch = fetch,
    private readonly now: () => Date = () => new Date(),
  ) {}
  async get(point: HabitatPoint): Promise<MappedContextResult> {
    validateCoordinates(point.coordinates);
    const { latitude, longitude } = point.coordinates;
    // Engineering query envelope near Half Moon Bay, NOT a habitat, legal or coverage polygon.
    if (
      latitude < 37.35 ||
      latitude > 37.65 ||
      longitude < -122.65 ||
      longitude > -122.35
    )
      return { status: "outside-pilot", dataset: null };
    const dataset: MappedDatasetContext = {
      id: "cdfw-ds3091",
      title:
        "Predicted Nearshore Benthic Substrates of California — R7 — CDFW [ds3091]",
      attribution:
        "California Coastal and Seafloor Mapping Project; California Department of Fish and Wildlife. BIOS, published 2023-04-20; metadata accessed 2026-10-29. HoneyHole summarizes metadata; no raster alteration or sampled classification.",
      sourceUrl:
        "https://filelib.wildlife.ca.gov/public/BDB/GIS/BIOS/metadata/ds3091.html",
      license: "CC BY 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
      publishedOn: "2023-04-20",
      reviewedOn: "2026-10-29",
      observedOn: null,
      retrievedAt: null,
      basis: "predicted",
      scope:
        "California nearshore benthic context. Prototype query envelope: 37.35–37.65° N, 122.65–122.35° W (Half Moon Bay area). The envelope does not establish data coverage or shoreline membership.",
      limitations: [
        "Hard/soft seabed is predicted from roughness; soft does not establish present beach sand or surf-zone habitat.",
        "The mosaic is resampled to 10 m; shallow gaps include interpolation from 30 m cells. Resolution is not positional accuracy. No conservative positional accuracy or observation-date range was established.",
        "Catalog updates and retrieval dates are not survey dates. Historical inputs and model artifacts may affect classifications. Current local conditions remain unverified.",
        "Source metadata describes Web Mercator; this tile service reports EPSG:3310. No coordinates are transformed or pixels sampled in this prototype.",
        "CDFW describes the raster as cartographic, not for area calculations. State data carry no accuracy, completeness or fitness warranty.",
      ],
      service: null,
    };
    try {
      const response = await this.fetcher(DS3091_SERVICE + "?f=json", {
        signal: AbortSignal.timeout(5000),
        cache: "no-store",
      });
      if (!response.ok) throw Error("Service unavailable");
      const body = await response.json();
      if (
        body.error ||
        body.serviceItemId !== itemId ||
        body.spatialReference?.wkid !== 3310 ||
        body.pixelSizeX !== 10 ||
        body.pixelSizeY !== 10 ||
        body.capabilities !== "Image,TilesOnly"
      )
        throw Error("Metadata changed");
      dataset.service = { itemId, crs: "EPSG:3310", resolutionMeters: 10 };
      dataset.retrievedAt = this.now().toISOString();
      return { status: "context-only", dataset };
    } catch {
      return { status: "unavailable", dataset };
    }
  }
}
