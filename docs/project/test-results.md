# Latest verification

See [engineering-delivery.md](engineering-delivery.md) and current-tests.json for the latest 85-test run and live/API/browser results. Earlier results below are historical.

# Executed verification

## Original repository baseline
Build/test/lint attempts failed ENOENT because package.json did not exist. No tests executed at that point.

## Foundation TDD
`npm test`: initial 8 assertion failures and 1 pass (readiness always returned ready). Implemented rule; 9 behavior tests pass. Dashboard component test adds 1 pass. Logs: foundation-red.log and foundation-green.log.

## Marine TDD
`npm test -- tests/noaa.test.ts`: 13 failures and 4 passes before adapter implementation. After implementation all 17 pass. Logs: marine-red.log and marine-green.log. Fixtures are isolated test data, not production observations.

## Latest checks
- npm test: 30 tests passed across 5 files (9 readiness, 17 NOAA, 1 dashboard, 1 marine component, 2 HTTP route tests).
- npm run lint: passed, zero warnings/errors.
- npm run typecheck: passed.
- npm run build: passed; four pages plus API route generated. A prior build failed TS2322 due to widened string literals in measurement mapping; explicit Measurement return annotation fixed it. A premature smoke run against the previous build saw API 404; rebuilt successfully before the passing live check.
- node scripts/smoke.mjs: four page routes returned HTTP 200 and expected content. Initial separate-shell smoke attempts could not reach the server due to per-command network isolation; the reproducible script starts server/client in one process tree.
- NODE_USE_ENV_PROXY=1 node scripts/smoke.mjs --live: station metadata and tides passed. Live data recorded in live-marine-check.log at 2026-10-18T18:18:31.355Z. Four predicted tide events, not observed water levels. Temperature unavailable; separate raw NOAA request confirmed provider no-data response.
- npm audit --omit=dev --json: reported zero known production dependency vulnerabilities. This is not a security certification; dev dependencies excluded. Output: dependency-audit.json.
- npm run test:e2e: BLOCKED before test assertions; Chromium absent. Installer returned invalid archive; runtime-reported fallback path also absent. Four test cases did not execute browser assertions. No screenshots verified.

Browser E2E must be rerun after a browser is installed. Live-provider checks are point-in-time evidence, not availability guarantees. No auth/privacy persistence tests exist because those features remain unimplemented.


## Latest continuation — 2026-10-19 UTC
See weather-extension-delivery.md and weather-extension-tests.json: baseline 85 retained, final 102 tests pass. Cloud/gust/solar added, pressure/trend normalized when available, dashboard integrated. Browser remains blocked; selected station pressure unavailable. Overall PARTIALLY COMPLETE. Source/verification details and next milestone are in the delivery report.


## Discovery recovery — 2026-10-21 UTC
Latest delivery: [discovery-delivery.md](discovery-delivery.md). Preserved existing main working tree and features; recovery baseline 114 tests passed, final 126/126 passed, zero failures. Lint/typecheck/build passed, four production routes and live discovery/detail contracts passed. Genuine State Beach discovery, interactive Explore selection, selected-coordinate environmental data and independent access/regulatory evidence implemented. Browser BLOCKED by Firefox sandbox EPERM; map visual behavior not verified. CSP source is local/personal development only pending commercial approval. Overall PARTIALLY COMPLETE; discovery IMPLEMENTED — NOT FULLY VERIFIED. Pressure/light/water temperature unavailable in live Bean Hollow test; reference tides available, local transfer UNVERIFIED. Alerts remain inactive. Next: browser verification, production source clearance, effective-dated regulatory evidence and broader shoreline coverage.


## Effective-dated regulatory milestone — October 21, 2026
See [regulatory-delivery.md](regulatory-delivery.md) and ADR 007. Preserved 126-test baseline; final 153/153 passed, zero failed. Lint/typecheck/build passed. Four routes and live discovery/regulatory API contracts passed on retry after an initial preserved discovery 502; exact initial cause unconfirmed. Official FGC/CDFW source checks passed. Explore displays legal dates, reviewed coverage, findings and missing checks with species/date/method controls. California grunion closure and bag/possession only; no complete permission, no other species coverage. Future/outdated/unresolved evidence stays UNVERIFIED. Browser BLOCKED (Firefox page crash; Chromium absent); no reinstall or unsafe workaround. CSP commercial authorization unresolved, CPAD/NPS alternatives investigated without inventing entrance points. Overall PARTIALLY COMPLETE; regulatory milestone IMPLEMENTED — NOT FULLY VERIFIED. Next: authoritative jurisdiction mapping and surfperch/closure rules, commercially cleared points, supported-browser verification. All original nationwide/mobile/auth/pins/sharing/recommendation/notification requirements remain; alerts inactive.


## Accounts and source checkpoint — October 21, 2026
Accounts/Saved/preferences implemented; exact files and limitations in accounts-delivery.md. Baseline 153 passed, final 172 passed/0 failed; lint/typecheck/build passed; five production routes and isolated production HTTP restart/login/persistence workflow passed, including real Explore save. Browser BLOCKED. Overall PARTIALLY COMPLETE; local user workflow IMPLEMENTED — NOT FULLY VERIFIED in a browser. Source checkpoint on feature/honeyhole-foundation-checkpoint; actual Linux scratch path, Windows inaccessible. See source-checkpoint.md for independently verified commit/remote status. No alerts/public publishing/deployment. Regulatory coverage and CSP licensing remain limited.
