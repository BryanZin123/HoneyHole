import { MarinePanel } from "../../presentation/marine-panel";
export default function Conditions() {
  return (
    <section className="page">
      <p className="eyebrow">MARINE CONDITIONS · NOAA CO-OPS</p>
      <h1>Read the water.</h1>
      <p>
        Request water-temperature observations and predicted high and low tides
        for a California station.
      </p>
      <MarinePanel />
    </section>
  );
}
