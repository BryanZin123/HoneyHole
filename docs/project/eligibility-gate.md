# Geographic and regulatory exclusion gate — October 21, 2026

Continues verified GitHub checkpoint 3124743a6b328aa79f5fe4679b1fa35b7ceb306b; no reinitialization, recovery regeneration, or main changes.

REQ-ELIG-001: Selected activity and location must have valid, exactly matching coordinates before providers are called. Mismatched activities fail instead of combining evidence from different points.
REQ-ELIG-002: Restricted access or an applicable verified regulatory prohibition excludes a location from recommendations. Both reasons are retained. This is an exclusion gate, not a legal-permission decision.
REQ-ELIG-003: Unknown access, conditional/incomplete rules and unassessed suitability do not authorize recommendations. Alerts remain ineligible even when supplied regulatory evidence is permitted. No scoring thresholds introduced.

Domain logic is provider-independent. Location-detail orchestration integrates it; Explore separates regulatory assessment from recommendation eligibility and displays an explanation. OpenAPI includes EXCLUDED/UNVERIFIED, reason codes, explanation and false alert eligibility. Existing environmental, account, pin and preference behavior preserved.

RED: missing eligibility module confirmed; coordinate-mismatch regression failed before implementation. Seven domain cases plus one orchestration regression added. Initial UI test exposed ambiguous duplicate UNVERIFIED text; assertion now checks both separate statuses and explanation.

Verification: 180 tests passed, zero failed; typecheck and lint passed. First production build failed loading existing Turbopack persistence cache (invalid digit). Generated cache retained separately and clean build retried; final build/HTTP results recorded in accompanying logs. Browser remains unverified. No new live regulatory claims or external-provider verification in this slice. Existing sources/coverage not renewed.

Limitations: no positive recommendation, no expanded species rules, no authoritative new jurisdiction mapping, no notification activation. Evidence quality and freshness remain provider/regulatory-layer responsibilities. Next: authoritative geographic applicability and additional species rules, separately researched and tested. Overall PARTIALLY COMPLETE.

Final clean production build and isolated account/HTTP/restart persistence checks both passed. Logs: eligibility-tests.log, eligibility-build.log, eligibility-http.log.
