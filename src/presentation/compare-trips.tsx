import { compareTrips } from "../application/compare-trips";
import type { TripInput } from "../application/trip-verification";
export function CompareTrips({
  areas,
  onReview,
  onClose,
}: {
  areas: TripInput[];
  onReview: (id: string) => void;
  onClose: () => void;
}) {
  let sides: ReturnType<typeof compareTrips>;
  try {
    sides = compareTrips(areas);
  } catch (e) {
    return (
      <section aria-label="Compare coastal areas">
        <h2>NOT COMPARABLE</h2>
        <p>{e instanceof Error ? e.message : "Invalid comparison"}</p>
        <button onClick={onClose}>Return to single area</button>
      </section>
    );
  }
  return (
    <section aria-label="Compare coastal areas">
      <h2>Compare two coastal areas</h2>
      <p>
        Same trip: {areas[0].plan.date} (California) ·{" "}
        {areas[0].plan.species || "target unassessed"} · {areas[0].plan.method}{" "}
        · {areas[0].plan.period ?? "unspecified time"}. Time is a planning
        preference, not time-specific clearance.
      </p>
      <p>
        Differences in available evidence are not differences in fishing
        quality. Warning snapshots have independent retrieval times, not
        simultaneous current conditions. Absence of alerts does not prove a
        hazard ended.
      </p>
      <button onClick={onClose}>Return to single area</button>
      <div className="comparison-pair">
        {sides.map(({ input, evidenceLoaded, summary }) => (
          <article key={input.entrance.id}>
            <h3>{input.entrance.name}</h3>
            <p>
              Published entrance {input.entrance.id}:{" "}
              {input.entrance.coordinates.latitude},{" "}
              {input.entrance.coordinates.longitude}
            </p>
            <strong>{summary.eligibility}</strong>
            <p>
              {evidenceLoaded
                ? "Individually loaded assessment"
                : "Evidence not loaded"}
            </p>
            <button onClick={() => onReview(input.entrance.id)}>
              Review {input.entrance.name}
            </button>
            <p>
              Review this entrance to give or withdraw consent, load evidence or
              explicitly refresh its warnings. Selecting it alone sends no
              provider requests.
            </p>
          </article>
        ))}
      </div>
      {sides[0].summary.rows.map((row, i) => (
        <section key={row.id} aria-label={`Compare ${row.title}`}>
          <h3>{row.title}</h3>
          <div className="comparison-pair">
            {sides.map(({ input, summary }) => {
              const r = summary.rows[i];
              return (
                <article
                  key={input.entrance.id}
                  aria-label={`${input.entrance.name}: ${r.title}`}
                >
                  <h4>
                    {input.entrance.name} — {r.status}
                  </h4>
                  <p>{r.next}</p>
                  <details>
                    <summary>Facts, source dates and limitations</summary>
                    <p>{r.text}</p>
                    {r.sources.filter(Boolean).map((url, n) => (
                      <p key={url}>
                        <a href={url} target="_blank" rel="noreferrer">
                          Source {n + 1}
                        </a>
                      </p>
                    ))}
                  </details>
                </article>
              );
            })}
          </div>
        </section>
      ))}
      <p>
        No winner, suitability score, fishing permission or safety clearance.
        Current closures remain unknown without authoritative dated evidence.
      </p>
    </section>
  );
}
