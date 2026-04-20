// Ref: PRD §6.2 — deterministic qualification scoring

import type { ExtractedRequirement } from "@/lib/store";
import type { DiscoveryState } from "@/lib/store";

type QualScore = {
  fitScore: number;       // 0–100
  strengths: string[];
  risks: string[];
  winProbability: "low" | "medium" | "high";
};

/**
 * Compute a qualification score without LLM calls.
 * Based on:
 * - Discovery completeness (up to 40 pts)
 * - Mandatory requirement coverage (up to 40 pts)
 * - Constraint feasibility (up to 20 pts)
 */
export function computeQualification(
  discovery: DiscoveryState,
  requirements: ExtractedRequirement[]
): QualScore {
  const strengths: string[] = [];
  const risks: string[] = [];
  let score = 0;

  // --- Discovery completeness (40 pts) ---
  const fields = [
    discovery.model.name, discovery.model.params, discovery.model.quantization,
    discovery.load.concurrentUsers, discovery.load.avgInputTokens, discovery.load.avgOutputTokens,
    discovery.load.targetLatencyP95Ms,
  ];
  const filled = fields.filter((f) => f !== undefined && f !== 0 && f !== "").length;
  const completeness = filled / fields.length;
  score += Math.round(completeness * 40);

  if (completeness >= 0.85) strengths.push("Discovery is well-populated — sizing is high confidence.");
  else risks.push(`Discovery is ${Math.round(completeness * 100)}% complete — some sizing estimates may be rough.`);

  // --- Mandatory requirements coverage (40 pts) ---
  const mandatory = requirements.filter((r) => r.mandatory);
  let covered = 0;
  for (const req of mandatory) {
    if (req.mapsToDiscoveryField) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parts = req.mapsToDiscoveryField.split(".");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let val: any = discovery;
      for (const p of parts) val = val?.[p];
      if (val !== undefined && val !== 0 && val !== "") covered++;
    } else {
      covered++;  // No field mapping — assume we can address it
    }
  }
  const mandatoryRate = mandatory.length > 0 ? covered / mandatory.length : 1;
  score += Math.round(mandatoryRate * 40);

  if (mandatoryRate < 0.6) risks.push(`Only ${Math.round(mandatoryRate * 100)}% of mandatory requirements are addressed — review Discovery.`);
  else if (mandatoryRate >= 1) strengths.push("All mandatory requirements are addressed in Discovery.");

  // --- Constraint feasibility (20 pts) ---
  const powerOk = !discovery.constraints.powerBudgetKw || discovery.constraints.powerBudgetKw >= 10;
  const budgetOk = !discovery.constraints.budgetCapex || discovery.constraints.budgetCapex > 0;
  if (powerOk && budgetOk) {
    score += 20;
    if (discovery.constraints.powerBudgetKw) strengths.push(`Power budget (${discovery.constraints.powerBudgetKw} kW) is specified.`);
  } else {
    if (!powerOk) risks.push("Power budget may be too tight for this workload.");
    score += 10;
  }

  // Clamp
  score = Math.max(0, Math.min(100, score));

  const winProbability: "low" | "medium" | "high" =
    score >= 75 ? "high" : score >= 50 ? "medium" : "low";

  return { fitScore: score, strengths, risks, winProbability };
}
