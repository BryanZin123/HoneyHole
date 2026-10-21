import Link from "next/link";
import { getDashboard } from "../application/get-dashboard";
export function Dashboard() {
  const dashboard = getDashboard();
  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">CALIFORNIA · SHORE FISHING</p>
          <h1>{dashboard.title}</h1>
          <p className="intro">
            A clearer picture of the water, the shoreline, and what you need to
            know before you go.
          </p>
          <Link className="button" href="/conditions">
            Check marine conditions <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <div className="coast-art" aria-hidden="true">
          <div className="sun" />
          <div className="wave wave-one" />
          <div className="wave wave-two" />
          <span>THE PACIFIC IS CALLING</span>
        </div>
      </section>
      <section className="section-head">
        <div>
          <p className="eyebrow">YOUR FIELD NOTES</p>
          <h2>Start with what we know.</h2>
        </div>
        <span className="badge">Foundation preview</span>
      </section>
      <div className="cards">
        <article className="card">
          <span className="number">01 / CONDITIONS</span>
          <h3>Read the water</h3>
          <p>
            Explore station observations and tide information. Availability
            varies by station.
          </p>
          <Link href="/conditions">Marine conditions →</Link>
        </article>
        <article className="card">
          <span className="number">02 / THE SHORELINE</span>
          <h3>Find your footing</h3>
          <p>
            Verified access, coastal habitat, and location recommendations are
            still being developed.
          </p>
          <Link href="/explore">Explore status →</Link>
        </article>
        <article className="card">
          <span className="number">03 / YOUR PLACES</span>
          <h3>Keep a good spot close</h3>
          <p>
            Private saved locations will be available after secure accounts and
            storage are implemented.
          </p>
          <Link href="/saved">Saved locations status →</Link>
        </article>
      </div>
      <section className="notice" aria-labelledby="readiness">
        <div>
          <p className="eyebrow">DATA & CONFIDENCE</p>
          <h2 id="readiness">No fishing recommendation yet</h2>
          <p>
            Selecting a station does not verify shoreline access or fishing
            regulations.
          </p>
        </div>
        <ul>
          {dashboard.readiness.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </section>
    </>
  );
}
