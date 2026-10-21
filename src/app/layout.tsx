import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
export const metadata: Metadata = {
  title: "HoneyHole | California shore fishing",
  description:
    "California shore-fishing conditions with clear sources and uncertainty.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        <header>
          <Link className="brand" href="/">
            ◒ HoneyHole<span>CALIFORNIA COAST</span>
          </Link>
          <nav aria-label="Main navigation">
            <Link href="/">Dashboard</Link>
            <Link href="/conditions">Conditions</Link>
            <Link href="/explore">Explore</Link>
            <Link href="/saved">Saved places</Link>
            <Link href="/account">Account</Link>
          </nav>
        </header>
        <main id="main">{children}</main>
        <footer>
          <strong>HoneyHole</strong>
          <span>Know the conditions. Respect the coast.</span>
          <span>California shore fishing · In development</span>
        </footer>
      </body>
    </html>
  );
}
