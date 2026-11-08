# Independent official-warning refresh — 2026-11-08

## Audit before implementation

Fetched feature/honeyhole-foundation-checkpoint: local and remote matched c6fceff1c6064c273653124ee93135ac66e82b73, clean working tree. Baseline suite executed: 380 passing tests. Existing entrance assessment POST revalidated canonical State Parks coordinates, then loaded environmental/GIS/regulatory evidence and warnings. `entrance-warnings.ts` held one 30-second coordinate/date cache, instantiated only in that route. It preserved snapshot timestamps but exposed no cache-delivery metadata. `nws-warnings.ts` already validated source URLs, geometry/zone interpretation, product status/references and HTTP/timestamp freshness; **that parser is unchanged**. Nearby UI had no warning-only action; full evidence could not be refreshed independently.

## Interface and dependency boundary

New same-origin **POST /api/v1/locations/{id}/warnings**, JSON body `{coordinates:{latitude,longitude},date,consent:true}`. Reject query strings, foreign/missing Origin, invalid dates, extra fields, invalid coordinates, noncanonical IDs and absent consent. Resolve the current public entrance through the existing State Parks adapter; absent source ->404, changed ID/coordinates ->409, source failures ->502, all before NWS. Responses are private/no-store and API version 1.

`refresh-entrance-warnings.ts` accepts injected source resolution and warning loader functions for deterministic tests. The production route imports only that handler, State Parks and the shared warning service. No NOAA tides, forecast, habitat, shoreline, jurisdiction or regulatory provider is imported or called. A private saved pin or nearby center cannot replace the exact current published coordinate. No private pin storage is read. Canonical source identity is checked even for a cached warning result.

Both full assessment and warning-only routes now use `entrance-warning-service.ts`: a shared `globalThis` process instance so separately bundled Next routes cannot silently create independent throttles. The existing `entranceWarnings` function retains one bounded coordinate/date entry. It sets its gate synchronously before starting asynchronous work; same-key concurrent calls coalesce, other keys defer, and a still-running request cannot be bypassed even after 30 seconds. A failure still consumes the request-spacing interval. Changed dates cannot reuse evidence evaluated for another date.

WarningEvidence is preserved with optional additive `refresh` metadata: `delivery` (fresh/reused/deferred), `attemptedAt`, `nextAllowedAt`. `retrievedAt` on reused evidence is never replaced. Fresh means a new retrieval attempt, not guaranteed available evidence; status remains available/empty/unknown. Deferred means no NWS query; the legacy unknown evidence timestamp is labeled as an attempt, not a source check. The client repeats no requests automatically, makes no background timer requests, and explains early attempts without sending them. Backend spacing remains authoritative despite browser clock differences.

**Per-process limitation:** globalThis is not a distributed limiter. Multiple workers, containers or instances require shared verified rate controls before public deployment. Public deployment remains unauthorized. The 30-second policy reuses the previously reviewed official NWS guidance at https://www.weather.gov/documentation/services-web-alerts; no provider policy or parser was weakened.

## User-facing behavior

Refresh official warnings appears beside the selected entrance warning section, requires existing consent and shows loading/completion or an explicit unknown result. It preserves entrance/date and all environmental/habitat/regulatory state. Selection/date/coordinate changes remount the warning state; consent withdrawal or unmount aborts and ignores pending responses. A superseded response cannot replace a newer snapshot.

Attempt time, original retrieval time, delivery status and next allowed attempt are separate. Early attempts and reused snapshots are historical, never newly checked. Failed refreshes retain the prior successful snapshot in an explicitly historical section with its original timestamp and no present-activity assurance. History exists only in page memory, not account storage. Complete fresh responses compare added/removed/updated IDs against the last successful snapshot. Removed means absent from the new response, not necessarily cancelled or a hazard that has ended. Unknown/partial evidence is not used for a completeness comparison. Source product timing and California selected-date overlap remain in the unchanged evidence provider/panel.

## Verification

New tests began RED with missing refresh application handler, then GREEN. Focused suites cover consent/origin, query privacy, current source identity, coordinate substitution, provider failures, selected date, preserved cache timestamps, concurrency, changed date/entrance deferral, failure cooldown, API compatibility, user withdrawal, stale request suppression, historical snapshots, ID differences and no implicit network calls. Existing provider tests retain zero/malformed/stale/expired/cancelled/update product checks and all regulatory exclusions.

The additional desktop/mobile Chromium workflow uses the real built server and synthetic upstream fixtures, verifies cached results across the full-assessment and refresh routes, waits for the real 30-second gate, then performs a warning-only request. It checks preserved environmental evidence and consent. A separate browser-response fixture verifies failed-refresh history. These are deterministic tests, not a new live-source probe. No live NWS probe was required or performed in this milestone; the previous milestone's dated probe remains historical only.

See `warning-refresh-verification.log` for local executed checks; actual remote SHA and both completed CI job outcomes are reported after synchronization. No Windows changes/testing, dependency changes, main merge, public deployment, recommendations, scores or notifications.

Next bounded product step: show a dated, source-linked verification checklist for the selected entrance (current access/closure evidence, unresolved fishing regulations and actual fishing-point habitat), without treating missing evidence or absent warnings as clearance or suitability.
