# Prioritized implementation plan

1. DONE: B001 resolved by full Git inspection and continuation authorization. Foundation implemented; documented catch logging remains in scope.
2. DONE for foundation: runnable Next app, locked dependencies, 30 automated tests, build/lint/typecheck and HTTP smoke checks. Browser verification blocked; master requirement acceptance mapping remains incremental.
3. Document actual/proposed architecture, data model, dependency direction and ADRs. Address authentication and private coordinate authorization boundaries early.
4. Research official regulation, access, environmental and habitat sources; capture source, timestamps, licensing, missing states and uncertainty. No assumed current regulations.
5. Implement normalized environmental adapters and regulation/access exclusion rules with unit and contract tests.
6. Implement species-aware explainable recommendation behavior using documented evidence and explicitly labeled configurable heuristics where needed.
7. Implement accounts, private-by-default saved map locations, editing/deleting and unauthorized access tests.
8. Add preserved catch logging, supported opt-in sharing, responsive interfaces, integration and end-to-end tests.
9. Verify full traceability and quality gates, documenting remaining blockers. Do not label the product complete until all mandatory criteria pass.

Each milestone follows requirement → acceptance criteria → failing test → implementation → passing test → architecture review → evidence update. Detailed design is pending B001, not silently chosen.


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
