// Optional live CDFW feature probe; excluded from deterministic CI. No private coordinates.
import { CdfwShorelineProvider } from "../src/infrastructure/cdfw-shoreline";
import { shorelineDistance } from "../src/domain/shoreline-context";
async function main() {
  const r = await new CdfwShorelineProvider().get();
  console.log(
    JSON.stringify(
      {
        status: r.status,
        retrievedAt: r.retrievedAt,
        count: r.features.length,
        sources: [...new Set(r.features.map((f) => f.source))],
        examples: r.features
          .map((f) => ({
            id: f.id,
            shoreCode: f.shoreCode,
            source: f.source,
            description: f.description,
            distanceMeters: shorelineDistance(
              { latitude: 37.5, longitude: -122.5 },
              f.geometry,
            ),
          }))
          .sort((a, b) => a.distanceMeters - b.distanceMeters)
          .slice(0, 8),
      },
      null,
      2,
    ),
  );
  if (r.status !== "available" || !r.features.length) process.exitCode = 1;
}
void main();
