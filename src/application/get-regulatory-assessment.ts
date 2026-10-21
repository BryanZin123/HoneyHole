import {
  assessRegulations,
  type EffectiveRule,
  type RegulatoryContext,
} from "../domain/effective-regulations";
export interface RegulationProvider {
  getRules(): Promise<EffectiveRule[]>;
}
export async function getRegulatoryAssessment(
  context: RegulatoryContext,
  provider: RegulationProvider,
) {
  try {
    return assessRegulations(context, await provider.getRules());
  } catch {
    return {
      ...assessRegulations(context, []),
      reason:
        "Regulatory provider unavailable. No fishing permission established.",
    };
  }
}
