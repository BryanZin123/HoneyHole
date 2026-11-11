# Fishing Trip Verification — 2026-11-10 (California)

## Recovery and evidence audit

Fetched feature/honeyhole-foundation-checkpoint; local/remote 431720dac113d294ad1b3dc9691fc2fe9ca79aa7, clean worktree. Executed baseline: 400 passing tests. Existing services, privacy controls and records inspected before implementation.

| Existing source/service | What it supports | What it cannot establish |
| --- | --- | --- |
| State Parks ParkEntryPoints | Published ID, entrance coordinate, park link, retrieval/catalog edit dates | Actual fishing coordinate, public right to fish, current opening/closure, field survey freshness |
| CNRA CPAD AccessType adapter | Point-intersecting published access classifications; restricted precedence | Current closure status or unrestricted fishing rights |
| CDFW ds582 / jurisdiction resolver | Advisory MPA context; only separately reviewed legal scopes accepted | Advisory polygons do not become legal boundaries; unresolved regions remain unverified |
| Existing effective regulations | Bounded date/species/method/jurisdiction findings, review/effective dates, source URLs, verified prohibitions | Comprehensive California permission, current closure coverage, unidentified jurisdictions |
| NWS warning provider and explicit refresh | Dated active-point products or empty/unknown evidence, original attribution and partial-date applicability | Comprehensive hazards, future clearance, point-level conditions beyond provider geometry/zone precision |
| CDFW ds3115 and species habitat profile | Historical mapped shoreline context and documented barred-surfperch association | Present substrate, species presence, habitat at a park entrance or arbitrary nearby fishing point |
| NWS/NOAA and selected-date view | Available dated forecasts, observations, tide/temperature station references, daylight calculations | Station transfer accuracy, catch probability, safety or suitability |
| Account/private pins | Existing authenticated owner-only CRUD and persistence | No saved coordinate is automatically selected, read or transmitted by this new summary |

No closure provider has been added. Current closures remain UNKNOWN for every production summary until actual dated authoritative closure evidence is integrated. Old/conflicting notices in access metadata are not interpreted as current closure evidence. A source link is a next verification step, not evidence that the user has checked it or obtained permission.

## Implementation

`application/trip-verification.ts` is a pure projection over already-loaded evidence. Seven dated, source-linked categories distinguish source records, available, missing, unknown, failed, conflicting, outdated, historical and excluded evidence where the existing contracts support that distinction. Each includes a next action. No provider calls, ranking, completion controls or permanent storage. No API response contract changed.

Source/activity/date/species/method mismatch fails closed. Existing applicable regulatory prohibition, restricted access and upstream exclusion remain EXCLUDED, including discovery-stage exclusion before detail is loaded or when the later detail is incomplete. A final-review regression reproduced an initial summary inconsistency (UNVERIFIED replacing that discovery exclusion); the projection now explicitly retains it. Neither source links nor arbitrary user acknowledgments can clear them. Incomplete legal coverage never becomes permission. The source's review dates remain visible; this projection does not re-review or revise legal rules.

`TripVerification` renders above technical evidence and is composed inside the existing warning-refresh component so it reads the latest warning snapshot and historical/failure state directly. No second warning fetch/cache/parser is introduced. Snapshot reuse, failure and explicit refresh update this summary without updating the rest of the assessment. Warning retrieval more than two minutes old or expired products are labeled OUTDATED when the projection renders, using the existing warning freshness tolerance; this is an application review cue, not a safety boundary. There is no automatic timer/polling. A displayed snapshot remains explicitly as-of its timestamp.

Nearby cards no longer imply that warning evidence is wholly absent after an assessment; they direct the user to the selected entrance snapshot and retain no-clearance/suitability language.

## Entrance versus fishing point

Choose an actual fishing point opens the existing ExploreMap selection mode, with intentional click or keyboard pan/Enter. No coordinate is assigned by opening this mode. The published entrance remains separately displayed; a user point gets its own marker and existing FishingPointPanel. The panel defaults to the trip date and target but requests its own independent evidence only on user action. Changes invalidate projected point evidence. Date/species/coordinate mismatch remains conflicting, not transferred evidence. Existing mapped-context privacy, explicit environmental-coordinate consent, authentication and private-save behavior are reused. Choosing a point does not read saved pins. No point is permanently saved unless the user invokes the existing private-save action.

