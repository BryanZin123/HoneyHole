import type { getHabitatAssessment } from "../application/get-habitat-assessment";
type Assessment = Awaited<ReturnType<typeof getHabitatAssessment>>;
export function HabitatPanel({ assessment }: { assessment: Assessment }) {
  const profile = assessment.association.profile;
  return (
    <section aria-label="Species habitat evidence">
      <h3>Documented habitat association</h3>
      {profile ? (
        <>
          <p>
            {profile.commonName} · <i>{profile.scientificName}</i>
          </p>
          <ul>
            {profile.facts.map((fact, index) => (
              <li key={index}>
                {fact.statement}{" "}
                {fact.sourceIds.map((id) => {
                  const source = profile.sources.find((s) => s.id === id)!;
                  return (
                    <a
                      key={id}
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      [{source.id}]{" "}
                    </a>
                  );
                })}
              </li>
            ))}
          </ul>
          <details>
            <summary>Habitat sources and limitations</summary>
            {profile.sources.map((source) => (
              <div key={source.id}>
                <a href={source.url} target="_blank" rel="noreferrer">
                  {source.title}
                </a>
                <p>
                  {source.attribution}. Publication:{" "}
                  {source.published ?? "not supplied"}; evidence reviewed{" "}
                  {source.reviewedOn}. Scope: {source.geographicScope}.{" "}
                  {source.limitations}
                </p>
              </div>
            ))}
            <ul>
              {profile.limitations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </details>
        </>
      ) : (
        <p>
          No reviewed habitat profile for this selection. This milestone covers
          barred surfperch only.
        </p>
      )}
      <h3>Location habitat evidence · {assessment.locationEvidence.status}</h3>
      <p>
        A park entrance is not a surveyed fishing position. Species presence
        remains unassessed.
      </p>
      <ul>
        {assessment.locationEvidence.attributes.map((attribute) => (
          <li key={attribute.attribute}>
            {attribute.attribute === "substrate"
              ? "Sandy substrate"
              : "Surf-zone position"}
            : {attribute.status}. {attribute.reason}
            {attribute.evidence.map((e) => (
              <p key={e.id}>
                <a href={e.sourceUrl} target="_blank" rel="noreferrer">
                  {e.attribution}
                </a>{" "}
                · {e.verification} · {e.basis} · reviewed {e.reviewedOn};
                covered {e.validFrom}–{e.validThrough}. Classification:{" "}
                {e.value}.
              </p>
            ))}
          </li>
        ))}
      </ul>
      {assessment.providerStatus === "unavailable" && (
        <p>
          Some habitat evidence is unavailable; no substitute location
          classification supplied.
        </p>
      )}
      <p>{assessment.explanation}</p>
      <p>
        Fishing recommendation: unavailable. Habitat matching does not override
        regulatory exclusions or establish environmental safety.
      </p>
    </section>
  );
}
