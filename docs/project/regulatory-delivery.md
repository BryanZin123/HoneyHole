# Regulatory intelligence delivery — October 21, 2026

Overall HoneyHole: PARTIALLY COMPLETE. Effective-dated regulatory slice: IMPLEMENTED — NOT FULLY VERIFIED with the bounded rule coverage below; browser verification remains outstanding. Browser verification remains BLOCKED. This does not claim comprehensive California coverage.

## A. Functional implementation
Preserved main branch and all prior modified/untracked files, discovery/map features, NWS/NOAA conditions, station selection, CPAD/CDFW evidence and notification contracts. Baseline rerun confirmed 126/126 tests. No clone/reset, public deployment, commit or push.

Added provider-neutral effective-dated rule evaluation and a replaceable California adapter. Findings include authoritative source, legal effect, reviewed coverage, reason, conditions and missing/conflicting checks. Dates, jurisdiction, species, method and authoritative geographic scope all participate in evaluation. Unknown, stale and contradictory evidence cannot grant permission. Provider failure returns UNVERIFIED. Independent proven prohibitions remain effective even with unrelated incomplete checks.

Explore adds California grunion and hand-gathering choices, requests those controls through the existing location API, displays findings and dates, and identifies missing checks. Existing source-reference records remain available. No selection means no comprehensive species-specific determination. API method defaults to shore-angling for existing callers. Contract now describes all four regulatory statuses, adding findings/missing/conflicts/checkedOn while preserving prior fields. No scoring or notifications activated.

New source files:
- src/domain/effective-regulations.ts
- src/application/get-regulatory-assessment.ts
- src/infrastructure/california-effective-rules.ts
- scripts/verify-regulatory-sources.mjs
- tests/effective-regulations.test.ts
- tests/california-effective-rules.test.ts
- tests/regulatory-api.test.ts

Modified source/tests/contracts:
- src/domain/regulations.ts (extensible identifiers; legacy export preserved)
- src/application/get-location-detail.ts
- src/app/api/v1/locations/[id]/route.ts
- src/presentation/explore-discovery.tsx
- tests/explore-discovery.test.tsx
- tests/location-routes.test.ts
- scripts/smoke.mjs
- docs/api/openapi.json

Documentation: ADR 007, this report, README and project progress/test-results/traceability/implementation-plan/blockers. Evidence: regulatory-baseline.json, regulatory-red.log, regulatory-provider-red.log, regulatory-tests.json, regulatory-lint.log, regulatory-typecheck.log, regulatory-build.log, regulatory-sources-live.log, regulatory-live-api.log, regulatory-browser-probe.log.

## B. Exact coverage and verification process
Production rules cover California grunion only: April 1–June 30 inclusive take closure, bag limit 30 and possession limit 30. Species aliases: California grunion / grunion. Activity modes shore-angling and hand-gathering are evaluated against those restrictions; this does not establish legal gear permission. Statewide California applicability comes from the canonical State Parks entry's state identity. No local or MPA legal boundary is inferred.

Legal effective date: June 1, 2022. No stated expiration; supported reviewed activity dates January 1–October 21, 2026. Last verified October 21, 2026; internal review deadline October 28, 2026. The deadline is a maintenance policy, not law. Future dates beyond reviewed coverage, pre-coverage dates, other species/states, unresolved geographic applicability or expired review return UNVERIFIED. Open-season findings do not grant full permission. Current production rules can establish a seasonal prohibition but cannot grant VERIFIED_PERMITTED or overall CONDITIONAL because independent required checks remain missing.

Authoritative sources accessed and manually reconciled:
1. https://fgc.ca.gov/Regulations/2021-New-and-Proposed — California Grunion adoption entry, effective June 1, 2022.
2. https://nrm.dfg.ca.gov/FileHandler.ashx?DocumentID=202020 — approved redline; visually checked to distinguish deleted text from operative closure and limit.
3. https://wildlife.ca.gov/Fishing/Ocean/Grunion — contemporary closure, bag/possession, hand-only and local-closure guidance.
4. https://nrm.dfg.ca.gov/FileHandler.ashx?DocumentID=239985&inline= — current linked July 2026 booklet; grunion and surfperch sections inspected.
5. https://wildlife.ca.gov/Fishing/Ocean/Regulations/Inseason — current emergency/in-season index accessed; not a complete machine-readable absence-of-closure check.
6. https://wildlife.ca.gov/Fishing/Ocean/Regulations/Fishing-Map/sf-bay and https://wildlife.ca.gov/Fishing/Ocean/Regulations/Fishing-Map/San-Francisco — regional differences reviewed. No inferred bay legal geometry or effective dates ingested.

HTTP/content/hash verification is reproducible with NODE_USE_ENV_PROXY=1 node scripts/verify-regulatory-sources.mjs when an environment proxy is required. It checks availability and expected text, never renews legal applicability. Manual amendment review is required before changing record dates/coverage. Source changes must be checked against adopted text and emergency/local restrictions. The early PDF contains strikeouts; text extraction alone would misread it.

