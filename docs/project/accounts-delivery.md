# Accounts and persistent Honey Holes — October 21, 2026

Overall PARTIALLY COMPLETE. Account workflow IMPLEMENTED — NOT FULLY VERIFIED in a real browser. Local API/database behavior verified; not public-production readiness.

## Implementation
Preserved 153-test regulatory/environmental/discovery baseline. Better Auth 1.7.12 handles password cryptography and seven-day database-backed sessions. SQLite (better-sqlite3 13.0.3) persists users, credentials, sessions, owner-scoped pins and preferences. Official auth migrations plus versioned/checksummed application SQL; init never overwrites existing secret/data. No paid services.

Registration/login/logout, authenticated identity, expiration, server-side authorization, rate limits, bounded JSON and same-origin mutations implemented. Public JSON excludes password/session tokens. Recovery and email ownership verification are explicitly unavailable because no mail provider is configured.

Explore saves genuine selected entries after server-side source-coordinate resolution. Saved supports private custom pins, names/notes, list/map, editing, deletion, favorites and explicit sharing eligibility. Eligibility never changes PRIVATE visibility; no public pin endpoint. Source-backed coordinates cannot be edited into false source provenance. Custom pins can be edited. Duplicate policy rejects same owner/source ID or exact same owner/coordinates (409). Another owner's pin is indistinguishable from nonexistent (404). Owner IDs are not accepted in input.

Preferences persist regions, target species, favorites, units, IANA timezone, opt-in/out, lead time and quiet hours. Favorite IDs must belong to the session owner and are removed when a pin is deleted. Delivery remains inactive. Unit preferences are stored; environmental displays still label their normalized units.

## Exact files
New: src/domain/user-data.ts; src/application/user-data-repository.ts; src/application/account-http.ts; src/infrastructure/accounts.ts; src/infrastructure/sqlite-user-data.ts; src/infrastructure/account-runtime.ts; src/app/api/auth/[...all]/route.ts; src/app/api/v1/me/route.ts; src/app/api/v1/pins/route.ts; src/app/api/v1/pins/[id]/route.ts; src/app/api/v1/preferences/route.ts; src/app/account/page.tsx; src/presentation/account-panel.tsx; src/presentation/saved-places.tsx; src/presentation/save-location.tsx; migrations/001-user-data.sql; scripts/init-storage.ts; scripts/accounts-smoke.mjs; tests/user-data.test.ts; tests/accounts-integration.test.ts; tests/accounts-ui.test.tsx; ADR 008; this delivery report and accounts-* evidence.

Modified: package.json/package-lock.json, .gitignore, .env.example, src/app/saved/page.tsx, src/app/layout.tsx, src/app/globals.css, src/presentation/explore-discovery.tsx, src/presentation/explore-map.tsx (reusable map-point contract), docs/api/openapi.json, README and project progress/traceability/test-results/implementation-plan/blockers. Source checkpoint adds CI and recovery records separately.

## Verification actually executed
Baseline 153 passed. Final 172 executed / 172 passed / 0 failed. Added 19 tests: seven domain validation, eight actual-auth/SQLite integration and four UI tests. Auth tests use real cookie signing/password hashing, on-disk isolated databases, session expiration/logout, rate limiting, owner isolation, duplicates, invalid ownership/coordinates/body size, sharing restrictions, preferences and DB reopening. No mocked authorization used for database proof. RED module-missing runs preserved.

Lint, typecheck and production build passed. Five production pages passed HTTP checks. accounts-smoke.mjs --live-explore passed real registration, private CRUD, cookie/JSON protections, two-user denial, server restart, sign-in again, persisted pin/preferences, and real State Parks discovery → canonical private save/delete. API schema validation passed. Evidence accounts-tests.json, accounts-lint/typecheck/build.log and accounts-live-http.log. Production dependency audit reported zero known vulnerabilities at execution; that is not a guarantee of no vulnerabilities.

Browser BLOCKED: executable inventory repeated, Chromium absent, prior Firefox page crash/EPERM retained. No new browser assertions passed; no reinstall/security workaround. UI component tests are not browser proof. Setup initially hit tsx CLI IPC EPERM; supported Node --import tsx loader succeeded without changing security controls.

## Security and limitations
All private SQL predicates use session owner; FK constraints and UUID identifiers. No-store responses and sanitized auth JSON, HttpOnly SameSite Strict cookies, Secure on HTTPS, no shared cached session authorization. Exact configured Origin required for mutations; request bodies capped at 16 KB. Auth rate limits persist in DB. Local auth uses one fixed rate bucket rather than spoofable forwarded headers; a production proxy/abuse policy remains necessary. Registration can disclose account existence through outcome/status; no verified email ownership, MFA or recovery service yet. Do not use for public account hosting before those controls are reviewed.

Local secret/database excluded from Git and file permissions restricted; database is not encrypted at rest. Backups, disk encryption and hosting security are not implemented. Private map loading requires user action and reveals viewed tile area to OSM; names/notes are not sent. Secrets/real account data never included in tests, logs or Git checkpoints. This runtime's filesystem is scratch; durable source recovery must be verified via Git remote, not assumed from local presence.

## Remaining requirements
Broader species/jurisdiction/closure regulations, habitat and scientific recommendations, commercial CSP licensing or compatible entrance dataset, public/report/social sharing, verified email/recovery, production privacy hardening, background notification scheduling/delivery and full E2E. Alerts remain inactive; native Android/iOS not begun. Next functional milestone after verified source checkpoint: effective geographic/regulatory coverage and explainable eligibility, with production account hardening tracked independently.
