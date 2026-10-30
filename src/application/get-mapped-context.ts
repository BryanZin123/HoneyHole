import {
  assessMappedHabitat,
  type HabitatPoint,
} from "../domain/mapped-habitat";
export interface MappedDatasetContext {
  id: string;
  title: string;
  attribution: string;
  sourceUrl: string;
  license: string;
  licenseUrl: string;
  publishedOn: string;
  reviewedOn: string;
  observedOn: string | null;
  retrievedAt: string | null;
  basis: "predicted";
  scope: string;
  limitations: string[];
  service: { itemId: string; crs: string; resolutionMeters: number } | null;
}
export interface MappedContextResult {
  status: "context-only" | "unavailable" | "outside-pilot";
  dataset: MappedDatasetContext | null;
}
/** Metadata-only port: deliberately cannot return habitat evidence or a sampled feature. */
export interface MappedContextProvider {
  get(point: HabitatPoint): Promise<MappedContextResult>;
}
export async function getMappedContext(
  point: HabitatPoint,
  date: string,
  provider?: MappedContextProvider,
) {
  const assessment = assessMappedHabitat(point, date, []);
  let result: MappedContextResult = { status: "unavailable", dataset: null };
  try {
    if (provider) result = await provider.get(point);
  } catch {
    /* Keep independent evidence available. */
  }
  return { ...result, assessment };
}
