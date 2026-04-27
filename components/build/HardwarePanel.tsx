"use client";

import type { BuildDerivedResult } from "@/lib/hooks/useBuildDerived";
import { useCatalog } from "@/lib/catalogs/client";
import { ExplainSizingButton } from "./ExplainSizingButton";
import { useProjectStore } from "@/lib/store";

type Props = { result: BuildDerivedResult };

function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-start justify-between py-2 border-b last:border-0 gap-4">
      <span className="text-sm text-[var(--text-secondary)] shrink-0">{label}</span>
      <span className="text-sm font-medium text-right">
        {value}
        {sub && <span className="block text-xs text-[var(--text-secondary)] font-normal">{sub}</span>}
      </span>
    </div>
  );
}

export function HardwarePanel({ result }: Props) {
  const { input, sharding, capacity, memory } = result;
  const catalog = useCatalog();
  const server = catalog?.getBestServer(input.gpu.id);
  const project = useProjectStore((s) => s.activeProject);
  const endToEndMs = result.optimizations.adjustedTtftMs + result.optimizations.adjustedItlMs * input.avgOutputTokens;

  return (
    <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)]">
      <div className="px-4 py-3 border-b border-[var(--border-default)] bg-[var(--bg-subtle)]">
        <h3 className="text-sm font-semibold">Hardware</h3>
      </div>
      <div className="px-4 py-1">
        <Row label="GPU"            value={`${input.gpu.model}`}
          sub={`${input.gpu.vram_gb} GB VRAM · ${input.gpu.memory_bandwidth_gbps} GB/s · ${input.gpu.tdp_watts}W TDP`} />
        <Row label="GPU count"      value={`${capacity.totalGpus} total`}
          sub={`${capacity.replicas} replica(s) × ${sharding.gpusPerReplica} GPU/replica`} />
        <Row label="Server"         value={server?.model ?? "Best-match server"}
          sub={server ? `${server.rack_units}U · ${server.tdp_watts}W TDP` : undefined} />
        <Row label="Server count"   value={`${capacity.serverCount}`} />
        <Row label="VRAM required"  value={`${memory.vramTotalGb.toFixed(1)} GB / replica`}
          sub={`Model: ${memory.vramModelGb.toFixed(1)} GB · KV: ${memory.kvCacheTotalGb.toFixed(1)} GB · OH: ${memory.vramOverheadGb.toFixed(1)} GB`} />
        <Row label="Rack units"     value={`${capacity.rackUnits}U`} />
        <Row label="Power draw"     value={`${capacity.powerKw.toFixed(1)} kW`}
          sub="GPU TDP × count + 20% infra overhead" />
        <Row label="Interconnect"   value={sharding.interconnectRecommendation.intraNode}
          sub={sharding.interconnectRecommendation.interNode !== "none"
            ? `Inter-node: ${sharding.interconnectRecommendation.interNode}`
            : "Single-node (no inter-node fabric required)"} />
      </div>
      <div className="px-4 pb-3">
        <ExplainSizingButton context={{
          panel: "hardware",
          modelName: project?.discovery.model.name ?? input.gpu.model,
          paramsB: input.paramsB,
          quantization: input.quantization,
          concurrentUsers: input.concurrentUsers,
          gpuModel: input.gpu.model,
          totalGpus: capacity.totalGpus,
          serverCount: capacity.serverCount,
          replicas: capacity.replicas,
          tensorParallelism: sharding.tensorParallelism,
          pipelineParallelism: sharding.pipelineParallelism,
          ttftMs: result.optimizations.adjustedTtftMs,
          itlMs: result.optimizations.adjustedItlMs,
          endToEndMs,
          powerKw: capacity.powerKw,
          capexUsd: capacity.capexUsd,
          deploymentPattern: project?.deploymentPattern ?? "internal-inference",
          inferenceServer: project?.discovery.modelPlatform.inferenceServer ?? "vllm",
        }} />
      </div>
    </div>
  );
}
