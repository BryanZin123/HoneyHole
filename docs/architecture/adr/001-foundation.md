# ADR 001 — Incremental TypeScript web foundation
Status: accepted under the continuation directive. Recorded before source implementation.

Select Next.js App Router, React, TypeScript and npm, with Vitest/React Testing Library and ESLint. Keep the README's React/Next direction. Use CSS initially: no component library is needed for this small foundation. Next server routes compose application use cases and infrastructure adapters; a separate Express process would duplicate HTTP infrastructure without a current requirement. Business rules remain portable TypeScript, without Next/React imports. No database or authentication provider is provisioned in this milestone. PostgreSQL and established identity-provider integration remain planned; do not implement bespoke password/token cryptography.

Alternatives: a Vite SPA plus Express adds a second runtime and cross-origin concerns; a static-only site cannot enforce private-coordinate authorization. Both are unnecessary for this foundation. This is a technical selection, not a framework migration; no prior runtime exists.

Boundaries: domain = values and rules; application = use cases and provider ports; infrastructure = provider adapters; presentation = React components; app = routes and composition. Secrets belong only on the server. Public environment variables must never contain credentials. External input is validated at boundaries; upstream failure is represented explicitly.

Verification: unit tests for safety-relevant missing-data decisions; component tests for honest missing-state presentation; build/typecheck/lint; local HTTP smoke checks. Async server components need integration/E2E checks rather than claims based on Vitest component tests. No arbitrary coverage threshold before a baseline.

Sources accessed 2026-10-18:
- https://nextjs.org/docs/app/getting-started/installation (manual setup, routing, TypeScript, direct ESLint command)
- https://nextjs.org/docs/app/guides/testing/vitest (Vitest setup and async component limitation)
- https://vitest.dev/guide/ (test runner)

Installed exact versions are recorded by package.json and package-lock.json. No paid service or public deployment is required.
