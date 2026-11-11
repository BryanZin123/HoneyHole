import {
  tripVerification,
  type TripInput,
} from "../application/trip-verification";
export function TripVerification(props: TripInput) {
  const summary = tripVerification(props);
  return (
    <section aria-label="Fishing Trip Verification">
      <h3>Fishing Trip Verification</h3>
      <p>
        <strong>{summary.eligibility}</strong> · Evidence for this trip, not
        permission, safety clearance or fishing suitability.
      </p>
      <dl>
        {summary.rows.map((r) => (
          <div key={r.id}>
            <dt>
              <strong>
                {r.title} — {r.status}
              </strong>
            </dt>
            <dd>
              <p>{r.text}</p>
              <p>
                <strong>Next:</strong> {r.next}
              </p>
              {r.sources
                .filter(Boolean)
                .slice(0, 3)
                .map((url, i) => (
                  <span key={url}>
                    <a href={url} target="_blank" rel="noreferrer">
                      {r.title} source {i + 1}
                    </a>{" "}
                  </span>
                ))}
            </dd>
          </div>
        ))}
      </dl>
      <p>
        Opening a source does not establish verification. No completion boxes,
        suitability scores, recommendations or notifications are enabled.
      </p>
    </section>
  );
}
