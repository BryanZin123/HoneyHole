import type { AccessStatus } from "./coastal";
import type { RegulatoryStatus } from "./regulations";
/** Exclusion gate only. Access evidence never establishes fishing permission or suitability. */
export function assessLocationEligibility(
  access: AccessStatus,
  regulations: RegulatoryStatus,
) {
  const reasons: string[] = [];
  if (access === "restricted") reasons.push("ACCESS_RESTRICTED");
  if (regulations === "VERIFIED_PROHIBITED")
    reasons.push("REGULATORY_PROHIBITION");
  const excluded = reasons.length > 0;
  if (!excluded) {
    if (access === "unknown") reasons.push("ACCESS_UNKNOWN");
    if (regulations !== "VERIFIED_PERMITTED")
      reasons.push("REGULATORY_CHECKS_INCOMPLETE");
    reasons.push("SUITABILITY_NOT_ASSESSED");
  }
  return {
    eligibility: excluded ? ("EXCLUDED" as const) : ("UNVERIFIED" as const),
    reasons,
    explanation: excluded
      ? "Excluded from fishing recommendations by restricted access or an applicable verified prohibition. See the separate access and regulatory evidence."
      : "No fishing recommendation established. Access, regulatory conditions and species suitability require independent verification.",
    alertEligible: false as const,
  };
}
