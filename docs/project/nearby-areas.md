# Nearby areas — November 6, 2026

Explore → **Find fishing areas near me** opens `/explore/nearby`. Enter a center or explicitly open the map and select one with pointer or keyboard. Map tiles reveal the viewed area to OpenStreetMap, disclosed before opening. No device geolocation, private saved-pin lookup, coordinate snapping, or automatic search. The former Explore coordinate form is replaced by this private flow; county discovery and the legacy GET API remain compatible.

## What each search means

`POST /api/v1/nearby` accepts bounded same-origin JSON, no query parameters, `private, no-store`. Search center and radius stay at HoneyHole. The existing State Parks adapter requests its fixed public catalog and metadata; local distance filtering is inclusive at 1–50 km. Distance is geodesic straight-line kilometers, not a driving, walking or safe-route estimate. Order is distance then source ID. Search identity, source dates and coordinates remain those of the public entrance. Raw source feature payloads are not returned by the nearby endpoint. Truncation, conflicting identity or provider failure cannot produce invented results; incomplete source records are disclosed separately from zero matches.

Each candidate is checked locally against the existing reviewed statewide rules, with the selected species, California date, method and exact source coordinates. Source catalog access is unknown. Missing local jurisdiction, protected-area or closure evidence is not permission. Style and time period are planning preferences, not established location attributes or sub-day legal checks. No scientific score. Source coverage is coastal State Beach park entrances, not all public shorelines, piers, jetties or beaches.

Selection opens the entrance review. A second, explicit action permits external assessment of **that public entrance**. `POST /api/v1/locations/{id}` checks same origin, exact consent, and the canonical source coordinates before environmental/GIS calls; changed source coordinates return 409. Reuses the existing detail service, selected-day conditions, habitat/jurisdiction and exclusion rules, and the extracted shared ds3115 mapped-shoreline operation. Historical nearby segments never become a verified substrate at the entrance. No location is converted to a fishing point. Restricted access or a verified prohibition removes a candidate from the investigation list/map and puts it in a separate excluded list. Timeouts, missing evidence or lack of warnings do not imply safe conditions. In-memory details are scoped to the current search; stale responses are aborted/ignored. No background provider fan-out or activation of alerts.

## Separate live demonstration

Test center: **36.8000, −121.8000** (deliberately chosen demonstration center, not an owner pin). Radius: **10 km**. Plan: November 7, 2026, morning, barred surfperch, shore angling, beach preference. Live [California State Parks entry-point layer](https://services2.arcgis.com/AhxrK3F6WM8ECvDi/arcgis/rest/services/ParkEntryPoints/FeatureServer/2) and metadata were downloaded separately from deterministic CI. The fixed catalog query returned 63 feature rows before local filtering. Running those responses through the actual adapter and nearby assessment returned **3 candidates**; dataset last-edit metadata was 2026-11-03T00:24:14.324Z. A catalog edit timestamp does not establish current access or field survey age.

| Public source ID | State Beach entrance | Distance from center (rounded for display) |
| --- | --- | ---: |
| 7071 | Moss Landing SB | 2.26 km |
| 7118 | Salinas River SB | 2.92 km |
| 7179 | Zmudowski SB | 4.00 km |

This demonstration verifies discovery only, not independent live environmental or legal clearance for these entrances. No raw State Parks dataset or private account records have been committed. [CSP GIS information](https://www.parks.ca.gov/?page_id=29682): existing personal-use development restrictions and attribution remain; commercial approval is unresolved. No public deployment authorized.

## Dependency review

Full `npm audit` identified eight moderate development-tree package findings, driven by [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249), potential denial of service from glob-pattern amplification in minimatch. Installed nested version 10.2.6 through @typescript-eslint/typescript-estree, whose range is ^10.2.2. The advisory affects >=7.0.0 <11.0.1; the patched major is outside that range. npm proposes a major-version downgrade of eslint-config-next to 15.5.29 for this chain. No force upgrade, unsafe override or downgrade was performed. Review a compatible upstream lint-toolchain release separately. The production-only audit and dependency install results are recorded separately in verification/CI.

## Remaining decision gap

The smallest useful next step is per-candidate, dated official coastal-hazard evidence with tested zone/point applicability and freshness. Unknown hazards must remain unknown; even verified zone warnings do not determine safe entry or catch probability. Comparing actual fishing opportunities additionally requires evidence at deliberately selected fishing coordinates, current access and legal coverage, and independent scientific validation. Distance alone does not establish fishing quality.
