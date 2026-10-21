import {
  regulatoryQuestions,
  type FishingActivity,
  type RegulatoryStatus,
} from "./regulations";
import { validateCoordinates } from "./spatial";
type Question = (typeof regulatoryQuestions)[number];
export type Restriction =
  | { kind: "closed-season"; from: string; through: string }
  | {
      kind: "limit";
      maximum: number;
      unit: "fish" | "inches";
      minimum?: number;
    }
  | { kind: "prohibition" }
  | { kind: "clearance" };
export interface EffectiveRule {
  id: string;
  authority: string;
  sourceUrl: string;
  species: string[];
  jurisdiction: string;
  scopeId: string;
  methods: string[];
  effectiveFrom: string | null;
  effectiveTo: string | null;
  /** True + null expiry means no expiry stated; false means unresolved expiry. */
  expirationKnown: boolean;
  verifiedOn: string;
  reviewDue: string;
  coverageFrom: string;
  coverageThrough: string;
  verification: "verified" | "unverified";
  exceptions: string[];
  question: Question;
  restriction: Restriction;
  summary: string;
}
export interface RegulatoryContext {
  activity: FishingActivity;
  scopes: { id: string; authority: "legal" | "advisory"; sourceUrl: string }[];
  checkedOn: string;
}
export interface RegulatoryFinding {
  rule: EffectiveRule;
  status: RegulatoryStatus;
  reason: string;
  restriction: Restriction;
}
export function validDate(s: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    Number.isFinite(Date.parse(s)) &&
    new Date(s).toISOString().slice(0, 10) === s
  );
}
/** Reviewed coverage is separate from legal effect. No partial set can authorize fishing. */
export function assessRegulations(
  context: RegulatoryContext,
  rules: EffectiveRule[],
) {
  const { activity: a, checkedOn } = context;
  const findings: RegulatoryFinding[] = [];
  let validInput =
    validDate(a.date) &&
    validDate(checkedOn) &&
    !!a.species.trim() &&
    !!a.method.trim();
  try {
    validateCoordinates(a.coordinates);
  } catch {
    validInput = false;
  }
  if (validInput)
    for (const rule of rules) {
      if (
        rule.jurisdiction !== a.jurisdiction ||
        !rule.species.some(
          (s) => s.toLowerCase() === a.species.trim().toLowerCase(),
        ) ||
        !rule.methods.includes(a.method)
      )
        continue;
      let reason =
        "Authoritative rule applies within the reviewed activity and date scope.";
      let status: RegulatoryStatus = "UNVERIFIED";
      const dates = [
        rule.effectiveFrom,
        rule.verifiedOn,
        rule.reviewDue,
        rule.coverageFrom,
        rule.coverageThrough,
      ];
      const scope = context.scopes.some(
        (s) =>
          s.id === rule.scopeId &&
          s.authority === "legal" &&
          s.sourceUrl.startsWith("https://"),
      );
      if (!scope)
        reason =
          "Legal geographic applicability is unresolved; advisory boundaries cannot establish it.";
      else if (
        rule.verification !== "verified" ||
        !rule.authority ||
        !rule.sourceUrl.startsWith("https://") ||
        !rule.expirationKnown ||
        dates.some((d) => !d || !validDate(d)) ||
        (rule.effectiveTo !== null && !validDate(rule.effectiveTo))
      )
        reason = "Source verification or legal effective dates are incomplete.";
      else if (
        rule.verifiedOn > checkedOn ||
        checkedOn > rule.reviewDue ||
        a.date < rule.effectiveFrom! ||
        (rule.effectiveTo !== null && a.date > rule.effectiveTo) ||
        a.date < rule.coverageFrom ||
        a.date > rule.coverageThrough
      )
        reason =
          "Activity or review date falls outside the verified evidence window.";
      else if (rule.exceptions.length)
        reason =
          "An exception requires resolution before this rule can determine eligibility.";
      else {
        const r = rule.restriction;
        if (r.kind === "closed-season") {
          const md = a.date.slice(5);
          const closed =
            r.from <= r.through
              ? md >= r.from && md <= r.through
              : md >= r.from || md <= r.through;
          status = closed ? "VERIFIED_PROHIBITED" : "VERIFIED_PERMITTED";
          reason = closed
            ? "Selected date is within the inclusive closed season."
            : "Outside this rule's closed season; this is not overall fishing permission.";
        } else
          status =
            r.kind === "prohibition"
              ? "VERIFIED_PROHIBITED"
              : r.kind === "limit"
                ? "CONDITIONAL"
                : "VERIFIED_PERMITTED";
      }
      findings.push({ rule, status, reason, restriction: rule.restriction });
    }
  const conflicts = regulatoryQuestions.filter((q) => {
    const f = findings.filter(
      (f) => f.rule.question === q && f.status !== "UNVERIFIED",
    );
    return (
      (f.some((f) => f.status === "VERIFIED_PROHIBITED") &&
        f.some((f) => f.status === "VERIFIED_PERMITTED")) ||
      new Set(
        f
          .filter((f) => f.restriction.kind === "limit")
          .map((f) => JSON.stringify(f.restriction)),
      ).size > 1
    );
  });
  const questions = regulatoryQuestions.map((question) => {
    const f = findings.filter((f) => f.rule.question === question);
    const status: RegulatoryStatus =
      conflicts.includes(question) ||
      !f.length ||
      f.some((f) => f.status === "UNVERIFIED")
        ? "UNVERIFIED"
        : f.some((f) => f.status === "VERIFIED_PROHIBITED")
          ? "VERIFIED_PROHIBITED"
          : f.some((f) => f.status === "CONDITIONAL")
            ? "CONDITIONAL"
            : "VERIFIED_PERMITTED";
    return { question, status };
  });
  const missing = questions
    .filter((q) => q.status === "UNVERIFIED")
    .map((q) => q.question);
  const status: RegulatoryStatus = questions.some(
    (q) => q.status === "VERIFIED_PROHIBITED",
  )
    ? "VERIFIED_PROHIBITED"
    : missing.length
      ? "UNVERIFIED"
      : questions.some((q) => q.status === "CONDITIONAL")
        ? "CONDITIONAL"
        : "VERIFIED_PERMITTED";
  const reason =
    status === "VERIFIED_PROHIBITED"
      ? "An applicable verified prohibition prevents this activity; other checks may remain incomplete."
      : status === "UNVERIFIED"
        ? "Incomplete, conflicting, out-of-date or geographically unresolved evidence. No fishing permission established."
        : status === "CONDITIONAL"
          ? "All required checks are represented; listed conditions must be satisfied."
          : "All required checks are supported for this exact activity.";
  return { status, questions, findings, missing, conflicts, reason, checkedOn };
}
