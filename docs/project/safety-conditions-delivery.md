# Safety regression and selected-date conditions — 2026-10-22

Status: IMPLEMENTED — NOT FULLY VERIFIED (browser unavailable; production surfperch legal applicability remains blocked). Overall HoneyHole: PARTIALLY COMPLETE.

## Repository baseline
Fetched origin; clean feature/honeyhole-foundation-checkpoint at 90a8b3a27a9cddc5bac21744684880f6b79afdfa. Baseline 214/214 tests passed. Existing original history, authentication, private Saved pins, preferences, NOAA/NWS adapters and map preserved. Linux workspace /workspace/scratch/972d008c416a/HoneyHole is transient; GitHub is the durable source record. Windows desktop inaccessible and not updated. No main changes, force push, deployment, new dependencies or alerts.

## Confirmed safety defect and correction
A regression with an applicable verified prohibition plus an independent UNVERIFIED finding for the SAME question failed: expected VERIFIED_PROHIBITED, received UNVERIFIED. RED: 1 failed, 21 passed. Aggregation now resolves conflicts first, then independent verified prohibitions, then incomplete evidence. Incomplete same-question evidence remains in `missing` and retains its own finding/reason even when that question is prohibited. Contradictory prohibition/clearance remains UNVERIFIED. The regression also asserts recommendation EXCLUDED and alertEligible false. Existing access exclusions and exact coordinate identity remain unchanged. A conditional restriction never grants recommendation eligibility.

## Practical environmental view
Explore's selected-date panel uses existing provider evidence without additional provider requests or fabricated defaults. California civil-date filtering handles UTC offsets, DST and half-open forecast periods. Forecast periods that overlap the selected date retain their complete validity intervals. Out-of-date, stale and wrong-coordinate forecasts are excluded from the usable view. Pressure observations/trends are shown only when observed on the selected date; observed-at time and nearby station provenance remain visible. Cloud/gust intervals and sunrise/sunset/twilight events are filtered to the selected date. Current light phase is not misrepresented as a full-day prediction. Tide and temperature samples remain named nearby-station references with transfer relevance UNVERIFIED, never on-site measurements. Original provider statuses, retrieval/source links and missing-evidence explanations are retained. Available samples do not establish full-day coverage. Conditions, habitat/suitability, access, regulatory status and recommendations remain separate. This does not implement a scientific fish-activity forecast.

## Spatial uncertainty policy
Replaced the zero-precision-only gate with a conservative provider-independent policy. A reviewed adapter must supply a documented LOWER bound on distance from the exact query point to ALL geometry boundaries (including holes), the method and its source; point accuracy, source geometry accuracy and legal-boundary uncertainty must be finite nonnegative WORST-CASE errors in meters. Percentile/RMS accuracy alone is insufficient. Sum the three errors, not root-sum-square. Clearance must be strictly greater than that sum; equality or boundary intersection is ambiguous. Classifications: reliably-inside, reliably-outside, ambiguous, missing. Exact coordinate identity is retained; no rounding or invented buffer geometry.

Only reliably-inside, legally authoritative geometry with valid legal/review dates emits a legal scope. Reliably-outside establishes neither another jurisdiction nor permission. Missing point accuracy defaults to unknown. Production California records still provide no reviewed legal geometry/clearance/accuracy, so they remain UNVERIFIED. This milestone implements the uncertainty contract and decision policy, not a production boundary-distance adapter or a survey-grade geographic algorithm. Synthetic fixtures prove the policy; their coordinates/clearances are not production records.

## Bounded regulatory research and decision
Official sources examined:
- OAL official CCR access: https://oal.ca.gov/publications/ccr/
- OAL historical CCR research: https://oal.ca.gov/ccr_history/ (historical supplements, distinct from proposed-rule Notice Register).
- Official linked section 28.59: https://govt.westlaw.com/calregs/Document/I01F537EF5B4D11EC976B000D3A7C4BC3
- Official linked section 27.00: https://govt.westlaw.com/calregs/Document/IFF3E2E395B4C11EC976B000D3A7C4BC3
- Accessible CDFW reproduced regulatory text: https://wildlife.ca.gov/Fishing/Ocean/Regulations/Sport-Fishing/General-Ocean-Fishing-Regs
- CDFW SF Bay guidance: https://wildlife.ca.gov/Fishing/Ocean/Regulations/Fishing-Map/SF-Bay
- In-season notices: https://wildlife.ca.gov/Fishing/Ocean/Regulations/Inseason
- Existing July 17, 2026 booklet source: https://nrm.dfg.ca.gov/FileHandler.ashx?DocumentID=239985&inline=
- CDFW history leads: https://marinespecies.wildlife.ca.gov/barred-surfperch-and-redtail-surfperch/management/ and https://marinespecies.wildlife.ca.gov/shiner-perch/management/ (search-index summaries mention historical amendments; direct pages require JavaScript and do not establish exact operative dates).

