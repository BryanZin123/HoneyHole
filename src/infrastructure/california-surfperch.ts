import type { EffectiveRule } from "../domain/effective-regulations";
/** Research cases, not operative clearance. Booklet publication is NOT a legal effective date. */
const common = {
  authority:
    "California Department of Fish and Wildlife; Title 14 CCR section 28.59",
  sourceUrl:
    "https://nrm.dfg.ca.gov/FileHandler.ashx?DocumentID=239985&inline=",
  species: [
    "redtail surfperch",
    "Amphistichus rhodoterus",
    "barred surfperch",
    "Amphistichus argenteus",
  ],
  jurisdiction: "US-CA",
  methods: ["shore-angling"],
  effectiveFrom: null,
  effectiveTo: null,
  expirationKnown: false,
  verifiedOn: "2026-10-21",
  reviewDue: "2026-10-28",
  coverageFrom: "2026-10-21",
  coverageThrough: "2026-10-21",
  verification: "unverified" as const,
  exceptions: [
    "Legal effective-date history and exact regulatory water boundaries require verification; emergency/local/MPA and gear checks remain incomplete.",
  ],
};
export const californiaSurfperchRules: EffectiveRule[] = [
  {
    ...common,
    id: "CA-28.59-redtail-size-research",
    species: ["redtail surfperch", "Amphistichus rhodoterus"],
    scopeId: "CA-ocean-bay",
    question: "size",
    restriction: {
      kind: "minimum-size",
      minimum: 10.5,
      unit: "inches",
      measurement: "total-length",
    },
    summary:
      "Research evidence only: section 28.59 specifies a 10.5-inch total-length minimum for redtail surfperch. Applicability remains UNVERIFIED.",
  },
  {
    ...common,
    id: "CA-28.59-bay-season-research",
    scopeId: "CA-SF-SanPablo-bays",
    question: "season",
    restriction: { kind: "closed-season", from: "04-01", through: "07-31" },
    summary:
      "Research evidence only: San Francisco/San Pablo bays have an April 1–July 31 surfperch take/possession closure, with a shiner exception. This case includes redtail and barred only; applicability UNVERIFIED.",
  },
  ...(["bag", "possession"] as const).map((question) => ({
    ...common,
    id: `CA-28.59-bay-${question}-research`,
    scopeId: "CA-SF-SanPablo-bays",
    question,
    restriction: { kind: "limit" as const, maximum: 5, unit: "fish" as const },
    summary:
      "Research evidence only: San Francisco/San Pablo bays have a five-surfperch aggregate limit excluding shiner perch. This is not five per species. Applicability and other limits remain UNVERIFIED.",
  })),
];
