# Fishing planning support — 2026-11-04

## Confirmed defects and bounded changes

- Fishing-point habitat request hard-coded barred surfperch. The UI now requires an intentional target choice; optional API `species` defaults to unassessed, preserving request compatibility without assigning a hidden species. Unsupported targets remain unassessed. Species changes abort prior requests and invalidate evidence; response point/date/species must match.
- NOAA tide retrieval used current UTC plus 24 hours. Fishing-point and access-point date now flows to station retrieval. California civil midnight boundaries are converted independently to UTC; spring/fall DST days span 23/25 hours. End is exclusive; NOAA end_date is the preceding minute. Observations still request latest temperature and are only displayed when valid for the selected day. This is not historical-temperature retrieval or a future temperature forecast.
- NWS /points for the owner coordinate identifies `type: marine`, grid MTR/96,59. Live hourly endpoint returned HTTP 404; raw grid returned HTTP 200. Official NWS documentation states coastal marine API forecasts are available through forecastGridData only. The hourly adapter now reports that documented capability limitation for marine points; timestamp, geometry, source-URL and freshness validation remain intact for supported products. Existing grid fields remain independently available.
- Authenticated-state check and focus refresh replace the always-visible sign-in prompt. This is display logic only; server authorization still governs saving. Successful private save also updates the display; a 401 restores the sign-in path.
- A short planning summary now precedes collapsible source details. It separates species association, exact-point habitat uncertainty, selected-day conditions, unknown hazards, access/legal status and practical next checks. Missing data is never classified as unfavorable. No scores, safety clearance, fish-presence claims or alerts.

## Monterey Bay real-data probe

Existing licensed CDFW ds3115 adapter, not a new provider. Public fixed envelope `[-122.05,36.65,-121.75,36.95]`, geographic WGS84 request/output, queried via the existing FeatureServer spatial-envelope operation. Private coordinates are not placed in that query. Envelope choice reveals only the broad pilot region.

Service: https://services2.arcgis.com/Uq9r85Potqm3MfRV/arcgis/rest/services/biosds3115_fnu/FeatureServer/0

Metadata/attribution: https://filelib.wildlife.ca.gov/public/BDB/GIS/BIOS/metadata/ds3115.html ; existing CC BY 4.0 attribution and NOAA ESI interpretation limits retained.

Live response: 172 features, all normalized by the existing strict adapter; 161 labeled ESI 2006, 11 ESI 2002. These are original mapping years, not current surveys. The response was below the 2,000-record cap and had no reported transfer truncation. Closest returned segments to the privately supplied fishing point (exact coordinates omitted from this public record):

| Feature | Original code | Source | Computed geodesic line distance |
| --- | --- | --- | --- |
| 10333 | 3A | ESI 2006 | 5435.618 m |
| 12114 | 3A | ESI 2006 | 5444.549 m |
| 12111 | 3A | ESI 2006 | 5760.393 m |

Distances calculated using the application's Turf geodesic point-to-line method on actual returned geometry; not navigation distances or proof of point applicability. 3A denotes fine/medium sand in the source classification. Positional accuracy remains unknown; no distance cutoff converts historical context into present-day substrate. No snap or entrance substitution. This validates bounded area coverage, not coverage at every point or unrestricted fishing access.

## Environmental findings and sources

https://www.weather.gov/documentation/services-web-api — documented coastal-marine grid-only API capability, next-seven-day forecast products, provider limits.
https://www.weather.gov/marine/point — marine point forecasts represent grid cells and do not replace surrounding-zone advisories.
https://api.tidesandcurrents.noaa.gov/api/prod/ — existing NOAA GMT predictions contract; station transfer remains UNVERIFIED.

At the owner point, discovery URL rounded to four decimals only for the established NWS API protocol; the application's exact point identity is retained. No point was moved to a land cell to force hourly availability. Grid availability is not hazard clearance. No new hazard feed was introduced; users are directed to official NWS warnings for manual verification. Future dates beyond forecast coverage and observations outside the selected day remain unavailable, not bad conditions.

## Scientific evidence boundary

CDFW describes barred surfperch sandy-beach surf-zone associations and collects catch/effort information: https://wildlife.ca.gov/Conservation/Marine/Surf and https://marinespecies.wildlife.ca.gov/barred-surfperch-and-redtail-surfperch/monitoring/ . Habitat association does not establish presence or catch rates at a pin.

Koval (2022), *Factors Affecting Seasonal Variation of Surf Zone Assemblages in Central California*: https://digitalcommons.csumb.edu/caps_thes_all/1302/ . Four central-California beaches, July 2020–June 2021, underwater-video abundance/community sampling. Environmental associations included wave height and visibility. This supports research hypotheses, not an independently validated angling-catch model; abundance proxies and seasonal patterns cannot be treated as individual-trip predictions. Larger-wave associations must never become advice to enter hazardous surf.

*Tidal phase mediates sandy beach prey resource use by a surf zone fish, Amphistichus argenteus*: https://www.sciencedirect.com/science/article/abs/pii/S0272771425004871 . Indexed abstract describes diet/invertebrate surveys at one Santa Barbara beach over six spring/neap surveys in 2020; direct publisher access returned 403. This is limited dietary evidence, not a validated Monterey catch predictor. No coefficients extracted or generalized.

CDFW's Southern California beach-fishing guide supplies qualitative tide/time-of-day advice: https://wildlife.ca.gov/Fishing/Ocean/Beach-Fishing/1000 . Advice is not a fitted, independently tested species/location probability model. No validated wind, pressure, moon, tide or temperature catch model was established in this review. That is a limitation of the reviewed evidence, not proof that no such studies exist. Prediction activation requires suitable catch/effort data, species/gear/site controls, temporally and geographically held-out validation, uncertainty calibration and independent safety/legal gates.

## Nearby areas design (not activated)

Smallest next feature: source-backed **areas to investigate**, filtered by user-selected radius around an explicitly chosen map center; optional browser geolocation only after an explicit action and permission. Explain separately that sending an exact center to an external search service requires consent. Browser permission alone is not authorization to share location upstream. Prefer broad public envelopes/local distance filtering where supported. Radius is straight-line distance, not promised travel distance or a safe route.

Inputs: center, maximum radius, target species, California fishing date/time and shoreline style. No automatic use of private saved pins. Each returned candidate retains source identity and entrance-vs-fishing-point type; apply independent habitat, environmental availability, freshness, access, regulatory and hazard checks. Verified prohibitions exclude candidates before presentation. Missing access/regulations/hazards remain unknown, never permission/safety. Do not order by invented suitability; initial ordering may use labeled distance with stable source-ID tie breaks. No arbitrary generated candidate coordinates. State Parks commercial licensing remains unresolved and must be respected.

Acceptance gate for that next feature: prove owner isolation, explicit transmission consent, empty/outage handling, per-candidate evidence identity, exclusion precedence, honest radius units and desktop/mobile behavior. No recommendation or notification activation.
