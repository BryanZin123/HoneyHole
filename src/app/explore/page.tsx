import { ExploreDiscovery } from "../../presentation/explore-discovery";
import { CoastalPanel } from "../../presentation/coastal-panel";
export default function Explore() {
  return (
    <section className="page">
      <p className="eyebrow">CALIFORNIA SHORELINE</p>
      <h1>A place worth knowing.</h1>
      <p>
        Check published coastal access evidence before planning your next visit.
        Locations are discovery results, not verified fishing recommendations.
      </p>
      <div className="notice">
        <p>
          Public access, protected areas, species rules, and local restrictions
          must be verified before a fishing location can be recommended.
        </p>
      </div>
      <ExploreDiscovery />
      <details>
        <summary>Check another coordinate for access evidence</summary>
        <CoastalPanel />
      </details>
    </section>
  );
}
