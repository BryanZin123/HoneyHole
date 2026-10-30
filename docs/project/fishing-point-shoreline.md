# Actual fishing-point selection and mapped shoreline context — 2026-10-29

## Starting state and scope
Fetched origin; clean feature/honeyhole-foundation-checkpoint at 7ddfe4995a5d3eee8ca840633564c28a520cc0ba matched remote. Baseline executed: 283 tests passed. Previous Chromium baseline: run 40997417231, 10 executions. No reinitialization, main merge, deployment or notification activation.

This milestone retrieves **actual ds3115 line features**, not metadata alone. Explicit point selection, private saving and a separate point-context API/UI are implemented. Mapped feature classifications remain historical context; no current point substrate, surf-zone condition, legal permission, fish presence or fishing recommendation is established.

## Dataset investigation
- Catalog: https://publish.data.ca.gov/dataset/shoreline-types-r7-cdfw-ds3115
- Feature layer: https://services2.arcgis.com/Uq9r85Potqm3MfRV/arcgis/rest/services/biosds3115_fnu/FeatureServer/0
- Original metadata: https://filelib.wildlife.ca.gov/public/BDB/GIS/BIOS/metadata/ds3115.html
- NOAA types: https://response.restoration.noaa.gov/esi-shoreline-types
- NOAA mapping characteristics: https://shoreline.noaa.gov/esi.html
- Citation requirements: https://wildlife.ca.gov/Data/BIOS/Citing-BIOS

Publisher CDFW; original credits NOAA and CDFW, compiling regional ESI atlases for California. Metadata explicitly grants **CC BY 4.0**, https://creativecommons.org/licenses/by/4.0/ . Reuse/redistribution/adaptation, including commercial use, require appropriate credit, license link and change indication; no endorsement or data warranty. UI identifies NOAA/CDFW, dataset title, BIOS source, publication date, retrieval date, computed-distance/code grouping changes and original descriptions. This does not clear the separate State Parks discovery commercial license.

Dataset publication date **2023-07-06**; catalog created 2025-01-31 / updated 2026-10-08. Layer edit 2024-01-08. These are not shoreline survey dates. Metadata says the last source-map update was southern California in 2010. Actual pilot features returned **ESI 2002** and **ESI 2006** in the source field. These are ESI map/source years, not confirmed individual field-observation dates. Current substrate and shoreline movement are unverified.

Geometry: polyline. Hosted service EPSG:3857 (102100); source metadata describes California Albers EPSG:3310. Queries explicitly request GeoJSON WGS84/EPSG:4326, validate returned CRS and every vertex; no manual CRS conflation. Capabilities: Query; 2,000-record maximum; pagination and ordered queries supported. OBJECTID is the hosted feature identity, retained with source URL/year/codes. It is not assumed stable across future republishing.

ESI is for environmental sensitivity/oil-spill planning, not fishing suitability, navigation or safe access. NOAA describes variable scale, 1:20,000/1:30,000 basemaps and an estimated 50-foot minimum mapping unit. **50 ft = 15.24 m is a mapping-unit size, not positional accuracy or a match radius.** No conservative feature-specific positional accuracy was established. Original source dates, tide line, interpolation/generalization, imagery and field-survey lineage limit present-day applicability.

Code interpretation uses this dataset's own definitions and preserves source names verbatim. Known tokens: 1A, 1B, 1C, 2, 2A, 2B, 3, 3A, 3B, 3C, 4, 5, 6A, 6B, 6D, 7, 8A, 8B, 8C, 8D, 8E, 9, 9A, 9B, 9C, 10A–10F, S. Legacy 2/3 are present in the live source; their original descriptions are retained. 3/3A identify fine-to-medium sand, 4 coarse sand, 5 mixed sand/gravel. Rocky/engineered/other distinctions are supplementary display groups, never replacement codes. Do not equate 3B sand scarps with a sandy beach. Dataset-specific 10D/10F conventions must not be replaced by generic NOAA illustrations. Unknown/empty tokens remain unresolved. Slash combinations retain exact raw strings and landward-to-seaward order; all shoretype_1/2/3 codes/names retained. Contradictory code fields flagged. `map_class` and `most_sensitive` are not used to collapse combinations.

## Real query and results
Pilot engineering envelope WGS84: -122.65,37.35,-122.35,37.65, Half Moon Bay-area and adjacent mapped waters. This rectangle is neither a legal jurisdiction nor a habitat boundary. Its eastern portion includes adjacent bay shoreline; no ocean/bay inference is made.

Query `/query` with f=geojson, where=1=1, geometryType=esriGeometryEnvelope, inSR/outSR=4326, spatialRel=esriSpatialRelIntersects, returnGeometry=true, orderByFields=OBJECTID and resultRecordCount=2000. Exact requested attributes are documented in `cdfw-shoreline.ts`. No selected-point coordinate is included. If transfer is truncated or the cap reached, fail closed as unavailable rather than silently claiming completeness; future larger coverage needs pagination. HTTP errors, malformed geometry, unknown CRS and conflicting duplicate IDs fail closed. Identical IDs/payloads deduplicate. Empty results remain distinct from provider failures.

Live adapter probe succeeded at **2026-10-30T03:49:57.307Z** (October 29 local Pacific date): **255 features**, source labels ESI 2002 and ESI 2006. At the engineering test coordinate 37.5,-122.5 (not a recommended fishing point), examples by computed geodesic mapped distance:

