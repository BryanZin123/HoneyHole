# Shoreline discovery delivery — 2026-10-21 UTC

Overall HoneyHole: PARTIALLY COMPLETE. Discovery milestone: IMPLEMENTED — NOT FULLY VERIFIED (browser/visual verification blocked; commercial source approval absent).

## A. Recovery
Recovered existing main branch and preserved modified README and all untracked application, configuration, documentation and tests. Existing foundation, NOAA/NWS services, timestamp policy, atmospheric extension, CPAD/CDFW evidence, regional/API/notification contracts remain intact. No reset, reinitialization, push or deployment. The historical 102-test report was not treated as current proof: recovery baseline ran 114 tests successfully. Discovery/map/detail integration and final verification were incomplete at recovery; this delivery records their completion and limitations.

## B. Implementation
Deterministic station selection inspects at most five candidates within 25 km, orders distance then station ID, and selects the nearest fresh quality-checked observation. Failures do not poison another candidate; pressure trends use the same station. Missing pressure remains unavailable.

Discovery retrieves real State Parks State Beach entry records, preserving names, coordinates, raw source feature, attribution and timestamps. Supports county and radius queries, coordinate validation, duplicate IDs, empty results and provider failures. This subset excludes other beach types, piers and jetties and does not establish safe entry or fishing permission.

Explore includes an interactive Leaflet/OSM map, accessible selection list, county/coordinate search, selected name/coordinates and authoritative links. Selected detail requests weather at that entry coordinate, independent access/MPA evidence, and NOAA reference tides with distance and UNVERIFIED transfer relevance. Data failures remain visible. Habitat and fishing suitability are unknown/not assessed. Separate regulatory dimensions remain UNVERIFIED; source references alone never establish permission. No alerts activated.

Files created:
- src/application/select-observation.ts
- src/application/discover-shore.ts
- src/application/get-location-detail.ts
- src/domain/discovery.ts
- src/domain/regulations.ts
- src/domain/opportunity.ts
- src/config/coastal-counties.ts
- src/infrastructure/state-parks-discovery.ts
- src/infrastructure/nearby-tide-reference.ts
- src/infrastructure/california-regulations.ts
- src/app/api/v1/locations/route.ts
- src/app/api/v1/locations/[id]/route.ts
- src/presentation/explore-map.tsx
- src/presentation/explore-discovery.tsx
- tests/station-selection.test.ts
- tests/discovery.test.ts
- tests/location-routes.test.ts
- tests/location-detail.test.ts
- tests/regulations.test.ts
- tests/explore-map.test.tsx
- tests/explore-discovery.test.tsx
- docs/architecture/adr/006-discovery.md
- docs/project/discovery-delivery.md and discovery-* verification artifacts

Existing files changed:
- src/infrastructure/nws-atmosphere.ts
- tests/atmosphere.test.ts
- src/app/explore/page.tsx
- src/app/globals.css
- package.json, package-lock.json
- scripts/smoke.mjs
- docs/api/openapi.json
- README.md, .env.example
- docs/project/progress.md, traceability.md, test-results.md, implementation-plan.md, blockers.md

## C. Verification
- Full Vitest suite: 126 executed, 126 passed, 0 failed. Evidence discovery-tests.json. Covers station fallback/identity, missing pressure, normalization, radius/invalid coordinates, duplicate/empty/outage results, unknown regulations, selected-location integration and map marker selection.
- RED evidence: station-selection-red.log, discovery-red.log, discovery-dedup-red.log. Not every new fixture test was authored before implementation.
- ESLint passed (discovery-lint.log); TypeScript passed (discovery-typecheck.log).
- Production build passed (discovery-build.log). An initial corrupt Turbopack cache failed; preserved old .next in /tmp/honeyhole-preserved-next-fu2jubrj/next and rebuilt cleanly. No source discarded.
- Four production pages returned HTTP 200 and expected content: /, /conditions, /explore, /saved.
- Live discovery/detail JSON validated against OpenAPI schemas; selected weather/atmosphere coordinates matched the source location. Evidence discovery-live.log.
- Live San Mateo search returned nine real entries. Bean Hollow weather and cloud/gust grid were available. CPAD reported Open Access; CDFW advisory query returned no intersecting polygons. Neither establishes fishing permission. NOAA Ano Nuevo Island 9413878, 14.49 km away, returned four reference tide predictions. Pressure, solar/light and water temperature unavailable in this selected-location response; no substituted values.
- Browser BLOCKED: Firefox download/install succeeded through supported installer, but page creation crashed with user-namespace sandbox failure (writing /proc/self/uid_map: EPERM). No browser assertions passed. discovery-browser-install.log and discovery-firefox-launch.log preserve evidence. Actual Leaflet marker behavior and selection UI passed jsdom tests; these do not verify browser rendering or live tiles. Chromium's previous download blocker remains.

