import type { WarningEvidence } from "../application/warning-provider";
function local(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
export function CoastalWarnings({ evidence }: { evidence?: WarningEvidence }) {
  return (
    <section aria-label="Official coastal warnings">
      <h3>Official coastal warnings</h3>
      <p>
        {evidence?.reason ??
          "Warning evidence was not supplied; hazard status is unknown."}
      </p>
      {evidence && (
        <>
          <p>
            Checked {local(evidence.retrievedAt)} California time. Assessment:{" "}
            {evidence.status}.
          </p>
          {evidence.alerts.map((a) => (
            <article key={a.id}>
              <h4>{a.event}</h4>
              <p>
                NWS severity: {a.severity}. {a.area}
              </p>
              <p>
                {a.applicability === "unknown"
                  ? "Geographic applicability unresolved."
                  : `Active product reported as of the time checked for this entrance (${a.applicability}).`}
              </p>
              <p>
                Effective {local(a.effective)}; expires {local(a.expires)}{" "}
                (California time).
              </p>
              <p>
                {a.period === "overlap"
                  ? "Published validity overlaps part of the selected California date; it does not establish coverage for the entire day or your optional time preference."
                  : a.period === "outside"
                    ? "Published validity does not cover the selected fishing date."
                    : "Selected-date applicability unknown."}
              </p>
              <p>
                {a.instruction ??
                  "No official instructions supplied; check the original product."}
              </p>
              <a href={a.sourceUrl}>Original NWS product</a>
              <details>
                <summary>Product timing and geographic metadata</summary>
                <p>
                  {a.id} · {a.sender} · urgency {a.urgency} · certainty{" "}
                  {a.certainty}
                </p>
                <p>
                  Issued {local(a.sent)}. Onset{" "}
                  {a.onset ? local(a.onset) : "not supplied"}. Event end{" "}
                  {a.ends ? local(a.ends) : "not supplied"}.
                </p>
                <p>{a.zones.join(", ")}</p>
              </details>
            </article>
          ))}
          <details>
            <summary>Warning query metadata</summary>
            <p>
              Published entrance: {evidence.coordinates.latitude},{" "}
              {evidence.coordinates.longitude}. Collection changed:{" "}
              {evidence.updatedAt ?? "unknown"}.{" "}
              <a href={evidence.sourceUrl}>NWS point-query source</a>
            </p>
          </details>
        </>
      )}
      <p>
        Future hazard status beyond published validity cannot yet be determined.
        Current alerts are not a comprehensive future-day forecast. Other
        hazards, including rip currents and sneaker waves, may exist. This is
        not a safety clearance or fishing permission. This evidence applies only
        to this entrance, not a separate fishing point.
      </p>
      <p>
        Before visiting, check current NWS products, park closures and local
        beach conditions. Do not use this assessment for navigation.
      </p>
    </section>
  );
}
