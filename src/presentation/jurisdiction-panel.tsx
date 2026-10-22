import type { resolveJurisdiction } from "../application/resolve-jurisdiction";
type Assessment = Awaited<ReturnType<typeof resolveJurisdiction>>;
const labels = {
  state: "State legal applicability",
  region: "Coastal management region",
  water: "Ocean or bay regulatory area",
  mpa: "Marine protected area jurisdiction",
  local: "Other local restrictions",
};
export function JurisdictionPanel({ assessment }: { assessment: Assessment }) {
  return (
    <section aria-label="Geographic jurisdiction">
      <h3>Geographic jurisdiction</h3>
      <p>
        Legal boundaries must be verified separately from park names and map
        overlays. Missing evidence does not mean an area is unrestricted.
      </p>
      <dl>
        {Object.entries(assessment.dimensions).map(([kind, value]) => (
          <div key={kind}>
            <dt>{labels[kind as keyof typeof labels]}</dt>
            <dd>
              {value.labels.join(", ") || "Not resolved"} · {value.status}.{" "}
              {value.reason}
            </dd>
          </div>
        ))}
      </dl>
      {assessment.providerStatus === "unavailable" && (
        <p>
          Jurisdiction source unavailable. No legal geographic applicability
          established.
        </p>
      )}
      <ul>
        {assessment.findings.map((f, i) => (
          <li key={`${f.id}-${i}`}>
            {f.label}: {f.status}. {f.reason}{" "}
            <a href={f.sourceUrl} target="_blank" rel="noreferrer">
              {f.attribution}
            </a>
            <p>
              Legal dates: {f.effectiveFrom ?? "unknown"} to{" "}
              {f.effectiveThrough ?? "unknown"}. Review:{" "}
              {f.verifiedOn ?? "not verified"}; due {f.reviewDue ?? "unknown"}.
              Retrieved: {f.retrievedAt}. Spatial classification:{" "}
              {f.spatialStatus}. Source uncertainty:{" "}
              {f.precisionMeters === null
                ? "unknown"
                : `${f.precisionMeters} m`}
              .
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
