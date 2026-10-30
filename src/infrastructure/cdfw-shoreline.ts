import {
  interpretShoreCodes,
  shorelineGeometry,
  type ShorelineFeature,
  type ShorelineResult,
} from "../domain/shoreline-context";
export const SHORELINE_URL =
  "https://services2.arcgis.com/Uq9r85Potqm3MfRV/arcgis/rest/services/biosds3115_fnu/FeatureServer/0";
/** Fixed public pilot envelope only; no private point is accepted by this adapter. */
export class CdfwShorelineProvider {
  constructor(
    private readonly fetcher: typeof fetch = fetch,
    private readonly now: () => Date = () => new Date(),
  ) {}
  async get(): Promise<ShorelineResult> {
    try {
      const query = new URLSearchParams({
        f: "geojson",
        where: "1=1",
        geometry: "-122.65,37.35,-122.35,37.65",
        geometryType: "esriGeometryEnvelope",
        inSR: "4326",
        spatialRel: "esriSpatialRelIntersects",
        outSR: "4326",
        outFields:
          "OBJECTID,line,shore_code,source,esi_description,shoretype_1,shoretype_2,shoretype_3,shoretype_1_name,shoretype_2_name,shoretype_3_name",
        returnGeometry: "true",
        orderByFields: "OBJECTID",
        resultRecordCount: "2000",
      });
      const response = await this.fetcher(SHORELINE_URL + "/query?" + query, {
        signal: AbortSignal.timeout(10000),
        cache: "no-store",
      });
      if (!response.ok) throw Error("Unavailable");
      const data = await response.json();
      if (
        data.error ||
        data.exceededTransferLimit ||
        data.properties?.exceededTransferLimit ||
        data.type !== "FeatureCollection" ||
        !Array.isArray(data.features) ||
        data.features.length >= 2000
      )
        throw Error("Incomplete response");
      if (
        data.crs &&
        data.crs.properties?.name !== "EPSG:4326" &&
        data.crs.properties?.name !== "urn:ogc:def:crs:OGC:1.3:CRS84"
      )
        throw Error("Unexpected CRS");
      const rows = new Map<string, ShorelineFeature>();
      for (const f of data.features) {
        const p = f.properties;
        if (!p || !Number.isSafeInteger(p.OBJECTID) || p.OBJECTID < 0)
          throw Error("Missing identity");
        const text = (v: unknown, max = 300) =>
          typeof v === "string" && v.length <= max ? v : "";
        const shoreCode = text(p.shore_code, 25),
          codes = interpretShoreCodes(shoreCode);
        const orderedSourceTypes = [1, 2, 3]
          .map((i) => ({
            code: text(p["shoretype_" + i], 5).trim(),
            name: text(p["shoretype_" + i + "_name"], 100),
          }))
          .filter((t) => t.code);
        const source = text(p.source, 40) || null;
        const year = source?.match(/^ESI (\d{4})$/);
        const row: ShorelineFeature = {
          id: String(p.OBJECTID),
          line: text(p.line, 1),
          shoreCode,
          source,
          sourceYear: year ? Number(year[1]) : null,
          description: text(p.esi_description),
          orderedSourceTypes,
          codes,
          codeConflict:
            codes.map((c) => c.code).join("/") !==
            orderedSourceTypes.map((c) => c.code).join("/"),
          geometry: shorelineGeometry(f.geometry),
        };
        if (
          rows.has(row.id) &&
          JSON.stringify(rows.get(row.id)) !== JSON.stringify(row)
        )
          throw Error("Conflicting identity");
        rows.set(row.id, row);
      }
      return {
        status: rows.size ? "available" : "empty",
        retrievedAt: this.now().toISOString(),
        features: [...rows.values()],
      };
    } catch {
      return { status: "unavailable", retrievedAt: null, features: [] };
    }
  }
}