## D. Sources, rights and production suitability
California State Parks owns the entry dataset; publisher attribution is California State Parks: Enterprise Geographic Information Systems. ArcGIS item owner account is Seth.Paine, item title Park Entry Points, public visibility. Public visibility does not waive restrictions.

Exact source: https://services2.arcgis.com/AhxrK3F6WM8ECvDi/arcgis/rest/services/ParkEntryPoints/FeatureServer/2

Official GIS downloads: https://www.parks.ca.gov/?page_id=29682 ; metadata/terms: https://www.arcgis.com/sharing/rest/content/items/4a641ba6d51c44fdb734754d83d7eb43?f=json

Terms permit personal/public-sector free distribution, require attribution, prohibit sale/alteration, and require advance commercial approval from CSP (geodata@parks.ca.gov). No commercial permission obtained. Adapter isolated and replaceable; current local development is not a public/commercial deployment authorization. Original source fields preserved. No public deployment or dataset export performed. Updates are irregular and accuracy/completeness are not warranted. Dataset edit timestamp observed 2026-10-01T21:11:17.197Z; no surveyed coordinate accuracy or accessible-route guarantee established. GeoJSON WGS84 coordinates and query metadata verified; geographic filtering uses application county/radius logic over the bounded source subset, not inferred rights.

Alternative: CPAD catalog https://data.ca.gov/@california-natural-resources-agency/california-protected-areas-database lists Creative Commons Attribution and no public-use restrictions. Existing CPAD adapter provides polygon evidence; polygons are not substitutes for verified entry points. CCC access source terms remain unresolved and that adapter is not enabled.

Map: Leaflet https://leafletjs.com/ with visible OpenStreetMap attribution. Standard tile policy https://operations.osmfoundation.org/policies/tiles/ requires attribution, normal cache/referrer behavior, no bulk/offline download; service is best effort. No private pin storage or sharing enabled. Tile loading was not browser-verified.

Actual environmental/access providers contacted: api.weather.gov, NOAA CO-OPS metadata and datagetter, CNRA CPAD MapServer, CDFW biosds582 FeatureServer. Their output is stored in discovery-live.log with exact request URLs and provenance.

Official regulatory references reviewed:
- https://wildlife.ca.gov/Fishing/Ocean/Regulations/Sport-Fishing/General-Ocean-Fishing-Regs
- https://wildlife.ca.gov/Conservation/Marine/MPAs
- https://wildlife.ca.gov/Fishing/Ocean/Regulations/Inseason
Species-specific linked legal text was inaccessible in research; no species permission inferred. General limits with exceptions are source records, not effective dated species clearance.

## E. Outstanding and next milestone
Next: verify Explore in a supported browser, obtain a production-suitable entry source or explicit CSP commercial permission before deployment, and implement effective-dated species/local/closure/MPA regulatory checks. Broader shoreline types, safe-entry/terrain evidence, habitat and transfer-valid local tide models remain incomplete. Environmental data carries its own validity periods; choosing a future fishing date does not invent matching forecasts. Recommendations remain unscored.

Overall mandatory requirements still outstanding: explainable validated recommendation engine, complete regulations, authentication/authorization, persisted public/private pins, sharing, opt-in preferences, protected notification scheduling/history/delivery and full E2E verification. Mobile sequence remains web then Android then iOS; neither native app started. Alert contracts preserved and delivery remains inactive pending all recommendation, access, regulation, authentication and privacy dependencies.
