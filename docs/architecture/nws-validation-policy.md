# NWS timestamp, location and partial-data policy

Request start and response receipt are distinct instants. Capture requestStartedAt before discovery; responseReceivedAt after forecast body retrieval. retrievedAt equals receipt for a received forecast. Provider updateTime and generatedAt retain their own fields; issuedAt remains unknown because update/generation is not silently declared an issuance time.

Default permitted provider-clock lead: 120,000 ms (inclusive), relative to receipt. Greater lead is rejected. A local clock reversal beyond that tolerance is rejected. Freshness uses receipt minus provider updateTime, with a default 21,600,000 ms / six-hour limit; older data is stale. Both values are explicit constructor parameters and operational policies, not scientific fishing criteria. Missing/invalid provider timestamps are rejected, not filled with current time. Forecast validity windows are validated separately: end must follow start and not be expired at receipt. Retain upcoming windows regardless of their future start time. No weather/tide values are joined into a shared score or inferred common window.

Forecast URLs must be discovered from the queried point and match the official NWS origin/path. The forecast grid polygon must contain the requested station coordinates (Turf, WGS84 lon/lat). Polygon membership proves grid coverage only, not precise local weather, safe shoreline access, or fishing legality.

Missing wind/temperature remain null with missingFields. Provider HTTP errors and network failures have separate errorCode values from invalid data. Provider failures do not become empty successful forecasts. Tide and water-temperature absence remains independent of weather; no other station is silently substituted. Coastal hourly coverage is provider-dependent.

Regression evidence: tests/nws.test.ts, tests/environment.test.ts and live gate logs. Source: https://www.weather.gov/documentation/services-web-api (accessed 2026-10-18); geometry function documentation https://turfjs.org/docs/api/booleanPointInPolygon.
