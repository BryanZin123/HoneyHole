# Selected-entrance official warnings — 2026-11-07

## Scope and sources

Only the explicitly consented canonical State Parks entrance assessment POST loads warnings. Nearby discovery, unselected candidates, legacy location GETs, private pins and separately selected fishing points do not request them. The existing source-coordinate equality check rejects changes before any weather/GIS/warning requests. No search-center coordinate enters the warning request. NWS receives the exact public entrance latitude/longitude, without rounding, in its documented server-side point query. The browser posts consent to HoneyHole; it does not send coordinates in the new workflow's request URL.

Reviewed official references:
- https://www.weather.gov/documentation/services-web-api — open data for any purpose, required identifying User-Agent, cache-oriented API, unpublished rate limit.
- https://www.weather.gov/documentation/services-web-alerts — CAP redistribution for decision support, request no more frequently than every 30 seconds; this feature does not trigger EAS or notifications.
- https://www.weather.gov/media/documentation/docs/NWS_Geolocation.pdf — point queries resolve county and zone alerts. Zone-only queries miss county products. Zone alerts may have null geometry. Marine Weather Statements can use mixed county/zone forms; Special Marine Warnings can have polygons.
- https://api.weather.gov/openapi.json — Alert, AlertCollection, status/messageType/severity/urgency/certainty enums, sent/effective/onset/expires/ends, references and affectedZones definitions; retrieved successfully using HTTP, not the web page renderer.

High Surf Warnings/Advisories, Beach Hazards Statements, Coastal Flood products, Rip Current Statements and marine products are not assumed always issued. The adapter does not use an allowlist that might suppress another applicable hazard. It retains all valid returned active products and the original event name, issuer, identifier and official API product link. These are published alerts, not exhaustive hazards, field observations or safety clearances. State Parks commercial licensing remains unresolved; this milestone changes no discovery licensing.

## Geographic and temporal policy

Exact endpoint: `https://api.weather.gov/alerts/active?point={latitude},{longitude}`. Redirects forbidden; source links must remain HTTPS api.weather.gov with no credentials/query/fragment. Structured GeoJSON and identifiers validated. A supplied polygon must include the point (boundary included); mismatch or malformed geometry makes completeness unknown. Null geometry requires consistent UGC codes and official affected-zone identifiers; applicability is explicitly **NWS point/zone**, relying on the documented provider query, not an independent claim of precise hazard geometry. Missing/inconsistent metadata stays unknown. No coordinates or boundaries are invented. Marine zones are retained rather than substituted with terrestrial forecasts.

HTTP response Date and Age must be within a two-minute receipt/freshness policy, with a two-minute future clock-skew tolerance. This is an application validation tolerance, not an NWS hazard guarantee. Collection `updated` is the last collection change, not observation time; an old value alone does not invalidate a fresh zero-result response. Future collection/sent timestamps beyond tolerance fail. Retrieval, collection update, issued, effective, onset, expiry and expected event end remain separate. Required malformed/missing timestamps fail closed. HTTP errors, timeout, malformed/incomplete/paginated results and conflicting duplicate identities are unknown, never empty.

Only Actual Alert/Update products with effective information and unexpired validity can be displayed as current. Referenced predecessors of Actual Update/Cancel messages are removed. Test/draft/cancel/expired/non-effective products do not become current warnings. If a nonempty response yields none applicable, completeness is unknown rather than a successful empty result. Any unresolved product makes overall evidence unknown. A valid complete zero-feature response is empty, with an explicit no-safety-clearance explanation.

Selected-date overlap uses California civil-midnight boundaries (including DST): start is the later of effective/onset when supplied; end is the earlier of information expires/event ends when supplied. It never invents missing event limits or extends a message to its later expected event end. A partial overlap is labeled partial; the optional morning/afternoon preference is not asserted covered. Beyond published validity, future hazard status remains unknown. UI timestamps use America/Los_Angeles; all stored timestamps are normalized UTC.

Per-process entrance loader coalesces one same-entrance/date result for 30 seconds; another entrance inside that interval is unknown/not queried. There is no automatic retry or polling, and at most one bounded cache entry. Provider HTTP cache revalidation is requested. Multi-instance deployment would need a shared source throttle before deployment (public deployment remains unauthorized). Repeat discovery after the interval to request fresh evidence; displayed data is explicitly an as-of snapshot, not a live monitor.

## Separate live Monterey Bay probe

Public source entrance **7071, Moss Landing SB**, coordinates **36.8169429075922, -121.786017013646**, taken from the actual ParkEntryPoints geometry (not its separate LAT/LON attributes):
https://services2.arcgis.com/AhxrK3F6WM8ECvDi/arcgis/rest/services/ParkEntryPoints/FeatureServer/2

Direct NWS probe: HTTP 200, HTTP Date 2026-11-07T23:24:26Z; collection updated 23:24:08Z. A subsequent actual adapter request at **2026-11-07T23:25:31.086Z** returned available, collection updated **23:25:06Z**, two products with CAZ530, area description **Southern Monterey Bay and Big Sur Coast**, null geometry. Geographic interpretation is the NWS point/zone response, not independently verified local surf conditions:

| Product | Severity | Original identifier suffix |
| --- | --- | --- |
| Beach Hazards Statement | Moderate | .001.2 |
| Coastal Flood Advisory | Minor | .001.1 |

Identifier prefix for both: `urn:oid:2.49.0.1.840.0.7562da39f5aecf504ec03b974e8a5b5eb304fbca`.
- https://api.weather.gov/alerts/urn:oid:2.49.0.1.840.0.7562da39f5aecf504ec03b974e8a5b5eb304fbca.001.2
- https://api.weather.gov/alerts/urn:oid:2.49.0.1.840.0.7562da39f5aecf504ec03b974e8a5b5eb304fbca.001.1

Both sent/effective/onset 2026-11-07T19:38:00Z (11:38 PST), information expires 2026-11-08T03:45:00Z (Nov 7, 19:45 PST). Expected ends were Nov 10 06:00Z and Nov 14 00:00Z respectively. The adapter does not extend information validity to those ends. Both overlap part of November 7 in California. This is a historical probe result, not a current advisory to the reader. Product links may expire from NWS retention. Synthetic CI products are not this live verification.

## Verification and safeguards

Baseline: 349 tests. New provider tests began RED (missing provider module), then GREEN. Focused tests cover status/time/spatial failures, overlapping products, updates/cancellation, official source links, HTTP freshness/skew, DST, schema and throttling. Existing no-consent/changed-source tests reject before providers; discovery still has no warning dependency. Browser fixtures test active warning and readable instructions through the actual server, plus controlled zero/failure display on desktop and mobile. Existing owner isolation, saved-point persistence and regulatory prohibition tests remain in the full suite. No regulatory evaluator, suitability score, private storage or notification logic changed.

See `coastal-warnings-verification.log` for executed local checks. Remote commit and completed GitHub jobs are reported after synchronization; no pending browser check is counted as passed.

Remaining: no independent field safety observations, no all-hazard coverage, no precise wave exposure at an entrance, no future-day clearance, no recommendation eligibility. Smallest next improvement: an explicit, nonautomated refresh of warning evidence for the same consented entrance that preserves retrieval history and rechecks source identity, without reloading all environmental providers.
