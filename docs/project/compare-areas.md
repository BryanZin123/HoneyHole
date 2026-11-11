# Two-area trip comparison — 2026-11-11

## Audit before implementation
Starting checkpoint 29e5ceae586cb151e8fac73478c254c42dea4e3d; baseline executed: 422 tests passed.
NearbyAreas retained full assessments by entrance ID, but selection cleared fishing-point/consent state and unmounted locally owned warning snapshots. Refresh results therefore disappeared when switching.
TripVerification conflated activity/source mismatches with legal exclusion. It now reports NOT COMPARABLE while retaining an upstream discovery exclusion. Matching verified restrictions still exclude.

## Requirements and implementation
CMP-01: explicit two distinct published entrance IDs with common species, California date, method and time preference. Pure compareTrips validates selection and calls the existing seven-row projection; no additional providers or API changes.
CMP-02: page-memory state keyed by source ID retains each entrance's consent, assessment, warning snapshot, deliberately chosen point and independent point result. Search/plan changes invalidate all these states and abort requests. Selecting another entrance does not fetch provider evidence. Existing load action validates exact source/activity identity before storing a result.
CMP-03: comparison shows source coordinates and seven matching categories, expandable facts/source dates/links and next actions. Desktop columns stack on mobile. Review selects the corresponding existing consented evidence workflow; closing comparison retains assessments.
CMP-04: warning refresh reuses existing component, parser, endpoint and shared request gate. Persisted snapshots retain retrieval time, failures and historical products. One side cannot change the other. Different retrieval times are explicitly not simultaneous observations. No polling.
CMP-05: entrance and independently selected fishing-point identities stay separate, including restored point result. Point environmental consent is not automatically renewed. No saved private locations are read or stored for comparison.
CMP-06: mismatched evidence is conflicting/not comparable, not a newly established legal prohibition. Upstream exclusions remain excluded. Unknown closures/regulations, empty warnings and historical substrate remain non-clearances.

## Deterministic demonstration
Synthetic fixture entrance 991 at 37.5,-122.5 and 992 at 37.7,-122.5, radius 50 km, common barred-surfperch shore-angling trip. These are test-only records, NOT real public locations.
First loaded side versus second unloaded side demonstrates a data-availability difference only. Loading the second preserves first evidence and independent consent. The shared NWS gate can defer the second warning query; this is unknown, not warning-free. A controlled failed refresh on first side preserves its historical snapshot and leaves second side unchanged. Plan change invalidates comparison. No live retrieval was performed for this milestone; fixtures do not validate live coverage.

## Verification and limits
Focused RED: missing comparison module failed before implementation. Full suite subsequently 431 tests passed (56 files). Typecheck and lint passed. Final production/HTTP/browser outcomes are recorded in the delivery report and GitHub Actions for the resulting commit.
Existing API, authentication, owner-isolation and restart-persistence checks are retained unchanged.
No new provider, dependency, permanent storage, regulation rule, species, score, recommendation, monitoring, notification or deployment.
State Parks commercial licensing remains unresolved. Current closures, comprehensive legal eligibility, present habitat, fish presence and catch predictions remain unverified. Evidence timestamps are evaluated when rendered; no automatic polling. Next bounded milestone: independently sourced dated park-closure evidence, with spatial/date applicability and explicit unknown states.
Windows checkout was not accessed or modified.

Final evidence-detail review added original hourly/grid/pressure/tide retrieval times and NWS effective/expiration/end times and product links to the reused projection. Regression suite: 432 passed. First commit c95e4d8a0d71cf2c561198f4aee71e514ed54496 synchronized; run 43061395083 verify job passed; browser still installing at review time. Final follow-up commit requires its own completed CI result.