| OBJECTID | Original code | Source | Approximate distance |
|---|---|---|---|
|11704|3A|ESI 2006|76.73 m|
|11708|2A|ESI 2006|80.82 m|
|11813|3A/2A|ESI 2006|167.72 m|
|11808|3A|ESI 2006|205.14 m|
|11705|8C/4|ESI 2006|344.57 m|
|11817|4|ESI 2006|356.89 m|
|9408|3A/2A|ESI 2006|383.37 m|
|5172|3/2|ESI 2002|383.70 m|

These are distances to historical mapped geometries, with unknown real-world uncertainty; proximity does not assign any code to the test point. Live feature 11704 describes fine-to-medium sand, 11708 exposed bedrock platforms, 11813 their ordered combination. Raw GIS dataset not vendored into production. Optional reproducible probe: `node --import tsx scripts/shoreline-live-smoke.ts`. CI synthetic features do not verify live providers.

## Identity, privacy and safety
1. User presses Choose a fishing point, then intentionally clicks/taps the Explore map. Marker uses the exact unsnapped Leaflet coordinate. Access markers and access-point detail remain separate. No State Parks ID is attached to the chosen point. Selecting another point resets consent/results through component identity and aborts the old request.
2. Context lookup sends the point in a same-origin POST body to HoneyHole, never in URL query parameters or third-party shoreline requests. CDFW receives the fixed public envelope. Distances calculated inside HoneyHole using Turf 7.4.0 geodesic point-to-line distance, including multipart lines. UI orders first eight segments for inspection only, shows total returned count and no applicability radius. All point classification remains UNVERIFIED even at zero distance; overlapping/mixed/distant segments remain distinct. Identical geometry with differing codes flagged; no claim of exhaustive overlap detection.
3. Separate unchecked consent controls NWS coordinate transmission and NOAA station-reference lookups. Without explicit environmental consent, those ports are not called. Revocation clears results and aborts pending browser work, but cannot retract a request already sent. Selecting/saving alone does not trigger environmental provider calls. The UI discloses that OSM basemap tiles reveal viewed area; selecting the point itself adds a local marker without transmitting that exact coordinate to the tile provider.
4. Save uses existing authenticated private-pin API, sourceId null, privacy PRIVATE, sharingEligible false. No DB migration or authentication replacement. Existing owner-scoped reads/updates/deletes, origin checks and source-backed coordinate protections remain. Saved UI labels source-backed entrance versus user-entered coordinates. No public publishing or new sharing route.
5. New context POST checks origin against configured application origin, uses existing bounded JSON reader (16,000-byte cap), rejects unknown fields including forged sourceId/access, validates dates/coordinates/boolean consent, returns private/no-store and sanitized errors. No private-point logging added. Point context is not persisted by the lookup endpoint.
6. Point access/regulatory eligibility remain UNVERIFIED; entrance findings cannot be inherited. Existing effective prohibitions and source-backed location/activity coordinate equality are unchanged. Species association remains barred surfperch only. Habitat records stay empty/missing; environmental evidence separately uses existing provider implementations. Recommendations/alerts remain disabled. No route/safety clearance or fish-presence claim.

## Implementation files
- src/domain/shoreline-context.ts — code/line validation and geodesic spatial context.
- src/infrastructure/cdfw-shoreline.ts — real bounded feature adapter, provenance and failure handling.
- src/application/get-fishing-point.ts — explicit point, optional consented environmental work, independent unknown eligibility.
- src/application/fishing-point-http.ts and src/app/api/v1/fishing-point-context/route.ts — private same-origin POST and provider composition.
- src/application/account-http.ts — export existing bounded JSON reader; account behavior unchanged.
- src/presentation/explore-map.tsx, explore-discovery.tsx, fishing-point-panel.tsx — map interaction, coordinate/consent/source presentation and private save.
- src/presentation/selected-conditions-panel.tsx — accepts coordinate/date inputs without requiring a fictitious source record.
- src/presentation/saved-places.tsx — explicit saved coordinate provenance.
- tests/shoreline-context.test.ts, fishing-point.test.ts, fishing-point-api.test.ts — domain/provider/privacy/API regressions.
- tests/e2e/fishing-point.spec.ts and provider-hook.mjs — desktop/mobile selection, ordered context, consent, private save, owner isolation and restart persistence with fixtures.
- scripts/shoreline-live-smoke.ts — separate live feature probe.
- package.json/package-lock.json — exact @turf/point-to-line-distance 7.4.0; official reference https://turfjs.org/docs/api/pointToLineDistance .
- docs/api/openapi.json — additive private POST contract; prior routes/response contracts preserved.
- README and project progress/traceability/verification records.

## Verification / persistence
RED: focused source tests initially failed because modules did not exist. GREEN: 25 focused tests passed, then additional boundaries/API tests. Local full suite: 312 tests / 45 files passed, no failures; typecheck/lint passed. Clean build, HTTP persistence and CI/browser outcomes must be recorded from actual executions in shoreline-point-verification.log and final delivery. The baseline environmental/authorization/prohibition tests remain in the full suite.

Workspace /workspace/scratch/972d008c416a/HoneyHole is Linux transient storage; GitHub feature branch is the persistent record. Windows not synchronized. Main unchanged; no deployment. Overall HoneyHole PARTIALLY COMPLETE. This milestone does not complete legal geography, current habitat verification, scientifically defensible catch recommendations, public licensing or alerts.

Next bounded step: review original regional ESI survey/accuracy metadata and an independently licensed current shoreline observation for one explicitly selected fishing point, preserving source dates and uncertain applicability. No unsupported threshold or positive recommendation.
