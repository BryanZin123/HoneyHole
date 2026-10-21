# ADR 002 — First marine integration

Select NOAA CO-OPS for station water temperature and high/low tide predictions. These are explicitly supported products with documented units, GMT timestamps and MLLW datum. NWS remains the candidate for weather forecasts; NDBC for offshore observations. Neither is substituted for shoreline measurements without coverage review. This incremental selection does not finalize all environmental providers.

Use server-only composition, fixed official HTTPS endpoints, seven-digit station input validation, verified CA station metadata, explicit metric units and GMT. Requests time out after 8 seconds; failures return unavailable states rather than fixtures. No credentials, subscriptions or accounts are created. Official samples use public URLs without API keys. Pricing/licensing terms, operational SLA and quantified rate limits are not fully verified; production deployment is blocked pending operational review. Source documentation discusses throttling; no claimed unlimited use.

Latest observations: configurable freshness default 30 minutes is an operational policy, not a biological threshold. Reject future observations, malformed numeric values, invalid dates, invalid coordinates and flagged temperature observations. Predictions retain separate kind and MLLW datum. Each result contains source URL, station/geographic reference and retrieval time. CA metadata does not prove shoreline accessibility. No location recommendations result from this adapter.

Documentation accessed 2026-10-18:
- https://api.tidesandcurrents.noaa.gov/api/prod/
- https://api.tidesandcurrents.noaa.gov/api/prod/responseHelp.html
- https://api.tidesandcurrents.noaa.gov/mdapi/prod/

Contract tests use explicit fixtures; live HTTP checks must be recorded separately. No final recommendation weights are selected.
