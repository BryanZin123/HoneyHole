import type { ShoreDiscoveryProvider } from "../application/discover-shore";
import type {
  DiscoveryQuery,
  DiscoveryResult,
  ShoreLocation,
} from "../domain/discovery";
import { coastalCounties } from "../config/coastal-counties";
import { distanceKm, validateCoordinates } from "../domain/spatial";
export const parksSource =
  "https://services2.arcgis.com/AhxrK3F6WM8ECvDi/arcgis/rest/services/ParkEntryPoints/FeatureServer/2";
export class StateParksDiscovery implements ShoreDiscoveryProvider {
  constructor(
    private fetcher: typeof fetch = fetch,
    private now = () => new Date(),
  ) {}
  private async request(url: string) {
    const r = await this.fetcher(url, {
      signal: AbortSignal.timeout(10000),
      redirect: "error",
      cache: "no-store",
    });
    if (!r.ok) throw Error("Source HTTP error");
    return r.json();
  }
  async search(query: DiscoveryQuery): Promise<DiscoveryResult> {
    const base = {
      attribution: "California State Parks — Park Entry Points",
      license:
        "CSP terms: personal/public-sector use with attribution; commercial use requires CSP approval.",
    };
    try {
      if (
        query.county &&
        !(coastalCounties as readonly string[]).includes(query.county)
      )
        throw Error("Unsupported coastal county");
      if (query.center) {
        validateCoordinates(query.center);
        if (!query.radiusKm || query.radiusKm < 1 || query.radiusKm > 50)
          throw Error("Invalid radius");
      }
      const params = new URLSearchParams({
        f: "geojson",
        where: "PARK_NAME LIKE '% SB'",
        outFields: "*",
        outSR: "4326",
        returnGeometry: "true",
        resultRecordCount: "500",
        orderByFields: "OBJECTID",
      });
      const [body, meta] = await Promise.all([
        this.request(parksSource + "/query?" + params),
        this.request(parksSource + "?f=json").catch(() => null),
      ]);
      if (
        body.type !== "FeatureCollection" ||
        !Array.isArray(body.features) ||
        body.properties?.exceededTransferLimit ||
        body.exceededTransferLimit ||
        body.features.length >= 500
      )
        throw Error("Invalid or incomplete data");
      const stamp = meta?.editingInfo?.lastEditDate;
      const datasetUpdatedAt =
        typeof stamp === "number" &&
        Number.isFinite(stamp) &&
        stamp <= this.now().getTime()
          ? new Date(stamp).toISOString()
          : null;
      const locations: ShoreLocation[] = [];
      const seen = new Set<string>();
      for (const feature of body.features) {
        const p = feature.properties,
          c = feature.geometry?.coordinates;
        if (
          feature.geometry?.type !== "Point" ||
          !Array.isArray(c) ||
          typeof p?.PARK_NAME !== "string" ||
          !p.PARK_NAME.endsWith(" SB") ||
          !(coastalCounties as readonly string[]).includes(p.County) ||
          !Number.isInteger(p.OBJECTID)
        )
          continue;
        const coordinates = { latitude: c[1], longitude: c[0] };
        try {
          validateCoordinates(coordinates);
        } catch {
          continue;
        }
        if (query.county && p.County !== query.county) continue;
        if (
          query.center &&
          distanceKm(query.center, coordinates) > query.radiusKm!
        )
          continue;
        let parkUrl: null | string = null;
        try {
          const u = new URL(p.PARK_WEB_PG);
          if (
            ["www.parks.ca.gov", "parks.ca.gov"].includes(u.hostname) &&
            ["http:", "https:"].includes(u.protocol)
          ) {
            u.protocol = "https:";
            parkUrl = u.href;
          }
        } catch {}
        if (seen.has(String(p.OBJECTID))) continue;
        seen.add(String(p.OBJECTID));
        locations.push({
          id: String(p.OBJECTID),
          name: p.PARK_NAME,
          coordinates,
          type: "beach",
          county: p.County,
          access: "unknown",
          sourceUrl: parksSource,
          parkUrl,
          retrievedAt: this.now().toISOString(),
          datasetUpdatedAt,
          sourceFeature: feature,
        });
      }
      locations.sort((a, b) =>
        query.center
          ? distanceKm(query.center, a.coordinates) -
              distanceKm(query.center, b.coordinates) ||
            a.id.localeCompare(b.id)
          : a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
      );
      return { status: "available", locations, ...base };
    } catch {
      return {
        status: "unavailable",
        locations: [],
        reason:
          "State Parks discovery is unavailable or incomplete. No substitute locations generated.",
        ...base,
      };
    }
  }
  async get(id: string) {
    if (!/^\d{1,10}$/.test(id)) return null;
    const r = await this.search({});
    if (r.status !== "available")
      throw new Error("Discovery source unavailable");
    return r.locations.find((l) => l.id === id) ?? null;
  }
}
