# Blockers and remaining work

B001 RESOLVED — full available repository/history inspection found no recoverable source; continuation directive authorized initialization. Executable foundation now exists.

B002 OPEN — original board workflow has invalid JavaScript and unsafe event payload assumptions. Preserved as requested. Its API/project configuration remains unverified; not part of app runtime.

B003 OPEN — scientific species/habitat rules, legal/access datasets and complete provider research remain pending. No recommendation or legal-compliance claims are issued.

B004 DATA GAP — live NOAA 9414290 temperature request returned: "No data was found. This product may not be offered at this station at the requested time." Tide predictions worked. No fallback station selected without representativeness review.

B005 VERIFICATION — Playwright tests could not launch: expected Chromium binary absent. Browser installation failed with "End of central directory record signature not found". A runtime-reported default path was also absent, confirmed by filesystem inspection. No desktop/mobile browser assertions or screenshot review completed. Install Chromium with `npx playwright install chromium`, or supply a verified installed binary using PLAYWRIGHT_CHROMIUM_EXECUTABLE, then run npm run test:e2e.

Remaining work (not environmental blockers): weather forecast integration, geospatial mapping/access, explainable recommendations, official regulations, authentication/authorization, saved locations, catch logging, opt-in sharing and complete E2E validation. No external account or credential has been provisioned.


## 2026-10-18 engineering continuation
- NWS timestamp correction: COMPLETE — VERIFIED (adapter, regression and live API criteria).
- Environmental API integration gate: COMPLETE — VERIFIED for current station-based weather/tide functionality and tested live locations. Water temperature no-data is handled correctly; pressure, gusts, hazard analysis and full marine/surf products remain unavailable/unimplemented.
- Environmental browser experience: IMPLEMENTED — NOT FULLY VERIFIED (browser unavailable).
- Coastal evidence point-query slice: COMPLETE — VERIFIED for domain, adapter, API and component checks; visual browser verification remains outstanding.
- Full California coastal-access intelligence: PARTIALLY COMPLETE. Missing licensed shore-access entrance discovery, terrain classification, shoreline membership, interactive map, current closures and legally authoritative regulatory checks. The query envelope is only a coarse search guard, not proof of state/shoreline membership.
- Overall HoneyHole: PARTIALLY COMPLETE. Recommendation engine, current regulations, auth, private/public persistent pins, sharing, notification scheduling/delivery, full E2E, Android and iOS remain mandatory.
Next: sourced coastal-access point/shoreline discovery and closure/regulatory evidence; maintain unknown status until verified. Then explainable recommendation eligibility. Alerts remain blocked on forecasts, suitable recommendations, access/regulations, preferences, authentication and privacy.

Evidence: engineering-delivery.md, current-tests.json, current-live-contract.log, current-browser.log.


## Latest continuation — 2026-10-19 UTC
See weather-extension-delivery.md and weather-extension-tests.json: baseline 85 retained, final 102 tests pass. Cloud/gust/solar added, pressure/trend normalized when available, dashboard integrated. Browser remains blocked; selected station pressure unavailable. Overall PARTIALLY COMPLETE. Source/verification details and next milestone are in the delivery report.


## Discovery recovery — 2026-10-21 UTC
Latest delivery: [discovery-delivery.md](discovery-delivery.md). Preserved existing main working tree and features; recovery baseline 114 tests passed, final 126/126 passed, zero failures. Lint/typecheck/build passed, four production routes and live discovery/detail contracts passed. Genuine State Beach discovery, interactive Explore selection, selected-coordinate environmental data and independent access/regulatory evidence implemented. Browser BLOCKED by Firefox sandbox EPERM; map visual behavior not verified. CSP source is local/personal development only pending commercial approval. Overall PARTIALLY COMPLETE; discovery IMPLEMENTED — NOT FULLY VERIFIED. Pressure/light/water temperature unavailable in live Bean Hollow test; reference tides available, local transfer UNVERIFIED. Alerts remain inactive. Next: browser verification, production source clearance, effective-dated regulatory evidence and broader shoreline coverage.


## Effective-dated regulatory milestone — October 21, 2026
See [regulatory-delivery.md](regulatory-delivery.md) and ADR 007. Preserved 126-test baseline; final 153/153 passed, zero failed. Lint/typecheck/build passed. Four routes and live discovery/regulatory API contracts passed on retry after an initial preserved discovery 502; exact initial cause unconfirmed. Official FGC/CDFW source checks passed. Explore displays legal dates, reviewed coverage, findings and missing checks with species/date/method controls. California grunion closure and bag/possession only; no complete permission, no other species coverage. Future/outdated/unresolved evidence stays UNVERIFIED. Browser BLOCKED (Firefox page crash; Chromium absent); no reinstall or unsafe workaround. CSP commercial authorization unresolved, CPAD/NPS alternatives investigated without inventing entrance points. Overall PARTIALLY COMPLETE; regulatory milestone IMPLEMENTED — NOT FULLY VERIFIED. Next: authoritative jurisdiction mapping and surfperch/closure rules, commercially cleared points, supported-browser verification. All original nationwide/mobile/auth/pins/sharing/recommendation/notification requirements remain; alerts inactive.


## Accounts and source checkpoint — October 21, 2026
Accounts/Saved/preferences implemented; exact files and limitations in accounts-delivery.md. Baseline 153 passed, final 172 passed/0 failed; lint/typecheck/build passed; five production routes and isolated production HTTP restart/login/persistence workflow passed, including real Explore save. Browser BLOCKED. Overall PARTIALLY COMPLETE; local user workflow IMPLEMENTED — NOT FULLY VERIFIED in a browser. Source checkpoint on feature/honeyhole-foundation-checkpoint; actual Linux scratch path, Windows inaccessible. See source-checkpoint.md for independently verified commit/remote status. No alerts/public publishing/deployment. Regulatory coverage and CSP licensing remain limited.
