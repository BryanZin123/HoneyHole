import type { CoastalProvider } from "../application/assess-coastal-access";
import type { Coordinates } from "../domain/geography";
import type { EvidenceResult, GeographicEvidence } from "../domain/coastal";
import { containsCoordinate, validateCoordinates } from "../domain/spatial";
const sources = {
  access: {
    url: "https://gis.cnra.ca.gov/arcgis/rest/services/Boundaries/CPAD_AccessType/MapServer/0",
    attribution:
      "California Protected Areas Database (CPAD), GreenInfo Network; California Natural Resources Agency",
    datasetVersion: "CPAD 2026a, June 2026",
  },
  mpa: {
    url: "https://services2.arcgis.com/Uq9r85Potqm3MfRV/arcgis/rest/services/biosds582_fpu/FeatureServer/0",
    attribution:
      "California Department of Fish and Wildlife, Marine Region GIS Lab",
    datasetVersion:
      "ds582; advisory geometry, current legal boundaries unverified",
  },
};
export class CaliforniaCoastalProvider implements CoastalProvider {
  readonly regionId = "california-coast";
  constructor(
    private readonly fetcher: typeof fetch = fetch,
    private readonly now: () => Date = () => new Date(),
  ) {}
  supports(p: Coordinates): boolean {
    // Coarse query envelope only: never evidence of California or shoreline membership.
    return (
      p.latitude >= 32 &&
      p.latitude <= 42.1 &&
      p.longitude >= -125 &&
      p.longitude <= -114
    );
  }
  accessAt(p: Coordinates) {
    return this.query(p, "access");
  }
  protectedAreasAt(p: Coordinates) {
    return this.query(p, "mpa");
  }
  private async query(
    p: Coordinates,
    kind: keyof typeof sources,
  ): Promise<EvidenceResult> {
    validateCoordinates(p);
    if (!this.supports(p)) throw new Error("Coordinates outside region");
    const source = {
      ...sources[kind],
      license: "Creative Commons Attribution (California Open Data catalog)",
      retrievedAt: this.now().toISOString(),
    };
    try {
      const url = new URL(source.url + "/query");
      url.search = new URLSearchParams({
        f: "geojson",
        where: "1=1",
        geometry: JSON.stringify({
          x: p.longitude,
          y: p.latitude,
          spatialReference: { wkid: 4326 },
        }),
        geometryType: "esriGeometryPoint",
        inSR: "4326",
        outSR: "4326",
        spatialRel: "esriSpatialRelIntersects",
        outFields:
          kind === "access"
            ? "OBJECTID,UNIT_NAME,ACCESS_TYP"
            : "OBJECTID,FULLNAME,Type",
        returnGeometry: "true",
        resultRecordCount: "100",
        orderByFields: "OBJECTID",
      }).toString();
      const response = await this.fetcher(url, {
        signal: AbortSignal.timeout(10000),
        redirect: "error",
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Provider HTTP error");
      const body = await response.json();
      source.retrievedAt = this.now().toISOString();
      if (
        body.error ||
        body.type !== "FeatureCollection" ||
        !Array.isArray(body.features) ||
        body.exceededTransferLimit ||
        body.properties?.exceededTransferLimit ||
        body.features.length >= 100
      )
        throw new Error("Incomplete or invalid geographic response");
      const records: GeographicEvidence[] = [];
      for (const feature of body.features) {
        if (
          feature.type !== "Feature" ||
          !feature.properties ||
          !["number", "string"].includes(typeof feature.properties.OBJECTID)
        )
          throw new Error("Invalid feature");
        if (!containsCoordinate(p, feature.geometry)) continue;
        const props = feature.properties;
        const raw =
          typeof props.ACCESS_TYP === "string" ? props.ACCESS_TYP : null;
        records.push({
          id: String(props.OBJECTID),
          name:
            typeof (props.UNIT_NAME ?? props.FULLNAME) === "string"
              ? (props.UNIT_NAME ?? props.FULLNAME)
              : "Unnamed source area",
          access:
            raw === "Open Access"
              ? "verified-public"
              : raw === "Restricted Access" || raw === "No Public Access"
                ? "restricted"
                : "unknown",
          sourceAccessValue: raw,
          shoreType: "unknown",
          designation: typeof props.Type === "string" ? props.Type : null,
        });
      }
      return { status: "available", records, source };
    } catch {
      return {
        status: "unavailable",
        records: [],
        source,
        reason:
          "Geographic provider unavailable, incomplete or invalid. Access and fishing permission cannot be inferred.",
      };
    }
  }
}