CDFW's reproduced 27.00 text specifies the west Carquinez Bridge, Golden Gate Bridge and tidal tributaries; named downstream limits include Trancas Bridge/Napa River, Highway 121 Bridge/Sonoma Creek and Payran Street Bridge/Petaluma River. Ocean definition also includes contiguous bays and Elkhorn Slough west of Elkhorn Road. A park-entry coordinate, county or recreational map cannot resolve these legal water areas. Section 27.56 has distinct night-fishing language and shore/pier exceptions; do not collapse its geographic description into 27.00. In-season summaries do not prove absence of every emergency/local closure.

Exact operative-date evidence remains incomplete: official Westlaw documents were inaccessible in this environment; accessible CDFW publication/update dates and historical search summaries are not a verified amendment/operative-date chain. Resolution requires the official historical CCR supplements/adoption filings for 28.59 and 27.00, plus reviewed legally grounded water geometry and point/source/boundary accuracy. No further repeated failed searches undertaken. No new surfperch production case activated.

Coverage remains research-only for redtail (Amphistichus rhodoterus) size and redtail/barred (Amphistichus argenteus) SF/San Pablo bay closure/aggregate limits, filtered to shore-angling. All locations and dates remain UNVERIFIED. Shiner Cymatogaster aggregata is excluded structurally from the aggregate limit; one shared maximum is represented, not a separate allowance for each species. This models the research restriction, not catch-compliance validation. Gear, local/MPA/emergency rules, license and complete operative history remain unresolved. No new verified species/location/date coverage; the existing bounded grunion records are unchanged and retain their own review/coverage limits. CSP commercial authorization remains unresolved; no restricted raw data copied or deployed.

## Verification
Final full suite: 230 passed, 0 failed, 35 files. This includes API contracts, regulatory/exclusion, jurisdiction, provider outage/freshness, authentication, owner isolation, persistence and component tests. Baseline 214 tests retained. Initial RED runs: prohibition defect (assertion failure); new conditions/spatial modules absent (import failures); aggregate schema assertion (1 failed, 6 passed). Subsequent GREEN and full regression passed.
Typecheck PASS; lint PASS (zero warnings); production build PASS. Four production routes HTTP 200 and expected content. Account/restart HTTP results are recorded in safety-conditions-verification.log. Browser BLOCKED/UNVERIFIED: supported Chromium unavailable; prior Firefox sandbox failure preserved, no installation loop. Component tests are not browser E2E. No live NOAA/NWS/geographic provider claims from this milestone; these adapters were preserved and deterministically tested. GitHub CI must be verified for the resulting commit and reported separately.

## Next defensible step
Add reviewed species habitat requirements and evidence-quality explanations as a separate, non-scoring suitability assessment for one species, without granting recommendation eligibility. In parallel, obtain the identified official legal-date/geometry evidence before activating a surfperch rule. No alerts until authorization, privacy, regulatory, suitability and environmental safety dependencies are verified.

## Exact changed files
- docs/api/openapi.json
- docs/project/progress.md
- docs/project/safety-conditions-delivery.md
- docs/project/safety-conditions-verification.log
- docs/project/traceability.md
- src/application/get-location-detail.ts
- src/application/resolve-jurisdiction.ts
- src/domain/effective-regulations.ts
- src/domain/selected-conditions.ts
- src/domain/spatial-uncertainty.ts
- src/infrastructure/california-surfperch.ts
- src/presentation/explore-discovery.tsx
- src/presentation/jurisdiction-panel.tsx
- src/presentation/selected-conditions-panel.tsx
- tests/effective-regulations.test.ts
- tests/jurisdiction-integration.test.ts
- tests/jurisdiction.test.ts
- tests/selected-conditions-panel.test.tsx
- tests/selected-conditions.test.ts
- tests/spatial-uncertainty.test.ts
- tests/surfperch.test.ts
