# Jurisdiction and surfperch evidence — October 21, 2026

Base: a13a4d265155eb8c05141aff61eb1cd47db600ef, fetched from feature/honeyhole-foundation-checkpoint. Baseline clean, 180 tests passed. No reinitialization, unrelated feature changes, main updates, or recovery regeneration.

## Scope and implementation
Provider-independent resolve-jurisdiction service accepts attributed geographic evidence for state, coastal region, water area, MPA and local restrictions. It validates geometry and dates, rejects boundary points, stale reviews, unknown/nonzero spatial uncertainty and advisory/administrative assertions as legal scopes. Exclusive classifications with conflicting IDs produce no scope; overlapping MPA/local restrictions can coexist. Missing data and provider failures remain UNVERIFIED. Exact geometry with zero stated uncertainty is the only supported mathematical precision case; real datasets with unknown/nonzero uncertainty need a reviewed uncertainty policy, not rounding.

California adapter carries canonical park state context and already-queried CDFW MPA metadata. It does NOT reinterpret ds582 as law or invent ocean/bay/region boundaries. Current adapter emits no newly verified legal scopes. Existing state-only grunion context is preserved separately; it cannot establish surfperch water-area scopes. Resolver scopes now participate in regulatory evaluation; integration tests prove a fixture closure excludes only for a matching legal interior, never an advisory/boundary match.

Explore displays all five jurisdiction dimensions, source metadata, spatial uncertainty, legal dates, review dates, unresolved evidence, and separate recommendation eligibility. API contract includes the jurisdiction result. Existing target/date/method controls gain redtail/barred surfperch choices. Exact coordinate identity remains appropriate: API activity coordinates originate from the canonical selected source record; no user-entered rounded coordinate is reconciled into that identity. A 1e-10 degree difference is rejected before provider calls. No normalization introduced.

## Authoritative research and exact coverage
- CDFW Ocean page links its current booklet and official regulation text: https://wildlife.ca.gov/Fishing/Ocean
- July 17, 2026 booklet, printed pages 15 and 26–27, sections 27.00 and 28.59: https://nrm.dfg.ca.gov/FileHandler.ashx?DocumentID=239985&inline=
- Official linked section 28.59 returned HTTP 403 in research: https://govt.westlaw.com/calregs/Document/I01F537EF5B4D11EC976B000D3A7C4BC3
- CDFW geographic services: https://wildlife.ca.gov/Conservation/Marine/GIS
- CDFW ds582 metadata explicitly disclaims defining legal boundaries; catalog lists Creative Commons Attribution and no restrictions on public use: https://data.ca.gov/@california-department-of-fish-and-wildlife/california-marine-protected-areas-ds582

Research cases: redtail surfperch (Amphistichus rhodoterus) minimum total length; redtail and barred surfperch (Amphistichus argenteus) San Francisco/San Pablo bay closure and aggregate limits. Generic surfperch, shiner and other species do not match these cases. Method filter: shore-angling only; this filter is not a finding that the gear is legally permissible. Cases link to the booklet and remain UNVERIFIED for every location/date. No additional verified production species/location case is claimed. Verified operative coverage remains the pre-existing grunion slice, unchanged.

Evidence blocker: a publication date is not a legal amendment-effective date. Surfperch effectiveFrom/effectiveTo remain null, expirationKnown false, verification unverified. Reviewed research snapshot is October 21, 2026; review due October 28 is an application re-review deadline, not a legal expiry. These cases cannot become operative merely because dates advance or a matching geographic scope is provided. Exact ocean/bay legal geometry, local/MPA/emergency restrictions, gear, license and aggregate catch validation remain unresolved. Other-area surfperch limits and shiner exceptions were researched but are not implemented as operative clearance. No source PDF or restricted raw location dataset redistributed.

## Verification and traceability
REQ-GEO-001 provider-independent applicability: jurisdiction tests, including region/boundary logic, conflicting water classifications, overlapping MPAs, effective-date endpoints, missing/stale sources and provider outage.
REQ-GEO-002 legal/advisory separation: California adapter and integration tests; no new legal production boundary claims.
REQ-SURF-001 species isolation/research blocker: surfperch tests and redtail API schema test; unknown species/method stays unverified. Minimum-size restrictions modeled distinctly from maximum limits; conflicts remain unresolved.
REQ-ELIG-001/002/003: coordinate mismatch and exclusion regressions retained; legal fixture integration proves geographic scopes participate without granting recommendations.
REQ-UI-GEO-001: jurisdiction panel component and Explore tests. Real-browser verification remains blocked/unverified; component tests are not E2E.

RED runs confirmed missing new modules before implementations. Baseline 180 tests; final 214 passed, zero failed. Typecheck/lint/build and isolated production HTTP/authentication/owner-isolation/restart-persistence regression checks passed. API contract tests included in full suite. Final API assertion addition was followed by full tests/typecheck/lint; production source unchanged since successful build/HTTP run. Evidence: jurisdiction-verification.log. GitHub CI must be checked on the new commit separately.

## Files
New: src/application/resolve-jurisdiction.ts; src/infrastructure/california-jurisdiction.ts; src/infrastructure/california-surfperch.ts; src/presentation/jurisdiction-panel.tsx; tests/jurisdiction.test.ts; tests/jurisdiction-integration.test.ts; tests/jurisdiction-panel.test.tsx; tests/surfperch.test.ts; this report and verification log.
Modified: src/application/get-location-detail.ts; src/app/api/v1/locations/[id]/route.ts; src/domain/effective-regulations.ts; src/infrastructure/california-effective-rules.ts; src/presentation/explore-discovery.tsx; tests/location-detail.test.ts; tests/effective-regulations.test.ts; tests/regulatory-api.test.ts; docs/api/openapi.json; project traceability/progress.

Overall PARTIALLY COMPLETE. Resolver integration implemented and deterministic checks verified; production legal applicability and surfperch activation remain evidence-blocked. Existing CSP commercial-use approval limitation remains. Positive recommendations, arbitrary scores and notification delivery remain disabled. Next smallest meaningful step: establish reviewed section 28.59 legal-date history and one authoritative water-area boundary/precision case before activating one species rule. Habitat and environmental safety/scientific recommendation evidence remain separate future dependencies.
