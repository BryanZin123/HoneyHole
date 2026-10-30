# USGS shoreline-change evaluation — 2026-10-30

Status: contextual pilot BLOCKED by data/metadata access. No USGS geographic records downloaded or processed; no new adapter, API or metadata-only panel added.

## Identified release and permissions

Warrick, J., 2025, *Data to Support Analyses of Widening and Narrowing of Beach Segments in California*, USGS data release, DOI https://doi.org/10.5066/P139YRVP. Published September 9, 2025. Catalog identifier `USGS:689cb749d4be02580cd27720`.

Official landing page: https://www.usgs.gov/data/data-support-analyses-widening-and-narrowing-beach-segments-california

Official catalog: https://data.usgs.gov/datacatalog/data/USGS%3A689cb749d4be02580cd27720

The landing page identifies CC0 1.0 Universal; the USGS catalog identifies public-domain/public access. Cite the release and DOI for provenance even though CC0 imposes no attribution condition. This finding concerns this release, not blanket permission for unrelated underlying products.

## What it measures

The release describes annual deseasonalized shoreline positions from 1984–2024 and total measurement uncertainty for 329 California beach segments, 200–9,300 m long, integrating multiple CoastSat transects. These are shoreline position/change analyses, not observed substrate, current surf-zone condition, fish presence, safe access or legal permission. Publication and catalog modification dates are not observation dates. The broad California catalog bounding box does not establish that a specific Half Moon Bay segment exists or applies to a selected point.

## Actual access results and unresolved fields

Requests from this execution environment returned HTTP 403 for:

- https://www.sciencebase.gov/catalog/item/689cb749d4be02580cd27720?format=json
- https://www.sciencebase.gov/catalog/item/689cb749d4be02580cd27720
- https://cmgds.marine.usgs.gov/catalog/pcmsc/DataReleases/ScienceBase/DR_P139YRVP/Beach_Segment_Shoreline_Positions_metadata.html
- https://data.usgs.gov/datacatalog/metadata/USGS.689cb749d4be02580cd27720.xml

Indexed authoritative descriptions establish the release identity and broad variables but do not replace downloadable records/full metadata. The failure may be provider policy or an intermediary restriction; it does not establish a provider outage. Indexed USGS metadata identifies comma-delimited text (CSV), format version August 11, 2025, and a direct file endpoint: https://www.sciencebase.gov/catalog/file/get/689cb749d4be02580cd27720. Indexed metadata also exposes annual fields such as `Mean_ShorelinePosition_2002` (meters, wave-year mean). This is not a complete schema or an actual downloaded record. The direct file endpoint also returned HTTP 403. Actual file contents, complete field schema, geometry/CRS, actual Half Moon Bay coverage, uncertainty units/confidence/covariance and positional applicability remain unverified. No source identifiers or measured values have been invented. No selected private coordinates were sent during research.

Next bounded step: obtain the original release files and complete metadata through an authorized path, validate one real Half Moon Bay segment with its uncertainty definitions, then decide whether a historical area-level comparison is useful. Aggregate segment trends must never become point-level habitat evidence. Existing ds3115 historical shoreline context remains separate and unchanged.
