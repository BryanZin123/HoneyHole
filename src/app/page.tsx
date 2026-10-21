import { MarinePanel } from "../presentation/marine-panel";
import { Dashboard } from "../presentation/dashboard";
export default function Home() {
  return (
    <>
      <Dashboard />
      <section className="page">
        <h2>Check live environmental evidence</h2>
        <MarinePanel />
      </section>
    </>
  );
}
