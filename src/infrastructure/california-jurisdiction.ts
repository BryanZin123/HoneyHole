import type {
  JurisdictionEvidence,
  JurisdictionProvider,
} from "../application/resolve-jurisdiction";
import type { Coordinates } from "../domain/geography";
import type { ShoreLocation } from "../domain/discovery";
import type { EvidenceResult } from "../domain/coastal";
/** Existing canonical park records and ds582 are context only, not surveyed legal boundaries. */
export class CaliforniaJurisdictionProvider implements JurisdictionProvider {
  constructor(
    private readonly location: ShoreLocation,
    private readonly protectedAreas: EvidenceResult,
  ) {}
  async getEvidence(point: Coordinates): Promise<JurisdictionEvidence[]> {
    if (
      point.latitude !== this.location.coordinates.latitude ||
      point.longitude !== this.location.coordinates.longitude
    )
      throw new Error("Jurisdiction location mismatch");
    const incomplete = {
      verifiedOn: null,
      reviewDue: null,
      effectiveFrom: null,
      effectiveThrough: null,
      precisionMeters: null,
      geometry: null,
    };
    return [
      {
        ...incomplete,
        id: "US-CA",
        kind: "state",
        label: "California (State Parks record context)",
        authority: "administrative",
        sourceUrl: this.location.sourceUrl,
        attribution: "California State Parks",
        retrievedAt: this.location.retrievedAt,
      },
      ...this.protectedAreas.records.map((r) => ({
        ...incomplete,
        id: r.id,
        kind: "mpa" as const,
        label: r.name,
        authority: "advisory" as const,
        sourceUrl: this.protectedAreas.source.url,
        attribution: this.protectedAreas.source.attribution,
        retrievedAt: this.protectedAreas.source.retrievedAt,
      })),
    ];
  }
}
