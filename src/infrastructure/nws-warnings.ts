import type {
  CoastalWarning,
  WarningEvidence,
  WarningProvider,
} from "../application/warning-provider";
import type { Coordinates } from "../domain/geography";
import { containsCoordinate, validateCoordinates } from "../domain/spatial";
import { californiaDayWindow } from "../domain/california-day";
import { instant } from "./nws";
function obj(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== "object" || Array.isArray(v))
    throw Error("Malformed NWS response");
  return v as Record<string, unknown>;
}
function str(v: unknown): string {
  if (typeof v !== "string" || !v.trim()) throw Error("Missing NWS metadata");
  return v;
}
function choice(v: unknown, values: string[]) {
  const s = str(v);
  if (!values.includes(s)) throw Error("Unknown NWS classification");
  return s;
}
function link(v: unknown, kind: "alerts" | "zones") {
  const s = str(v),
    u = new URL(s);
  if (
    u.origin !== "https://api.weather.gov" ||
    u.username ||
    u.password ||
    u.search ||
    u.hash ||
    !u.pathname.startsWith("/" + kind + "/")
  )
    throw Error("Untrusted NWS source");
  return s;
}
/** Freshness concerns the HTTP response, not the age of a long-lived alert or last collection change. */
export class NwsWarnings implements WarningProvider {
  constructor(
    private fetcher: typeof fetch = fetch,
    private now: () => Date = () => new Date(),
  ) {}
  async get(coordinates: Coordinates, date: string): Promise<WarningEvidence> {
    validateCoordinates(coordinates);
    const day = californiaDayWindow(date);
    const sourceUrl = `https://api.weather.gov/alerts/active?point=${coordinates.latitude},${coordinates.longitude}`;
    const result: WarningEvidence = {
      status: "unknown",
      coordinates,
      sourceUrl,
      retrievedAt: this.now().toISOString(),
      updatedAt: null,
      alerts: [],
      reason: "Warning evidence unavailable.",
    };
    try {
      const r = await this.fetcher(sourceUrl, {
        headers: {
          "User-Agent":
            "HoneyHole/0.1 (https://github.com/BryanZin123/HoneyHole)",
          Accept: "application/geo+json",
        },
        redirect: "error",
        cache: "no-cache",
        signal: AbortSignal.timeout(8000),
      });
      const received = this.now().getTime();
      result.retrievedAt = new Date(received).toISOString();
      if (!r.ok)
        throw Error(
          `NWS returned HTTP ${r.status}; no warning assessment is available.`,
        );
      if (
        !/application\/(?:geo\+)?json/i.test(
          r.headers.get("content-type") ?? "",
        )
      )
        throw Error("Unexpected NWS response format.");
      if (r.url && r.url !== sourceUrl)
        throw Error("Unexpected NWS response URL");
      const httpDate = Date.parse(r.headers.get("date") ?? "");
      const age = Number(r.headers.get("age") ?? 0);
      if (
        !Number.isFinite(httpDate) ||
        !Number.isFinite(age) ||
        age < 0 ||
        age > 120 ||
        received - httpDate > 120000 ||
        httpDate - received > 120000
      )
        throw Error(
          "NWS response freshness could not be verified (two-minute limit).",
        );
      const v = obj(await r.json());
      if (
        v.type !== "FeatureCollection" ||
        !Array.isArray(v.features) ||
        v.features.length > 500 ||
        v.pagination
      )
        throw Error("Incomplete or malformed NWS query.");
      result.updatedAt = instant(v.updated);
      if (Date.parse(result.updatedAt) > received + 120000)
        throw Error("Conflicting NWS collection timestamp.");
      const products = v.features.map((f) => {
        const x = obj(f);
        if (x.type !== "Feature") throw Error("Malformed feature");
        return { feature: x, p: obj(x.properties) };
      });
      const seen = new Set<string>(),
        replaced = new Set<string>();
      for (const { p } of products) {
        const id = str(p.id);
        if (seen.has(id)) throw Error("Conflicting duplicate NWS identifiers");
        seen.add(id);
        choice(p.status, ["Actual", "Exercise", "System", "Test", "Draft"]);
        choice(p.messageType, ["Alert", "Update", "Cancel", "Ack", "Error"]);
        if (!Array.isArray(p.references))
          throw Error("Missing update references");
        if (
          p.status === "Actual" &&
          (p.messageType === "Cancel" || p.messageType === "Update")
        )
          for (const ref of p.references)
            replaced.add(str(obj(ref).identifier));
      }
      let uncertain = false;
      for (const { feature: f, p } of products) {
        const id = str(p.id),
          url = link(f.id, "alerts");
        if (decodeURIComponent(new URL(url).pathname.slice(8)) !== id)
          throw Error("Mismatched NWS alert identity");
        const sent = instant(p.sent),
          effective = instant(p.effective),
          expires = instant(p.expires),
          onset = p.onset == null ? null : instant(p.onset),
          ends = p.ends == null ? null : instant(p.ends);
        if (
          Date.parse(sent) > received + 120000 ||
          Date.parse(effective) >= Date.parse(expires) ||
          (onset && ends && Date.parse(onset) >= Date.parse(ends))
        )
          throw Error("Conflicting NWS validity timestamps");
        if (
          p.status !== "Actual" ||
          !["Alert", "Update"].includes(String(p.messageType)) ||
          replaced.has(id) ||
          Date.parse(expires) <= received ||
          (ends && Date.parse(ends) <= received)
        )
          continue;
        if (Date.parse(effective) > received) {
          uncertain = true;
          continue;
        }
        const zones = Array.isArray(p.affectedZones)
          ? p.affectedZones.map((z) => link(z, "zones"))
          : [];
        const ugc = obj(p.geocode).UGC;
        let applicability: CoastalWarning["applicability"] = "unknown";
        if (f.geometry != null) {
          if (containsCoordinate(coordinates, f.geometry))
            applicability = "polygon";
          else {
            uncertain = true;
            continue;
          }
        } else if (
          Array.isArray(ugc) &&
          ugc.length &&
          ugc.every(
            (x) => typeof x === "string" && /^[A-Z]{2}[CZ]\d{3}$/.test(x),
          ) &&
          zones.length &&
          zones.every((z) => ugc.includes(z.split("/").pop()))
        )
          applicability = "NWS point/zone";
        if (applicability === "unknown") uncertain = true;
        const start = Math.max(
            Date.parse(effective),
            onset ? Date.parse(onset) : Date.parse(effective),
          ),
          end = Math.min(
            Date.parse(expires),
            ends ? Date.parse(ends) : Date.parse(expires),
          );
        result.alerts.push({
          id,
          sourceUrl: url,
          event: str(p.event),
          sender: str(p.senderName),
          area: str(p.areaDesc),
          severity: choice(p.severity, [
            "Extreme",
            "Severe",
            "Moderate",
            "Minor",
            "Unknown",
          ]),
          urgency: choice(p.urgency, [
            "Immediate",
            "Expected",
            "Future",
            "Past",
            "Unknown",
          ]),
          certainty: choice(p.certainty, [
            "Observed",
            "Likely",
            "Possible",
            "Unlikely",
            "Unknown",
          ]),
          sent,
          effective,
          onset,
          expires,
          ends,
          instruction: p.instruction == null ? null : str(p.instruction),
          zones,
          applicability,
          period:
            applicability === "unknown"
              ? "unknown"
              : start < Date.parse(day.end) && end > Date.parse(day.start)
                ? "overlap"
                : "outside",
        });
      }
      result.status = uncertain
        ? "unknown"
        : result.alerts.length
          ? "available"
          : products.length
            ? "unknown"
            : "empty";
      result.reason = uncertain
        ? "Some returned products have unresolved geographic or temporal applicability."
        : result.status === "empty"
          ? "No active NWS alerts were returned for this published entrance coordinate at the time checked. Other hazards may exist. This is not a safety clearance."
          : result.status === "unknown"
            ? "Returned products were expired, cancelled or otherwise inapplicable; a complete current assessment cannot be established."
            : "NWS active products for this entrance; county/zone coverage is broader than a precise shoreline hazard observation.";
    } catch (e) {
      result.status = "unknown";
      result.alerts = [];
      result.reason = e instanceof Error ? e.message : "NWS retrieval failed.";
    }
    return result;
  }
}
