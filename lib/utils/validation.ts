import { z } from "zod";
import { DISCOVERY_DEFAULTS } from "@/lib/discovery/defaults";

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export const QuantizationSchema = z.enum([
  "FP32",
  "FP16",
  "BF16",
  "FP8",
  "INT8",
  "INT4",
]);

export const DeploymentPatternSchema = z.enum([
  "internal-inference",
  "external-api",
  "gpuaas-multi-tenant",
  "saas-product",
]);

export const DeploymentTargetSchema = z.enum(["on-prem", "cloud", "hybrid"]);

// ---------------------------------------------------------------------------
// DiscoveryState sub-schemas
// ---------------------------------------------------------------------------

export const ModelSchema = z.object({
  family: z.string().min(1, "Model family is required"),
  name: z.string().min(1, "Model name is required"),
  params: z.number().positive("Params must be > 0"),
  quantization: QuantizationSchema,
  contextLength: z.number().int().min(128).max(2_000_000),
  architecture: z.enum(["dense", "moe"]),
  moeActiveParams: z.number().positive().optional(),
});

export const LoadSchema = z.object({
  concurrentUsers: z.number().int().min(1, "Must have at least 1 concurrent user"),
  requestsPerSecond: z.number().min(0),
  targetLatencyP50Ms: z.number().min(0),
  targetLatencyP95Ms: z.number().min(0),
  targetTTFTMs: z.number().min(0),
  targetITLMs: z.number().min(0),
  avgInputTokens: z.number().int().min(1, "Avg input tokens must be > 0"),
  avgOutputTokens: z.number().int().min(1, "Avg output tokens must be > 0"),
  peakBurstMultiplier: z.number().min(1).max(20),
  uptimeSla: z.number().min(90).max(100),
  streaming: z.boolean(),
});

export const ConstraintsSchema = z.object({
  budgetCapex: z.number().positive().optional(),
  budgetOpexMonthly: z.number().positive().optional(),
  powerBudgetKw: z.number().positive().optional(),
  rackUnitsAvailable: z.number().int().positive().optional(),
  region: z.string().optional(),
  compliance: z.array(z.string()),
});

export const HardwareSchema = z.object({
  preferredVendor: z.enum(["nvidia", "amd", "either"]),
  preferredGpu: z.string().optional(),
  preferredServer: z.string().optional(),
  cooling: z.enum(["air", "liquid", "either"]),
  networking: z.enum(["25G", "100G", "400G", "infiniband"]),
});

export const InfraSchema = z.object({
  orchestrator: z.enum(["kubernetes", "ray", "slurm", "nomad", "bare-metal"]),
  existingCluster: z.boolean(),
  airGapped: z.boolean(),
  gitops: z.enum(["argocd", "flux", "none"]).optional(),
  observability: z.array(z.string()),
});

export const OptimizationsSchema = z.object({
  speculativeDecoding: z.boolean(),
  prefixCaching: z.boolean(),
  fp8KvCache: z.boolean(),
  chunkedPrefill: z.boolean(),
  continuousBatching: z.boolean(),
  flashAttention: z.boolean(),
});

export const ModelPlatformSchema = z.object({
  inferenceServer: z.enum(["vllm", "tgi", "triton", "tensorrt-llm", "sglang"]),
  modelRegistry: z.enum(["mlflow", "huggingface", "s3", "custom"]).optional(),
  multiModelServing: z.boolean(),
  caching: z.enum(["redis", "semantic", "none"]).optional(),
  abTesting: z.boolean(),
  optimizations: OptimizationsSchema,
});

export const ApplicationSchema = z.object({
  apiGateway: z.enum(["kong", "apisix", "envoy", "cloud-native", "none"]),
  auth: z.enum(["oidc", "apikey", "mtls", "jwt", "none"]),
  rateLimiting: z.boolean(),
  uiRequired: z.boolean(),
  auditLogging: z.boolean(),
  metering: z.boolean(),
});

export const DiscoveryStateSchema = z.object({
  model: ModelSchema,
  load: LoadSchema,
  constraints: ConstraintsSchema,
  hardware: HardwareSchema,
  infra: InfraSchema,
  modelPlatform: ModelPlatformSchema,
  application: ApplicationSchema,
});

// ---------------------------------------------------------------------------
// Minimum required fields for the Build section gate (PRD §6.1)
// ---------------------------------------------------------------------------

export const DiscoveryRequiredSchema = z.object({
  model: z.object({
    name: z.string().min(1),
    params: z.number().positive(),
    quantization: QuantizationSchema,
  }),
  load: z.object({
    concurrentUsers: z.number().int().min(1),
    avgInputTokens: z.number().int().min(1),
    avgOutputTokens: z.number().int().min(1),
  }),
});

export type DiscoveryRequiredInput = z.infer<typeof DiscoveryRequiredSchema>;

function applyDefault(
  obj: Record<string, unknown>,
  dotPath: string,
  value: unknown
): Record<string, unknown> {
  const [head, ...rest] = dotPath.split(".");
  if (rest.length === 0) return { ...obj, [head]: value };
  const nested = (obj[head] ?? {}) as Record<string, unknown>;
  return { ...obj, [head]: applyDefault(nested, rest.join("."), value) };
}

export function validateDiscoveryRequired(
  discovery: unknown,
  skipped: string[] = []
): {
  valid: boolean;
  errors: string[];
} {
  // Substitute defaults for skipped fields so they pass schema validation
  let effective = discovery as Record<string, unknown>;
  for (const fieldId of skipped) {
    const defaultVal = DISCOVERY_DEFAULTS[fieldId as keyof typeof DISCOVERY_DEFAULTS];
    if (defaultVal !== undefined) {
      effective = applyDefault(effective, fieldId, defaultVal);
    }
  }
  const result = DiscoveryRequiredSchema.safeParse(effective);
  if (result.success) return { valid: true, errors: [] };
  return {
    valid: false,
    errors: result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`),
  };
}
