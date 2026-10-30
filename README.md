# HoneyHole

California shore-fishing intelligence, under incremental development. Overall status: PARTIALLY COMPLETE. Source recovery and Git checkpoints are documented in `docs/project/source-checkpoint.md`.

## Local setup

Use Node.js 24 and npm. From the repository root:

```sh
npm ci
npm run db:init
npm run dev
```

Native SQLite installation may require a C++ build toolchain and matching Node headers. This container required `npm_config_nodedir` pointing to separately extracted official Node 24.19.0 headers because node-gyp header extraction failed with `fchown EINVAL`; ordinary `npm ci` here was not independently successful. See checkpoint verification records.

Open http://localhost:3000. Register at `/account`, select a shoreline location in `/explore`, save privately, and manage pins and preferences in `/saved`. Custom pins use validated latitude/longitude. Sharing eligibility never publishes coordinates. Alerts are inactive.

The init command creates local `.data/honeyhole.sqlite` and a random `.data/auth-secret`, preserving existing values. This directory is ignored by Git. Copy `.env.example` to `.env.local` only when changing configuration. `BETTER_AUTH_URL` must exactly match the browser origin. Init reads `.env.local`; deployed shells can provide environment variables. Never expose the secret with NEXT_PUBLIC_. Restart after changing configuration.

SQLite and the secret must remain on durable private storage. Back up the entire data directory with the server stopped, or use SQLite's supported backup API. Git checkpoints contain source and migrations, not account data or secrets. Loss of the secret invalidates existing sessions. Email verification/password recovery are not configured; this local version is not ready for public account hosting.

## Quality gates

```sh
npm test
npm run typecheck
npm run lint
npm run build
node scripts/accounts-smoke.mjs
npm audit --omit=dev --audit-level=high
```

The account smoke test creates an isolated temporary database, starts/stops its own production server on port 3111, checks authentication/authorization, restarts the server, verifies saved-data persistence and cleans up only its own fixture directory. Tests use synthetic `example.test` accounts. No external service is needed unless `--live-explore` is supplied. Latest checked unit/component/integration suite: 255 passed, 0 failed; lint/typecheck/build passed. GitHub CI runs deterministic checks on feature pushes and pull requests; its remote result must be checked separately.

Optional live checks after building:

```sh
node scripts/smoke.mjs --live --coastal
node scripts/smoke.mjs --discovery --regulations
node scripts/verify-regulatory-sources.mjs
node scripts/accounts-smoke.mjs --live-explore
```

On Node 24 behind a permitted environment HTTP proxy, prefix live commands with `NODE_USE_ENV_PROXY=1`. Live checks intentionally fail when required providers are unavailable. Source-content checks do not automatically renew legal evidence.

For a compatible browser environment: install Chromium with `npx playwright install --with-deps chromium`, build, then `npm run test:e2e`. A separate GitHub Actions Chromium job runs desktop/mobile navigation, provider-error handling, registration/login, real Explore marker selection, private pin save/edit/delete, second-user isolation, and persistence after a controlled application restart. A test-only preload supplies synthetic discovery data and provider outages; no live provider availability is required. Tests initialize and remove their own temporary database and authentication secret. There is no application test-mode bypass. Reports/traces are retained by CI for seven days; generated reports are excluded from Git and lint. Phase A passed six browser cases in [run 40824472722](https://github.com/BryanZin123/HoneyHole/actions/runs/40824472722). The habitat phase adds two cases; check its exact commit's CI result. Local Chromium download remains unavailable in the AI sandbox, which does not prevent browser verification on the supported runner.

## Implemented scope and limits

- Next.js/React/TypeScript dashboard, conditions, Explore, Saved and Account pages.
- Real NOAA tides/water-temperature handling and NWS weather/atmosphere with provenance, freshness policy and explicit missing data. Nearby tides are reference-only unless transfer relevance is verified.
- State Beach entry discovery, county/radius searches, Leaflet/OSM map, independent CPAD public-access and advisory CDFW MPA evidence. State Parks commercial use needs prior approval; current adapter is for local/personal development. No public deployment.
- Effective-dated California grunion closure/bag/possession slice: reviewed activity dates 2026-01-01 through 2026-10-21, review due 2026-10-28. Other dates/species and incomplete checks remain UNVERIFIED. No complete fishing permission or scientific recommendation is produced.
- Barred surfperch descriptive habitat evidence, dated CDFW sources and separate point-level habitat status in Explore. Current park-entry data supplies no reviewed substrate/surf-zone observations; habitat remains missing and species presence unassessed. No numerical catch score or positive recommendation.
- Better Auth + SQLite accounts, private owner-scoped pin CRUD, custom coordinates, favorites and preferences. Secure cookie flags follow HTTPS; local HTTP is loopback-only. No email recovery, public publication, social posting or notification delivery. Measurement preferences are persisted; environmental panels retain explicit normalized source units.
- Private maps load third-party tiles only when requested; tile requests reveal the viewed area, not pin names/notes. Database is not encrypted at rest. Production needs HTTPS, durable storage/backups, verified-email/recovery delivery, appropriate abuse controls and cleared source licensing.

## Architecture and recovery

`src/domain`: framework-free rules/models. `src/application`: use cases and ports. `src/infrastructure`: providers, auth and SQLite. `src/presentation`: UI. `src/app`: Next routes. Migrations are in `migrations/`; Better Auth's pinned version supplies its official auth-schema migration. See ADR 008 and `docs/project/accounts-delivery.md` for safeguards and exact files.

Never develop directly on main, reset away changes, or force-push. Inspect → implement → verify → checkpoint commit → push feature branch → verify remote hash. Keep source/migrations/tests/lockfile/docs in Git, credentials/databases/builds out. `docs/project/traceability.md` preserves all original requirements: nationwide expansion, recommendations, broader regulations/habitat, public sharing, alerts, Android then iOS. None are removed. Historical README is preserved in `docs/project/original-README.md`; historical INSTALL.md is retained, but this README is the executable setup guide.

### Georeferenced habitat context prototype
Explore includes a metadata-only CDFW ds3091 context panel for the Half Moon Bay-area engineering envelope (37.35–37.65 N, -122.65–-122.35 W). It does not sample raster classes or establish beach sand, surf-zone habitat or fish presence. Park entrances remain distinct from fishing points; verified location evidence remains UNVERIFIED. Dataset license, dates, provenance, uncertainties and three-source evaluation: [pilot report](docs/project/georeferenced-habitat-pilot.md). Optional live metadata check: `node --import tsx scripts/mapped-context-smoke.ts`. Deterministic CI uses controlled fixtures and does not depend on live GIS/weather services.
