// Optional LIVE metadata verification; deliberately excluded from deterministic CI.
import { CdfwMappedContext } from "../src/infrastructure/cdfw-mapped-context";
import { getMappedContext } from "../src/application/get-mapped-context";
async function main() {
  const result = await getMappedContext(
    {
      id: "engineering-envelope-check",
      kind: "unknown",
      accuracyMeters: null,
      // Operational probe only: not an invented fishing location or public-access claim.
      coordinates: { latitude: 37.5, longitude: -122.5 },
    },
    new Date().toISOString().slice(0, 10),
    new CdfwMappedContext(),
  );
  console.log(
    JSON.stringify(
      {
        status: result.status,
        dataset: result.dataset,
        assessmentStatus: result.assessment.status,
        featureCount: result.assessment.features.length,
      },
      null,
      2,
    ),
  );
  if (result.status !== "context-only") process.exitCode = 1;
}
void main();
