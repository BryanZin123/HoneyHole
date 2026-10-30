import type { getMappedContext } from "../application/get-mapped-context";
export function MappedContextPanel({
  context,
}: {
  context: Awaited<ReturnType<typeof getMappedContext>>;
}) {
  const { dataset, assessment } = context;
  return (
    <section aria-label="Mapped habitat context">
      <h3>Mapped habitat context · {context.status}</h3>
      <p>
        Selected coordinate role: {assessment.point.kind}. This is separate from
        a fishing point, dataset feature and nearby environmental station.
      </p>
      <p>
        Verified location evidence: UNVERIFIED. No substrate pixel or feature
        has been sampled for this coordinate.
      </p>
      {context.status === "outside-pilot" && (
        <p>
          This location is outside the Half Moon Bay-area context prototype.
        </p>
      )}
      {context.status === "unavailable" && (
        <p>
          Live dataset metadata is unavailable or has changed. No replacement
          habitat classification is supplied.
        </p>
      )}
      {dataset && (
        <>
          <a href={dataset.sourceUrl} target="_blank" rel="noreferrer">
            {dataset.title}
          </a>
          <p>
            Classification basis: predicted, not a current field observation.
            Publication: {dataset.publishedOn}; observation dates:{" "}
            {dataset.observedOn ?? "unknown"}; metadata review:{" "}
            {dataset.reviewedOn}; service retrieved:{" "}
            {dataset.retrievedAt ?? "unavailable"}.
          </p>
          {dataset.service && (
            <p>
              Service item: {dataset.service.itemId}; CRS: {dataset.service.crs}
              ; resampled cell size: {dataset.service.resolutionMeters} m. This
              does not establish point accuracy.
            </p>
          )}
          <p>{dataset.scope}</p>
          <ul>
            {dataset.limitations.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
          <p>
            {dataset.attribution}{" "}
            <a href={dataset.licenseUrl} target="_blank" rel="noreferrer">
              {dataset.license}
            </a>
          </p>
        </>
      )}
      <ul>
        {assessment.reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      <p>
        Context cannot establish fish presence, legal permission, a fishing
        recommendation or alert eligibility.
      </p>
    </section>
  );
}
