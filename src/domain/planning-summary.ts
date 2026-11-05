/** Evidence status only. A verified exclusion always takes precedence. */
export function planningStatus(
  excluded: boolean,
  conditionsAvailable: boolean,
  completeReviewedEvidence: boolean,
) {
  if (excluded) return "EXCLUDED";
  if (completeReviewedEvidence) return "FURTHER REVIEW POSSIBLE";
  return conditionsAvailable
    ? "CONDITIONS AVAILABLE"
    : "INSUFFICIENT INFORMATION";
}
