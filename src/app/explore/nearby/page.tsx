import Link from "next/link";
import { NearbyAreas } from "../../../presentation/nearby-areas";
export default function NearbyPage() {
  return (
    <section className="page">
      <Link href="/explore">Back to Explore</Link>
      <p className="eyebrow">California shoreline</p>
      <h1>Find fishing areas near me</h1>
      <p>
        Compare State Beach entrances to research before a trip. These are
        access-point records, not fishing positions.
      </p>
      <NearbyAreas />
    </section>
  );
}