The summary does not transfer entrance access, legality or warning conclusions to the fishing point, even if the user intentionally selects identical coordinates. Habitat projection uses only the independently requested point result, not entrance evidence. Historical mapped shorelines cannot establish current substrate.

## Bounded live Monterey Bay example (separate from fixtures)

On **November 10, 2026, 8:35 p.m. PST**, fetched State Parks entrance **7071 — Moss Landing SB**, exact geometry **36.8169429075922, -121.786017013646**. Source retrieval **2026-11-11T04:35:35.811Z**; catalog edit **2026-11-03T00:24:14.324Z**. Used the existing consented assessment POST with California date **2026-11-10**, barred surfperch, shore-angling. Response HTTP **200**.

- Entrance source: https://services2.arcgis.com/AhxrK3F6WM8ECvDi/arcgis/rest/services/ParkEntryPoints/FeatureServer/2
- Official park link: https://www.parks.ca.gov/?page_id=574 (provided for manual closure verification; no current closure/opening claim made).
- CPAD request successfully returned zero intersecting access records; access UNKNOWN, not restricted and not verified public. Retrieved **04:35:40.135Z**. Source: https://gis.cnra.ca.gov/arcgis/rest/services/Boundaries/CPAD_AccessType/MapServer/0
- Current closures: UNKNOWN; no closure feed queried or inferred.
- Regulations: UNVERIFIED, with overdue review dates; no fishing permission established. Existing official source links retained, including https://wildlife.ca.gov/Fishing/Ocean/Regulations and https://nrm.dfg.ca.gov/FileHandler.ashx?DocumentID=239985&inline= . This milestone did not refresh legal research.
- NWS warning adapter: available, **Coastal Flood Advisory**, retrieved **2026-11-11T04:35:52.590Z**. Original product https://api.weather.gov/alerts/urn:oid:2.49.0.1.840.0.63a06783ef18cc805f1d31a27afcb6fd026b5b07.002.1 ; effective **2026-11-10T20:11:00Z**, expires **2026-11-11T22:00:00Z**, partial selected-date overlap. This dated observation is not a current warning to the reader.
- Selected-day environmental products: hourly forecast, grid fields, tide station reference and pressure observation. Hourly retrieval **04:35:40.815Z**, https://api.weather.gov/gridpoints/MTR/98,59/forecast/hourly?units=si ; grid https://api.weather.gov/gridpoints/MTR/98,59 . Provider pressure was **1020.6575 hPa**; no fishing-success inference. Missing products remain missing, and station transfer is unverified.
- No actual fishing point was selected for this demonstration. Habitat therefore **Fishing point not yet assessed**. Overall **UNVERIFIED**, recommendation unavailable.

This is one real entrance demonstration, not live verification of all possible provider outcomes. Deterministic fixtures cover failures, exclusions and conflicting/stale evidence. State Parks commercial licensing remains unresolved; this milestone does not authorize redistribution or commercial/public deployment.

## Verification and remaining gap

New projection test first failed for missing module, then passed after implementation. New tests cover access versus closures (including old/conflicting access metadata), exclusion precedence, identity/activity mismatches, missing and historical point habitat, warning state/refresh synchronization, no completion control, no render-time requests and user acknowledgment invariance. Existing consent withdrawal, stale response, warning throttle, authentication, private owner isolation, regulatory and persistence tests remain unchanged. New real Chromium desktop/mobile workflow intentionally selects a distinct point, loads only requested context and verifies missing consent and evidence invalidation. Local check results: `trip-verification-results.log`; actual GitHub run outcomes are verified after synchronization.

Smallest next bounded milestone: a side-by-side view of two explicitly assessed entrances for the same trip, showing the same evidence categories, source timestamps and gaps. Do not add automatic provider fan-out, quality ranking, safe/legal labels or catch predictions. Current closure ingestion remains a separate authoritative-source acquisition task.
