// Ref: PRD §7.3 — deployment pattern multipliers
// Ref: docs/sizing-math.md §7

import type { SizingInput, PatternResult } from "./types";

/**
 * Overhead multipliers per deployment pattern.
 * Applied to replica counts and total GPU/server estimates.
 * Ref: PRD §7.3
 */
const PATTERN_OVERHEAD: Record<string, number> = {
  "internal-tool": 1.0,
  "external-api": 1.2,
  "gpuaas": 1.3,
  "saas": 1.25,
};

export function applyDeploymentPattern(input: SizingInput): PatternResult {
  const pattern = input.deploymentPattern ?? "internal-tool";
  const overhead = PATTERN_OVERHEAD[pattern] ?? 1.0;
  const notes: string[] = [];
  const extraSubsystems: string[] = [];

  if (overhead > 1.0) {
    notes.push(
      `Deployment pattern "${pattern}" applies a ${((overhead - 1) * 100).toFixed(0)}% capacity overhead ` +
      `for HA, multi-tenancy, and headroom.`
    );
  }

  if (pattern === "gpuaas" || pattern === "saas") {
    extraSubsystems.push("metering", "billing-api");
    notes.push("GPUaaS/SaaS pattern: metering and billing subsystems required.");
  }

  if (pattern === "gpuaas") {
    extraSubsystems.push("tenant-isolation", "mig-or-vgpu");
    notes.push("GPUaaS: MIG (Multi-Instance GPU) or vGPU required for tenant isolation.");
  }

  if (pattern === "external-api") {
    extraSubsystems.push("rate-limiting", "api-gateway");
    notes.push("External API pattern: API gateway with rate limiting required.");
  }

  return {
    overheadMultiplier: overhead,
    extraSubsystems,
    notes,
  };
}
