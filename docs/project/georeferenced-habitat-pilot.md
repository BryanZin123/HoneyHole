# Georeferenced habitat context pilot — 2026-10-29

## Decision and scope
Base: 49d52f5b248ab14dfdc2e403ca4e281b0be1e4a0; clean feature branch and matching origin verified after fetch. Baseline 255 automated tests passed. Earlier browser run 40899388870 passed 8 Chromium executions.

No candidate substantiates current sandy surf-zone habitat at a fishing coordinate. Integrate **one dataset only: CDFW ds3091, metadata-only contextual prototype**, under its explicit CC BY 4.0 license. No raster/polygon copy, classified pixel extraction, habitat support, catch prediction, legal permission or alert activation. This is the permitted evidence-blocker alternative, not a completed field-habitat mapping pilot.

Operational pilot envelope: latitude 37.35–37.65, longitude -122.65–-122.35, WGS84, around Half Moon Bay. These are engineering bounds, not source-derived habitat, shoreline or legal boundaries. Outside this envelope, no metadata request is made. No actual fishing point has been verified. An entrance inside the envelope does not establish data coverage.

## Candidate evaluation and reproducibility
All references reviewed 2026-10-29. Source page update/metadata creation dates are not observation dates.

### Beach Sand Deposits — not selected
Exact layer: https://gis.cnra.ca.gov/arcgis/rest/services/Ocean/CSMW_Beach_Sand_Deposits/MapServer/0
Service metadata: https://gis.cnra.ca.gov/arcgis/rest/services/Ocean/CSMW_Beach_Sand_Deposits/MapServer
Item information: append `/info/iteminfo?f=pjson` to the service; layer metadata: append `/metadata` to the layer.
CNRA hosts the service; credits identify USGS, California Geological Survey and Kelly Larvie. The service describes beach deposits extracted from county geologic maps of varying dates/scales. It is a polygon layer, with SOURCE, SOURCE_YR, PTYPE and SOURCE2 fields. Service CRS is EPSG:3857; description references earlier NAD83 Teale Albers/WGS84 reprojections. Coastal California extent is a catalog envelope, not complete coverage proof. JSON/GeoJSON queries and pagination advertised; 2,000-record limit.
Item information returned an empty `licenseInfo`; layer XML contained no explicit use license or observation/accuracy documentation. XML creation date 20220721 is metadata creation, not geology observation or publication. Exact publication dates, observation range, source-specific resolution, worst-case positional accuracy and redistribution permission remain unconfirmed. Historical mapped geology is not present beach substrate. Do not copy or redistribute this layer. No feature payloads were imported.

### Coastal Conditions — not selected
Exact layer: https://gis.cnra.ca.gov/arcgis/rest/services/Ocean/CSMW_Coastal_Conditions/MapServer/0
Service/item/metadata paths follow the same pattern as above.
CNRA hosts; credited originators are Melanie Coyne (NOAA Coastal Management Fellow), California Coastal Commission and California Department of Boating and Waterways. The lineage references the 1977 DNOD erosion atlas, with later spreadsheet joins of uncertain authorship. Polyline coastline classifications include beach/rocky/bay and descriptive nearshore/shoreline fields. Service CRS EPSG:3857; description says WGS84 reprojection. JSON/GeoJSON query support, pagination and 2,000-record limit advertised.
Item `licenseInfo` was empty; no explicit redistribution permission was established. Publication and attribute-observation dates, exact spatial resolution and quantitative accuracy remain unconfirmed. “Current width” is a historical field name, not proof of current width. Coastline segments and ownership text do not establish present substrate, public access or fishing permission. No feature payloads imported.

### CDFW ds3091 — selected for context only
Catalog: https://publish.data.ca.gov/dataset/predicted-nearshore-benthic-substrates-of-california-r7-cdfw-ds3091
Authoritative metadata: https://filelib.wildlife.ca.gov/public/BDB/GIS/BIOS/metadata/ds3091.html
Live service: https://tiledimageservices2.arcgis.com/Uq9r85Potqm3MfRV/arcgis/rest/services/biosds3091_cru/ImageServer
Service item: 40dc0b4522b94bcf95910801e322be0a.
Owner/credits: California Coastal and Seafloor Mapping Project; CDFW. Metadata publication: 2023-04-20. Catalog creation 2025-01-31 and update 2026-10-08 are separate catalog dates. Inputs' observation interval is unknown; processing history includes 2018 and 2023, not a current survey. Scope is California nearshore waters; the rectangular extent does not establish pixel coverage.
Rugosity-derived hard/soft predictions; original varying resolutions include 2–15 m and shallow-gap interpolation with 30 m cells. Mosaic resampled to 10 m. Source says cartographic use, not area calculations; artifacts and smooth rock can confound interpretation. No conservative positional accuracy established. Source XML describes EPSG:3857; the live service reports EPSG:3310 and `Image,TilesOnly`. These representations must not be conflated. The prototype validates live item/CRS/cell size/capabilities, but does not transform coordinates or sample tiles. Soft is not verified sand; neither class identifies surf-zone position or fish presence.

