# Barred surfperch habitat evidence — 2026-10-28

Base: c863f41426349baf33b52f67b119f46f1a95b6aa. Phase A was committed and pushed independently. Run https://github.com/BryanZin123/HoneyHole/actions/runs/40824472722 references that exact SHA: browser job 123284219146 completed successfully with 6/6 tests; verify job 123284219517 succeeded. First browser run 40824198574 had 4 passing/2 failing tests due to ambiguous alert locator, corrected in c863f41. These were real Chromium assertions, not test discovery. Local Chromium installation remains blocked by truncated download; no security workaround used.

## Evidence and exact coverage
Only barred surfperch (Amphistichus argenteus), including exact common/scientific-name aliases, has a habitat profile. Other species and generic surfperch remain not-reviewed. This phase changes no regulatory rule, effective date, scientific scoring, recommendation eligibility or notification delivery.

Sources actually read:
1. https://wildlife.ca.gov/Conservation/Marine/Surf — CDFW describes sandy surf-zone association and studies of barred surfperch along central/southern California beaches. Page publication date not supplied; reviewed 2026-10-28. Studies and historical sampling are not current point-level fish-presence evidence or a catch model.
2. https://wildlife.ca.gov/Conservation/Marine/Life-History-Fish — barred row lists beaches for juveniles/adults and regional codes NC, SC, S. Publication date not supplied; reviewed 2026-10-28. Regional codes are displayed as supplied, without invented geographic boundaries.
3. https://wildlife.ca.gov/Fishing/Ocean/Fish-ID/Quiz — January 2012 barred surfperch account gives sandy surf-zone association and a Bodega Bay–central Baja California range description. Clearly labeled historical; not a complete current range survey. Old regulation statements on this page are not used. Source publication recorded as 2012-01, separate from review on 2026-10-28.
4. https://marinespecies.wildlife.ca.gov/barred-surfperch-and-redtail-surfperch/monitoring/ — attempted; direct content is a JavaScript-required shell. Substantive monitoring statements were not verified and are not used as evidence. No claim of an empirically supported catch model from this page.

No complete geographic range polygon, actual location substrate/surf-zone dataset, local abundance survey, species presence evidence or environmental catch-prediction model was obtained. Production park-entry records still supply zero reviewed habitat observations. Publication/review dates do not certify the selected location.

## Implementation and safeguards
REQ-HAB-001: Domain profile/facts retain per-fact source IDs, attribution, publication/review date, scope and limits. Exact barred-species matching prevents application to redtail or generic surfperch.
REQ-HAB-002: Location evidence is independent. Reviewed field-survey/habitat-dataset attributes must match the exact source ID and coordinates, include source attribution, and cover the activity and review dates. Park-entry assertions, unreviewed/stale/mismatched records and conflicts cannot establish an attribute. Sand plus surf-zone evidence is needed for the `supported` association match. Rock/inland evidence is `incompatible` with this particular association, not proof of species absence. Missing evidence stays `missing`. Overall habitat status remains the backward-compatible `unknown`; presence remains `not-assessed`. The current California provider returns no location habitat records. Survey applicability must be reviewed by a future provider, not derived from entrance names or coordinates.
REQ-HAB-003: Application use case isolates species/location provider failures. Location detail adds the assessment; OpenAPI specifies its returned fields. A failed habitat provider cannot fabricate a profile or erase other evidence.
REQ-HAB-UI-001: Explore separates documented association, location evidence, source details, environmental provider panels, regulatory assessment and recommendation eligibility. It explains missing evidence, historical range limitations and unavailable recommendations. No tide/moon/pressure/wind/temperature catch predictor or numeric weight exists.
REQ-HAB-SAFE-001: Integration regression proves even synthetic supported habitat leaves a verified prohibition EXCLUDED and alertEligible false. Existing prohibition-precedence, restricted-access, coordinate identity, accounts/pins/preferences and provider safeguards remain intact.

## Verification
RED: habitat tests initially could not import absent modules. GREEN: focused tests passed, then full automated suite 255 passed/0 failed across 39 files (25 more than 230 baseline). Includes habitat attribute/date/conflict/species cases, provider failures, API schema negative cases, UI explanations and prohibition preservation. Typecheck and lint passed. Clean production build, HTTP authentication/authorization/origin protection/restart/persistence and production route results recorded in habitat-phase-b-verification.log. No live NOAA/NWS/CSP availability claim is made; browser provider payloads are synthetic and server normalization/account logic runs for real.

Browser: new habitat workflow runs against the real API/Explore page on desktop and mobile, verifies sources, missing point habitat, no recommendation/alert, separate environmental panel and removal of barred facts when selecting redtail. Eight total Playwright cases. Phase B browser assertions require its GitHub CI outcome after push; do not substitute prior Phase A success. Failure traces/reports are retained by the independent browser job. Overall HoneyHole remains PARTIALLY COMPLETE; no production deployment or merge authorized.

## Persistence and next step
Workspace: /workspace/scratch/972d008c416a/HoneyHole (Linux transient); GitHub feature branch is authoritative persistent source. Windows not updated. Main untouched. No recovery artifact regeneration. No raw private user data or government dataset copied. CSP commercial licensing unresolved.
Next smallest defensible step: evaluate one appropriately licensed, georeferenced substrate/surf-zone dataset and verify one location's spatial/temporal applicability, without inferring fish presence or lifting legal/safety exclusions. Scientific catch prediction needs separate empirical validation; alerts remain disabled.

## Recovery verification — 2026-10-29
Repository changes preserved across the interrupted session. Re-fetched origin: base remained c863f41 with main unchanged. Repeated full suite: 255/255 pass, typecheck/lint/clean production build and HTTP route/account/restart persistence checks pass. Eight browser tests listed; this is not an assertion-pass claim. Full source changes are listed below.

- README.md
- docs/api/openapi.json
- docs/project/browser-phase-a.md
- docs/project/habitat-phase-b-verification.log
- docs/project/habitat-phase-b.md
- docs/project/progress.md
- docs/project/traceability.md
- src/app/api/v1/locations/[id]/route.ts
- src/application/get-habitat-assessment.ts
- src/application/get-location-detail.ts
- src/domain/habitat.ts
- src/infrastructure/california-habitat.ts
- src/presentation/explore-discovery.tsx
- src/presentation/habitat-panel.tsx
- tests/e2e/habitat.spec.ts
- tests/habitat-api.test.ts
- tests/habitat-application.test.ts
- tests/habitat-panel.test.tsx
- tests/habitat.test.ts

### Chromium regression correction — 2026-10-29
Run 40897954030: quality gates passed; Chromium 6 passed, 2 failed. The new habitat test used an ambiguous location button (list and map marker) and an exact label that included native select option text. Scope selection to the map and match the species combobox label prefix. No application or authorization logic changed. The corrected run must pass before browser verification is complete.
