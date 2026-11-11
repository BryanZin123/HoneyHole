import type { getLocationDetail } from "./get-location-detail";
import type { getFishingPoint } from "./get-fishing-point";
import type { Coordinates } from "../domain/geography";
import type { ShoreLocation } from "../domain/discovery";
import type { WarningEvidence } from "./warning-provider";
import { selectConditions } from "../domain/selected-conditions";
export type TripDetail = Awaited<ReturnType<typeof getLocationDetail>>;
export type PointDetail = Awaited<ReturnType<typeof getFishingPoint>>;
export type TripStatus =
  | "SOURCE RECORD"
  | "AVAILABLE"
  | "MISSING"
  | "UNKNOWN"
  | "SOURCE FAILURE"
  | "CONFLICTING"
  | "OUTDATED"
  | "HISTORICAL"
  | "EXCLUDED";
export type TripRow = {
  id: string;
  title: string;
  status: TripStatus;
  text: string;
  next: string;
  sources: string[];
};
export type TripInput = {
  entrance: Pick<
    ShoreLocation,
    | "id"
    | "name"
    | "coordinates"
    | "sourceUrl"
    | "parkUrl"
    | "retrievedAt"
    | "datasetUpdatedAt"
  > & { eligibility?: "EXCLUDED" | "UNVERIFIED" };
  plan: { date: string; species: string; method: string; period?: string };
  detail?: TripDetail;
  warnings?: WarningEvidence;
  warningHistorical?: boolean;
  warningFailed?: boolean;
  point?: Coordinates | null;
  pointDetail?: PointDetail | null;
  now?: Date;
};
const same = (a: Coordinates, b: Coordinates) =>
  a.latitude === b.latitude && a.longitude === b.longitude;
