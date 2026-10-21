# ADR 004: Regional coastal evidence, not legal recommendations

Accepted 2026-10-18. Keep spatial operations and access assessment independent of California providers. Use GeoJSON WGS84 and Turf for polygon holes, multipolygons, and boundary inclusion. Query official fixed ArcGIS URLs with point-intersection filters; independently verify returned geometry. Reject malformed or truncated results rather than treat an incomplete response as clearance. Each provider fails independently. Queries are evidence checks, not coastal-location discovery or proof of shoreline membership.

CPAD holdings (2026a, June 2026) from CNRA explicitly distinguish Open Access, Restricted Access, No Public Access and Unknown Access. Only explicit Open Access becomes verified-public, meaning verified against that source, not current on-site conditions. Overlapping restrictions prevail. Ownership alone never grants access. CDFW ds582 supplies advisory mapped MPA intersections; absence never grants fishing permission. Temporary closures, species rules, fishing permissions and current legal MPA boundaries remain unknown. No candidate is legally verified or recommended.

Sources reviewed:
- https://data.ca.gov/@california-natural-resources-agency/california-protected-areas-database — CC Attribution, no restrictions on public use; CPAD maintained by GreenInfo Network.
- https://gis.cnra.ca.gov/arcgis/rest/services/Boundaries/CPAD_AccessType/MapServer/0 — actual holdings fields and classifications; CPAD June 2026 attribution.
- https://calands.org/cpad/ — coverage excludes some land types; holdings are not exact assessor parcels.
- https://data.ca.gov/@california-department-of-fish-and-wildlife/california-marine-protected-areas-ds582 — CC Attribution. Description references 2019 despite newer catalog metadata; not intended to define legal boundaries. Do not equate catalog update with regulatory currency.
- https://services2.arcgis.com/Uq9r85Potqm3MfRV/arcgis/rest/services/biosds582_fpu/FeatureServer/0 — CDFW geometry and attribution.
- https://coastal.ca.gov/YourCoast/ — authoritative access-point catalog researched, including beaches and pier-type features. Its linked ArcGIS item license includes additional indemnification terms; redistribution/use terms not cleared for this implementation. Adapter not enabled. No invented beach, pier, jetty, rocky-shore, bay or estuary classification. These domain categories remain unknown until sourced explicitly.

No new hosted or paid infrastructure. Existing alert contracts remain dormant. Next: licensed shoreline/access-point discovery, current closures and regulatory evaluation, then candidate recommendation eligibility and interactive mapping.
