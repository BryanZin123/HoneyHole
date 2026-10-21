import type { Coordinates } from "../domain/geography";
import type { CoastalAssessment, EvidenceResult } from "../domain/coastal";
import { validateCoordinates } from "../domain/spatial";
export interface CoastalProvider {
  regionId: string;
  supports(point: Coordinates): boolean;
  accessAt(point: Coordinates): Promise<EvidenceResult>;
  protectedAreasAt(point: Coordinates): Promise<EvidenceResult>;
}
export async function assessCoastalAccess(
  point: Coordinates,
  provider: CoastalProvider,
): Promise<CoastalAssessment> {
  validateCoordinates(point);
  if (!provider.supports(point))
    throw new Error("Coordinates outside configured region search envelope");
  const [access, protectedAreas] = await Promise.all([
    provider.accessAt(point),
    provider.protectedAreasAt(point),
  ]);
  const statuses = access.records.map((record) => record.access);
  const status =
    access.status !== "available"
      ? "unknown"
      : statuses.includes("restricted")
        ? "restricted"
        : statuses.length && statuses.every((s) => s === "verified-public")
          ? "verified-public"
          : "unknown";
  return {
    coordinates: point,
    regionId: provider.regionId,
    access: { status, evidence: access },
    protectedAreas,
    fishingPermission: "unknown",
    temporaryClosures: "unknown",
    speciesRegulations: "unknown",
    legallyVerified: false,
  };
}