/** Read-only projection. No providers, user checkboxes, eligibility promotion or storage. */
export function tripVerification({
  entrance: e,
  plan: p,
  detail: d,
  warnings: w,
  warningHistorical = false,
  warningFailed = false,
  point,
  pointDetail: pd,
  now = new Date(),
}: TripInput) {
  const park = e.parkUrl ?? e.sourceUrl,
    cdfw = "https://wildlife.ca.gov/Fishing/Ocean/Regulations";
  const matches =
    !d ||
    (d.location.id === e.id &&
      same(d.location.coordinates, e.coordinates) &&
      same(d.activity.coordinates, e.coordinates) &&
      d.activity.date === p.date &&
      d.activity.species === p.species &&
      d.activity.method === p.method);
  const excluded =
    e.eligibility === "EXCLUDED" ||
    (matches &&
      (d?.opportunity.eligibility === "EXCLUDED" ||
        d?.access.access.status === "restricted" ||
        d?.regulations.status === "VERIFIED_PROHIBITED"));
  const rows: TripRow[] = [
    {
      id: "identity",
      title: "Location identity",
      status: matches ? "SOURCE RECORD" : "CONFLICTING",
      text: `${e.name}, published entrance ${e.id}: ${e.coordinates.latitude}, ${e.coordinates.longitude}. Plan: ${p.date} (California), ${p.species || "target unassessed"}, ${p.method}. Retrieved ${e.retrievedAt ?? "unknown"}; catalog update ${e.datasetUpdatedAt ?? "unknown"} is not a current field inspection.`,
      next: matches
        ? "Confirm the intended access point; select an actual fishing coordinate separately."
        : "Repeat discovery and assessment: source or activity identity does not match this plan.",
      sources: [e.sourceUrl],
    },
  ];
  const access = matches ? d?.access.access : undefined;
  const conflict =
    access?.evidence?.records.some((r) => r.access === "restricted") &&
    access?.evidence?.records.some((r) => r.access === "verified-public");
  rows.push({
    id: "access",
    title: "Public access",
    status:
      access?.status === "restricted"
        ? "EXCLUDED"
        : conflict
          ? "CONFLICTING"
          : access?.evidence?.status === "unavailable"
            ? "SOURCE FAILURE"
            : access?.status === "verified-public"
              ? "SOURCE RECORD"
              : "UNKNOWN",
    text: access
      ? `${access.status}. ${access.evidence?.reason ?? "Published access classification is not proof the park is open today."}${conflict ? " Conflicting access records; restricted access retains exclusion precedence." : ""} Source retrieved ${access.evidence?.source.retrievedAt ?? "unknown"}.`
      : "Entrance catalog presence does not establish public access or current opening.",
    next: "Check current entry restrictions with the official park/land manager before travel.",
    sources: [
      park,
      ...(access?.evidence?.source.url ? [access.evidence.source.url] : []),
    ],
  });
  rows.push({
    id: "closures",
    title: "Current closures",
    status: "UNKNOWN",
    text: "No current, dated park-closure feed has been assessed. An access record, an old notice or no returned record cannot establish that the park is open. Conflicting or outdated closure information requires resolution with the land manager.",
    next: "Consult the official park notices or contact the land manager for closures applying to your trip date.",
    sources: [park],
  });
  const regs = matches ? d?.regulations : undefined;
  const stale = regs?.findings.some(
    (f) =>
      f.rule.reviewDue <
      now.toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" }),
  );
  rows.push({
    id: "regulations",
    title: "Fishing regulations",
    status:
      regs?.status === "VERIFIED_PROHIBITED"
        ? "EXCLUDED"
        : !matches
          ? "CONFLICTING"
          : stale
            ? "OUTDATED"
            : "UNKNOWN",
    text: regs
      ? `${regs.status}. ${regs.reason} ${regs.findings
          .slice(0, 2)
          .map(
            (f) =>
              `${f.rule.summary} Effective ${f.rule.effectiveFrom ?? "unknown"} through ${f.rule.effectiveTo ?? "no stated end"}; reviewed ${f.rule.verifiedOn}.`,
          )
          .join(
            " ",
          )} Jurisdiction: ${d?.jurisdiction?.dimensions.state.status ?? "UNVERIFIED"}; region ${d?.jurisdiction?.dimensions.region.status ?? "UNVERIFIED"}. ${stale ? "Some source reviews are overdue; retained applicable prohibitions are not cleared." : ""}`
      : "Species-, date-, method- and jurisdiction-specific permission is not established.",
    next: "Review the linked CDFW rules, local restrictions, MPA legal boundaries and emergency closures for the actual fishing point. Unknown coverage is not permission.",
    sources: [
      cdfw,
      ...new Set(regs?.findings.map((f) => f.rule.sourceUrl) ?? []),
    ],
  });
  const warningMatches = w && same(w.coordinates, e.coordinates);
  const age = w ? now.getTime() - Date.parse(w.retrievedAt) : NaN;
  const outdated =
    w &&
    (age > 120000 ||
      age < -120000 ||
      !Number.isFinite(age) ||
      w.alerts.some((a) => Date.parse(a.expires) <= now.getTime()));
  rows.push({
    id: "warnings",
    title: "Coastal warnings",
    status: warningFailed
      ? "UNKNOWN"
      : !w
        ? "MISSING"
        : !warningMatches
          ? "CONFLICTING"
          : w.status === "unknown"
            ? "UNKNOWN"
            : warningHistorical
              ? "HISTORICAL"
              : outdated
                ? "OUTDATED"
                : "AVAILABLE",
    text: warningFailed
      ? `Refresh unsuccessful; the latest warning assessment is unknown. ${w ? "Historical snapshot retrieved " + w.retrievedAt + "; not confirmed active now." : "See the dated historical snapshot below, if available."}`
      : !w
        ? "No usable current warning snapshot."
        : !warningMatches
          ? "Warning coordinates do not match this entrance."
          : `${w.status === "empty" ? "No active NWS alerts returned in this snapshot" : w.status === "unknown" ? w.reason : w.alerts.map((a) => `${a.event}: ${a.period === "overlap" ? "partial selected-date overlap" : a.period === "outside" ? "outside selected date" : "date applicability unknown"}; effective ${a.effective}, expires ${a.expires}, ends ${a.ends ?? "not supplied"}`).join("; ")}. Retrieved ${w.retrievedAt}; ${w.refresh?.delivery ?? "delivery metadata unavailable"}. County/zone applicability is not precise shoreline observation. ${warningHistorical || outdated ? "Historical evidence only; not confirmed active now." : ""}`,
    next: "Use Refresh official warnings below with consent. Future hazard status outside published validity remains unknown; absent warnings are not safety clearance.",
    sources: [
      w?.sourceUrl ?? "https://www.weather.gov/mtr/",
      ...(warningMatches ? w.alerts.map((a) => a.sourceUrl) : []),
    ],
  });
  const pm =
    point &&
    pd &&
    same(point, pd.point.coordinates) &&
    pd.date === p.date &&
    pd.species === p.species;
  rows.push({
    id: "habitat",
    title: "Fishing-point habitat",
    status: !point
      ? "MISSING"
      : pd && !pm
        ? "CONFLICTING"
        : !pd
          ? "MISSING"
          : pd.habitat.providerStatus === "unavailable"
            ? "SOURCE FAILURE"
            : pd.shoreline.conflictingGeometry
              ? "CONFLICTING"
              : pd.habitat.locationEvidence.status === "supported"
                ? "AVAILABLE"
                : "UNKNOWN",
    text: !point
      ? "Fishing point not yet assessed. No fishing coordinate is inferred from the entrance."
      : !pd
        ? `User-selected point ${point.latitude}, ${point.longitude}; evidence not loaded.`
        : !pm
          ? "Fishing-point evidence does not match this trip species/date/coordinate."
          : `User-selected point ${point.latitude}, ${point.longitude}. Species association ${pd.habitat.association.status}; location habitat ${pd.habitat.locationEvidence.status}. Historical shoreline context cannot establish current substrate, surf-zone habitat or fish presence.`,
    next: !point
      ? "Use Choose an actual fishing point and deliberately select on the map. No coordinates are snapped or inherited."
      : "Load/review independent point evidence for this plan. Verify actual habitat; entrance access, regulations and warnings do not transfer.",
    sources: pm
      ? (pd.habitat.association.profile?.sources.map((s) => s.url) ?? [])
      : [],
  });
  const view =
    matches && d?.weather && d.atmosphere && d.tides
      ? selectConditions({
          point: e.coordinates,
          date: p.date,
          weather: d.weather,
          atmosphere: d.atmosphere,
          marine: d.tides.conditions,
        })
      : null;
  const available =
    view &&
    [
      view.weather.periods.length ? "hourly forecast" : "",
      view.atmosphere.grid.values.length ? "grid fields" : "",
      view.marine?.tides.measurements.length ? "tide station reference" : "",
      view.marine?.waterTemperature.measurements.length
        ? "water-temperature station reference"
        : "",
      view.atmosphere.pressure.hPa !== null ? "pressure observation" : "",
      view.atmosphere.light.sunrise ? "calculated daylight" : "",
    ].filter(Boolean);
  rows.push({
    id: "environment",
    title: "Environmental availability — entrance",
    status: available?.length
      ? "AVAILABLE"
      : d?.weather?.status === "stale"
        ? "OUTDATED"
        : d?.weather?.status === "unavailable"
          ? "SOURCE FAILURE"
          : "MISSING",
    text: view
      ? `Selected-day products: ${available?.join(", ") || "none"}. Hourly source: ${d!.weather.status}, retrieved ${d!.weather.retrievedAt}; grid source: ${d!.atmosphere.grid.status}, retrieved ${d!.atmosphere.grid.retrievedAt}. Pressure observed ${d!.atmosphere.pressure.observedAt ?? "unknown"}, retrieved ${d!.atmosphere.pressure.retrievedAt}. Tide reference retrieved ${d!.tides.conditions?.tides.retrievedAt ?? "unavailable"}. ${d!.weather.reason ?? ""} Station references have unverified transfer to the entrance. Observations are not future forecasts.`
      : "No matching selected-date environmental assessment is loaded.",
    next: "Review dated products in the details below. If the trip is outside forecast coverage, return nearer the date. Missing/unreachable products are not unfavorable fishing conditions.",
    sources: d?.weather
      ? [
          d.weather.sourceUrl,
          ...(d.atmosphere?.grid.sourceUrl
            ? [d.atmosphere.grid.sourceUrl]
            : []),
        ]
      : [],
  });
  return {
    eligibility: excluded
      ? ("EXCLUDED" as const)
      : !matches
        ? ("NOT COMPARABLE" as const)
        : ("UNVERIFIED" as const),
    rows,
    recommendation: "unavailable" as const,
  };
}