License: metadata explicitly specifies CC BY 4.0, https://creativecommons.org/licenses/by/4.0/ . Commercial reuse/adaptation/redistribution permitted subject to attribution, license link, change indication and no additional restrictions. No endorsement implied; no accuracy/fitness warranty. Attribution follows https://wildlife.ca.gov/Data/BIOS/Citing-BIOS : title, originator, publication date, BIOS source and access date. UI provides all these and identifies HoneyHole's metadata summary. This permission does not resolve the separate State Parks discovery license.

## Implementation / applicability policy
- `src/domain/mapped-habitat.ts`: separate point roles (park-entry, fishing-point, environmental-station, unknown), exact ID/coordinate checks, WGS84 feature validation, polygon interior/boundary/exterior, dated records and contradictory hard/soft diagnostics. Dataset and feature IDs preserved. Reviewed adapter bounds feed the existing conservative spatial policy; full cell diagonal adds footprint uncertainty, not survey accuracy. Missing bounds remain missing; no snapping/rounding/nearest-feature substitution. Polygon diagnostics tested with synthetic fixtures only. The function cannot grant verified habitat.
- `src/application/get-mapped-context.ts`: metadata-only port deliberately cannot return a sampled habitat feature. Failures independent of existing species/legal/environmental services.
- `src/infrastructure/cdfw-mapped-context.ts`: fixed allowlisted metadata URL, five-second timeout, no coordinate-bearing upstream request, no raw response exposed, no tiles downloaded. Reject changed/missing item, CRS, cell size or capabilities. Curated source evidence remains labeled separately during outages; successful receipt timestamp never becomes observation date.
- `src/application/get-location-detail.ts`, `src/app/api/v1/locations/[id]/route.ts`: additive `mappedContext` response. Existing public discovery records explicitly tagged park-entry; original activity/location identity guard retained unchanged. No new endpoint for private-coordinate disclosure.
- `src/presentation/mapped-context-panel.tsx`, `src/presentation/explore-discovery.tsx`: source-linked context, age/precision/coverage limitations, role of selected coordinate, missing pixel/feature, independent verified-evidence status and recommendation prohibition.
- `docs/api/openapi.json`: additive documented context schema, UNVERIFIED-only assessment and empty features for current metadata-only contract. Prior response fields retained.
- Tests: `mapped-habitat.test.ts`, `cdfw-mapped-context.test.ts`, `mapped-context-panel.test.tsx`, extended `habitat-api.test.ts`, `e2e/habitat.spec.ts`, `e2e/provider-hook.mjs`. Synthetic browser metadata fixtures never verify live provider availability. Existing private-user browser workflow remains unchanged.
- `scripts/mapped-context-smoke.ts`: optional live metadata probe, excluded from deterministic CI. `node --import tsx scripts/mapped-context-smoke.ts`.

## Verification and known limitations
RED confirmed missing domain/provider modules; GREEN focused 26 tests passed. Full local suite 283 passed, zero failed (42 files). Local typecheck/lint passed. Final build, persistence and Chromium/CI evidence must be checked for the pushed commit; see georeferenced-habitat-verification.log. Live adapter probe succeeded on 2026-10-29T15:34:21.275Z: context-only, EPSG:3310, 10 m, zero sampled features, UNVERIFIED. First smoke invocation exposed a CJS top-level-await issue in the new script; wrapped in async main and reran successfully. No application data was changed.

Production dataset feature intersection, field observation dates, precise fishing-point identity, worst-case accuracy and actual sand/surf-zone evidence remain unavailable. Synthetic geometric tests do not verify live geometry. No raster classification is returned. No source qualifies for positive location habitat verification. Existing grunion/legal prohibition precedence, access exclusions, accounts/private pins/preferences and environmental adapters remain unchanged. Only barred surfperch has a reviewed species habitat profile. Overall HoneyHole PARTIALLY COMPLETE; no deployment/merge/notifications.

## Persistence / next step
Actual Linux workspace: /workspace/scratch/972d008c416a/HoneyHole; transient, with GitHub feature branch the persistent authoritative source. Windows not synchronized. Main unchanged. Final report identifies verified remote SHA and actual CI run.
Next smallest step: obtain one appropriately licensed beach/surf-zone field or mapped dataset with feature-level observation dates, positional accuracy and valid geometry, and establish an explicit user-selected fishing point distinct from access entrances. Reuse spatial diagnostics; do not promote ds3091 soft pixels to sand.
