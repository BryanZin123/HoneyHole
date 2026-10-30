# USGS acquisition gate — 2026-10-30

Status: BLOCKED, zero actual geographic records acquired. No provider, API or UI integration is justified yet. This supplements [the release evaluation](usgs-shoreline-change-evaluation.md).

## Official access investigation

No repeat requests were made to the previously blocked ScienceBase item/file endpoints or CMGDS full-metadata endpoint in this session. The official USGS publication landing page returned HTTP 202 with no usable download links; the USGS catalog and associated official software repository (`https://code.usgs.gov/pcmsc/sds_tools`) returned HTTP 403. An alternative Data.gov CKAN package lookup returned HTTP 404, not a working data download:

`https://catalog.data.gov/api/3/action/package_show?id=data-to-support-analyses-of-widening-and-narrowing-of-beach-segments-in-california`

The search service returned errors during the alternative-source searches. No mirror, proxy circumvention, guessed data filename or nonofficial dataset was used. These environment-specific responses do not establish that the release is unavailable to the owner. The associated software repository is not a substitute for actual release data.

## Manual download on the owner's trusted computer

1. Open https://doi.org/10.5066/P139YRVP or the [official USGS publication](https://www.usgs.gov/data/data-support-analyses-widening-and-narrowing-beach-segments-california). Confirm title *Data to Support Analyses of Widening and Narrowing of Beach Segments in California*, author Jonathan Warrick, publication September 9, 2025, and ScienceBase item `689cb749d4be02580cd27720`.
2. Follow **View Data Release** to its official file listing. Download the complete original data-and-metadata release if available. Otherwise obtain every listed data CSV plus all associated metadata, README/data dictionary, spatial files and browse map. Keep original filenames and the original archive. Do not substitute an exported screenshot, paper table, or related CoastSat release.
3. The known metadata document is `Beach_Segment_Shoreline_Positions_metadata.html` at https://cmgds.marine.usgs.gov/catalog/pcmsc/DataReleases/ScienceBase/DR_P139YRVP/Beach_Segment_Shoreline_Positions_metadata.html. Obtain its official XML or parseable-text counterpart via the publisher's own links as well. The catalog metadata reference is https://data.usgs.gov/datacatalog/metadata/USGS.689cb749d4be02580cd27720.xml. I cannot confirm the exact original CSV filename or complete file inventory without the release listing; do not rename a guessed CSV to make it appear authoritative.
4. Preserve the complete definitions for segment identifiers, geometry/endpoints/transects, coordinate reference system, wave-year versus calendar-year timing, annual shoreline position/reference baseline, units, missing values, total uncertainty calculation and confidence interpretation. If the release lacks geometry needed to identify a segment, retain that limitation; do not invent an extent from a label or centroid.
5. Save outside the application checkout, for example a new `Downloads\HoneyHole-USGS-P139YRVP` folder. Do not overwrite an existing download. Record landing and final download URLs, UTC retrieval time, filenames, byte sizes, license/citation and any publisher checksum. Compute local checksums:

```powershell
$release = Join-Path $env:USERPROFILE 'Downloads\HoneyHole-USGS-P139YRVP'
Get-ChildItem -LiteralPath $release -File | Select-Object Name, Length
Get-ChildItem -LiteralPath $release -File | Get-FileHash -Algorithm SHA256
```

A locally computed checksum detects later changes; it does not independently prove publisher authenticity. Preserve a publisher checksum for comparison if one is supplied.

6. Supply the original release archive/files, full metadata and provenance record as attachments for validation. Do not include `.env.local`, `.data`, account credentials or private saved-pin exports. If the official site also denies access on Windows, stop; use its listed USGS data contact to request the original release and complete metadata. No bypass is needed or authorized.

## Validation before implementation

- Inspect archive contents safely; reject path traversal and unexpected executables. Verify hashes and match DOI/item/citation across files. Treat changes between retrieved versions as explicit provenance differences.
- Inventory real CSV headers, row counts, identifiers, null conventions and duplicates against complete attribute definitions. Confirm observation years separately from publication/retrieval dates. Do not infer uncertainty confidence levels or convert units without definitions.
- Establish segment geometry/CRS and source positional uncertainty. Determine Half Moon Bay coverage from actual records, not the broad California bounding box.
- Evaluate a deliberately selected fishing coordinate independently of any park entrance. Only relate it to a published segment where the source geometry and uncertainty support that relation; otherwise report no applicable evidence. No snapping, arbitrary nearest-distance threshold or inference from segment-wide trends to a point.
- Check whether a source-linked historical area-level change description provides useful context beyond existing shoreline classification. Keep shoreline position/change separate from substrate, present surf-zone habitat, fish presence, access, safety, regulations and catch predictions.
- Create deterministic tests from properly attributed permitted data only after those checks. No integration panel should be added merely to display metadata.

Human acquisition and actual Windows execution are not yet verified. Recommendations and alerts remain disabled.
