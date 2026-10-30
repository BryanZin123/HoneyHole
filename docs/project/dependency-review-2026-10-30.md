# Targeted fast-uri review — 2026-10-30

Lockfile/`npm ls fast-uri` path: HoneyHole → development dependency `ajv@8.20.0` → `fast-uri@3.1.8`. AJV permits `^3.0.1`. Source searches found AJV imports in test and smoke/API-contract scripts, not application `src`. This narrows application exposure but does not make the affected package safe.

Detailed npm audit identified one affected package (not one advisory):

| Advisory | Behavior | Severity | Affected 3.x range |
| --- | --- | --- | --- |
| [GHSA-w74x-v6f9-j3xg](https://github.com/advisories/GHSA-w74x-v6f9-j3xg) | Percent-encoded scheme decoding/spoofing | Moderate | >=3.0.0 <3.1.9 |
| [GHSA-xhq7-xmqj-769h](https://github.com/advisories/GHSA-xhq7-xmqj-769h) | Relative path equivalence normalization | Low | >=3.0.0 <3.1.9 |
| [GHSA-wjr9-j795-jxcr](https://github.com/advisories/GHSA-wjr9-j795-jxcr) | WHATWG host canonicalization confusion | Moderate | >=3.1.3 <3.1.9 |
| [GHSA-333x-w4r6-6crp](https://github.com/advisories/GHSA-333x-w4r6-6crp) | Unescaped first-segment colon/scheme injection | Low | >=3.0.0 <3.1.9 |

These issues concern URI parsing/normalization and downstream trust decisions. HoneyHole uses AJV for controlled API schema checks; no direct production import or confirmed exploitable application route was found. This is not a universal non-exploitability guarantee.

`npm view fast-uri@3.1.9` confirmed the published patch and registry integrity. Targeted `npm update fast-uri --ignore-scripts` changed exactly the fast-uri version, tarball URL and integrity in package-lock.json, from 3.1.8 to 3.1.9. No package.json change, overrides, force upgrade or direct dependency changes. It satisfies AJV's existing semver range. Corrected URI behavior can change malformed-input normalization; compatibility is established for HoneyHole by regression/contract checks, not by claiming every possible input is unaffected.

Before/after detailed audit JSON is retained alongside this report. After update, npm audit reports zero vulnerabilities across all severities. Tests, typecheck, lint, clean build, API/authentication/persistence and real desktop/mobile Chromium checks remain the completion gate; remote CI results are reported for the actual synchronized SHA.
