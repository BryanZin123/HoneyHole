import { californiaSurfperchRules } from "./california-surfperch";
import type { RegulationProvider } from "../application/get-regulatory-assessment";
import type { EffectiveRule } from "../domain/effective-regulations";
/** Human-reviewed FGC adopted text + current CDFW corroboration. No automatic legal-date inference. */
const common = {
  authority:
    "California Fish and Game Commission / California Department of Fish and Wildlife",
  sourceUrl: "https://nrm.dfg.ca.gov/FileHandler.ashx?DocumentID=202020",
  species: ["California grunion", "grunion"],
  jurisdiction: "US-CA",
  scopeId: "US-CA",
  methods: ["shore-angling", "hand-gathering"],
  effectiveFrom: "2022-06-01",
  effectiveTo: null,
  expirationKnown: true,
  verifiedOn: "2026-10-21",
  reviewDue: "2026-10-28",
  coverageFrom: "2026-01-01",
  coverageThrough: "2026-10-21",
  verification: "verified" as const,
  exceptions: [],
};
export const californiaEffectiveRules: EffectiveRule[] = [
  {
    ...common,
    id: "CA-28.00-season",
    question: "season",
    restriction: { kind: "closed-season", from: "04-01", through: "06-30" },
    summary:
      "California grunion take is closed April 1–June 30, inclusive. Outside this closure other rules still apply.",
  },
  {
    ...common,
    id: "CA-28.00-bag",
    question: "bag",
    restriction: { kind: "limit", maximum: 30, unit: "fish" },
    summary:
      "California grunion daily bag limit: 30 fish. This does not authorize take.",
  },
  {
    ...common,
    id: "CA-28.00-possession",
    question: "possession",
    restriction: { kind: "limit", maximum: 30, unit: "fish" },
    summary:
      "California grunion possession limit: 30 fish. This does not authorize take.",
  },
];
export class CaliforniaRegulationProvider implements RegulationProvider {
  async getRules() {
    return structuredClone([
      ...californiaEffectiveRules,
      ...californiaSurfperchRules,
    ]);
  }
}
