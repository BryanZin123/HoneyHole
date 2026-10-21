# API v1

Contract: `openapi.json`. Read-only GET `/api/v1/conditions?station=9414290`. Header `X-API-Version: 1`. JSON, UTC ISO timestamps, numeric SI values with explicit units. HTTP 200 means the station passed the active regional gate; it does not mean every measurement is available or that fishing is recommended. Each product has available/stale/unavailable status. Nullable fields are unknown, never zero by default. Forecast `issuedAt` remains null where the upstream service only exposes update/generation timestamps; they are not silently equated.

The unversioned `/api/conditions` remains an alias for compatibility. New clients use v1. Breaking changes require a new version; additive response fields may be introduced. Clients must tolerate additional properties and handle unavailable states. Forecast ranges may exceed the 12-hour display; UI limits do not change API contents.

Current endpoint returns public station coordinates only. Private saved-location APIs and identity have not been implemented. Future mobile clients use authenticated server APIs and must not access the database directly. Do not send private locations as arbitrary URLs or credentials to this endpoint. Only fixed official provider origins are queried.

A six-hour NWS update-age limit and 30-minute CO-OPS observation-age limit are operational freshness defaults, not scientifically validated fishing thresholds. The v1 endpoint may take up to four sequential 8-second request windows in failure scenarios. Provider throttling, cache design, load testing and production monitoring remain predeployment work.

## Coastal evidence endpoint
`GET /api/v1/coastal-access?latitude=37.8063&longitude=-122.4659`

HTTP 400 for missing/invalid coordinates or outside the adapter's coarse California query envelope. HTTP 200 includes independent evidence statuses even when a provider is unavailable. `access.status` is verified-public, restricted or unknown; verified-public refers only to explicit Open Access source records. `protectedAreas` is advisory polygon evidence. `fishingPermission`, `temporaryClosures`, and `speciesRegulations` are always unknown; `legallyVerified` is false. No empty-result interpretation grants access or legal permission. The envelope does not establish shoreline or state membership. Responses have no-store and X-API-Version: 1 headers.

OpenAPI includes geographic evidence and the NWS requestStartedAt, responseReceivedAt and errorCode fields. Live smoke validates both responses against these schemas with AJV. Documentation of clock/freshness policy: ../architecture/nws-validation-policy.md.


The conditions endpoint additionally returns `atmosphere`: `grid` (forecast intervals), `pressure` (nearby observation, station identity/distance, optional same-station hPa/hour slope) and `light` (calculated solar events/current phase). Each carries independent status, source and receipt time. Null measurements never imply zero. OpenAPI documents this optional additive field; runtime endpoint supplies it. Six-hour grid and 90-minute observation age limits are operational policies, not fishing criteria.