## C. Data licensing and production readiness
CSP owns the data; publisher California State Parks: Enterprise Geographic Information Systems, ArcGIS account owner Seth.Paine. Exact adapter service: https://services2.arcgis.com/AhxrK3F6WM8ECvDi/arcgis/rest/services/ParkEntryPoints/FeatureServer/2 . Official download page: https://www.parks.ca.gov/?page_id=29682 . Terms: https://www.arcgis.com/sharing/rest/content/items/4a641ba6d51c44fdb734754d83d7eb43?f=json . Current terms rechecked successfully.

Personal/public-sector use permits free distribution with CSP attribution. Materials may not be sold or altered. Commercial use needs advance CSP approval via geodata@parks.ca.gov. HoneyHole commercial deployment therefore needs additional authorization; none obtained and no approval request sent. Public availability is not unrestricted redistribution. Local provider remains isolated, original source features retained, no public deployment. I cannot confirm commercial production authorization.

Alternatives researched:
- CPAD: https://data.ca.gov/@california-natural-resources-agency/california-protected-areas-database . Catalog identifies Creative Commons Attribution and no public-use restrictions; existing polygon evidence can be retained with attribution. It is not verified entrance-point coverage, so centroids were not substituted for real entrances.
- NPS: https://www.nps.gov/subjects/developer/api-documentation.htm and https://www.nps.gov/aboutus/disclaimer.htm . NPS-authored material is generally public domain unless otherwise marked, with third-party/trademark exceptions and commercial attribution requirements. Exact California shoreline point records and endpoint access were not verified; no speculative production replacement enabled.

A commercially cleared point dataset remains a dependency. Development of independent regulations continued without claiming that dependency solved.

## D. Verification
Baseline: 126 passed / 0 failed. Final automated suite: 153 executed, 153 passed, 0 failed (regulatory-tests.json). This is 27 additional tests, including 19 domain cases, 3 real-record adapter cases, 1 Explore evidence case 1 method-validation case and 3 API-contract/outage cases. Tests cover inclusive dates, open/closed seasons, overlapping prohibitions, species limits, jurisdiction/location mismatches, missing/expired dates, advisory boundaries, contradictions, missing species, provider failures and displayed evidence. Permitted/conditional completeness branches use explicitly synthetic fixtures only.

Initial RED runs confirmed missing new domain/provider modules. Subsequent new tests passed. ESLint, TypeScript and production build passed. Live official-source HTTP/text checks passed; hashes/URLs recorded. Production API/route results are recorded in regulatory-live-api.log and summarized below after completion.

Browser: BLOCKED. Existing Chromium executable absent; existing Firefox present but newPage still crashes. No reinstall or privilege/sandbox workaround attempted. Previous EPERM evidence preserved. No real-browser assertions passed. Component tests do not replace browser rendering checks.

Supported-environment procedure: npm ci; npx playwright install --with-deps chromium (where OS/browser installation is permitted); npm run build; npm run test:e2e. Alternatively set PLAYWRIGHT_CHROMIUM_EXECUTABLE to a verified compatible installed executable. Existing E2E suite checks foundation routes; manually verify Explore county search, real pins, selection, grunion/date/method controls, source links, responsive layout and tile failure until dedicated browser interaction cases are added.

## E. Remaining work
Next functional milestone: authoritative geographic jurisdiction resolution and effective-dated surfperch rules, including bay/ocean differences and exceptions; integrate current emergency/local closures with auditable review. Also obtain a commercially suitable shoreline point source and run supported-browser Explore verification. No legally complete fishing recommendation is available.

Remaining original requirements: broader shoreline/habitat coverage, explainable validated species suitability, authentication/authorization, persistent private/public pins, sharing, preferences and protected background notifications/history/delivery, full E2E. California first with nationwide adapters; web then Android/iOS, neither native implementation begun. Alerts remain inactive.


### Final integrated evidence
Full final suite: 153/153 passed, zero failures. Final lint/typecheck passed; production build passed before the final test-only additions. Four production page routes passed. Initial live discovery returned HTTP 502 before regulatory assertions; original failure is retained in regulatory-live-api.log. Direct diagnostic metadata/query requests subsequently returned HTTP 200, with 63 source features. Exact initial failure cause is unconfirmed; no application defect was reproduced. Unchanged application retry passed county and radius discovery, schema validation, selected coordinates and three date-specific regulatory cases: June 30, 2026 VERIFIED_PROHIBITED; July 1, 2026 UNVERIFIED overall; April 1, 2027 UNVERIFIED. Evidence: regulatory-provider-diagnostic.log and regulatory-live-api-retry.log. Source-availability checks also passed independently.

Final status: effective-dated regulatory implementation IMPLEMENTED — NOT FULLY VERIFIED because real-browser behavior remains blocked and production geographic/source readiness is incomplete. The reviewed grunion slice and deterministic/API behavior passed the tests above; no broader species coverage or complete fishing permission is claimed.
