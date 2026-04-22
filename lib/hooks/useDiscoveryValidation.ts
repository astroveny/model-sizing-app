"use client";

import { useProjectStore } from "@/lib/store";
import { validateDiscoveryRequired } from "@/lib/utils/validation";

// Fields checked for overall progress (all Discovery fields that matter for sizing)
const PROGRESS_FIELDS: { path: string; label: string }[] = [
  { path: "model.name", label: "Model name" },
  { path: "model.params", label: "Parameters" },
  { path: "model.quantization", label: "Quantization" },
  { path: "model.contextLength", label: "Context length" },
  { path: "load.concurrentUsers", label: "Concurrent users" },
  { path: "load.avgInputTokens", label: "Avg input tokens" },
  { path: "load.avgOutputTokens", label: "Avg output tokens" },
  { path: "load.targetLatencyP95Ms", label: "P95 latency target" },
  { path: "load.targetTTFTMs", label: "TTFT target" },
  { path: "load.targetITLMs", label: "ITL target" },
  { path: "hardware.preferredVendor", label: "Preferred vendor" },
  { path: "infra.orchestrator", label: "Orchestrator" },
  { path: "modelPlatform.inferenceServer", label: "Inference server" },
  { path: "application.apiGateway", label: "API gateway" },
  { path: "application.auth", label: "Authentication" },
];

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((cur, key) => {
    if (cur && typeof cur === "object") {
      return (cur as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function isFilled(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return value > 0;
  return true;
}

export function useDiscoveryValidation() {
  const discovery = useProjectStore((s) => s.activeProject?.discovery);

  if (!discovery) {
    return {
      isReadyForBuild: false,
      errors: ["No active project"],
      progressPct: 0,
      filledCount: 0,
      totalCount: PROGRESS_FIELDS.length,
    };
  }

  // Required gate (minimum set for Build); skipped fields use their defaults
  const { valid, errors } = validateDiscoveryRequired(discovery, discovery._skipped ?? []);

  // Overall progress: filled OR skipped counts toward progress
  const skipped = discovery._skipped ?? [];
  const discoveryObj = discovery as unknown as Record<string, unknown>;
  const filledCount = PROGRESS_FIELDS.filter(
    ({ path }) => skipped.includes(path) || isFilled(getNestedValue(discoveryObj, path))
  ).length;

  const progressPct = Math.round((filledCount / PROGRESS_FIELDS.length) * 100);

  return {
    isReadyForBuild: valid,
    errors,
    progressPct,
    filledCount,
    totalCount: PROGRESS_FIELDS.length,
  };
}
