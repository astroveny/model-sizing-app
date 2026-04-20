"use client";

import { useProjectStore } from "@/lib/store";
import type { BuildDerivedResult } from "@/lib/hooks/useBuildDerived";

type Props = { result: BuildDerivedResult };

function Row({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className="flex items-start justify-between py-2 border-b last:border-0 gap-4">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className={`text-sm font-medium text-right ${highlight ? "text-primary" : ""}`}>
        {value}
        {sub && <span className="block text-xs text-muted-foreground font-normal">{sub}</span>}
      </span>
    </div>
  );
}

function LatencyBar({ valueMs, targetMs }: { valueMs: number; targetMs: number }) {
  const pct = Math.min(100, (valueMs / targetMs) * 100);
  const over = valueMs > targetMs;
  return (
    <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${over ? "bg-amber-500" : "bg-emerald-500"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function ModelPlatformPanel({ result }: Props) {
  const modelPlatform = useProjectStore((s) => s.activeProject?.discovery.modelPlatform);
  const { sharding, prefill, decode, optimizations, capacity, input } = result;

  if (!modelPlatform) return null;

  const endToEndMs = optimizations.adjustedTtftMs + optimizations.adjustedItlMs * input.avgOutputTokens;
  const targetMs = input.targetEndToEndMs;

  const opts = Object.entries(modelPlatform.optimizations)
    .filter(([, v]) => v)
    .map(([k]) => k.replace(/([A-Z])/g, " $1").toLowerCase())
    .join(", ");

  return (
    <div className="rounded-lg border">
      <div className="px-4 py-3 border-b bg-muted/30">
        <h3 className="text-sm font-semibold">Model Platform</h3>
      </div>
      <div className="px-4 py-1">
        <Row label="Inference server"  value={modelPlatform.inferenceServer.toUpperCase()} />
        <Row label="Replicas"          value={`${capacity.replicas}`}
          sub={`${sharding.gpusPerReplica} GPU/replica → ${capacity.totalGpus} GPU total`} />
        <Row label="Sharding"          value={`TP=${sharding.tensorParallelism} · PP=${sharding.pipelineParallelism} · EP=${sharding.expertParallelism}`} />
        <Row label="KV cache / replica" value={`${result.memory.kvCacheTotalGb.toFixed(1)} GB`}
          sub={`${result.memory.kvCachePerRequestGb.toFixed(2)} GB/request × ${input.concurrentUsers} users`} />

        <div className="py-2 border-b">
          <div className="flex items-start justify-between gap-4">
            <span className="text-sm text-muted-foreground">TTFT</span>
            <span className="text-sm font-medium">{optimizations.adjustedTtftMs.toFixed(1)} ms</span>
          </div>
          <LatencyBar valueMs={optimizations.adjustedTtftMs} targetMs={targetMs * 0.3} />
        </div>

        <div className="py-2 border-b">
          <div className="flex items-start justify-between gap-4">
            <span className="text-sm text-muted-foreground">ITL (per token)</span>
            <span className="text-sm font-medium">{optimizations.adjustedItlMs.toFixed(1)} ms</span>
          </div>
        </div>

        <div className="py-2 border-b">
          <div className="flex items-start justify-between gap-4">
            <span className="text-sm text-muted-foreground shrink-0">End-to-end P95</span>
            <span className={`text-sm font-medium text-right ${endToEndMs > targetMs ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
              {endToEndMs.toFixed(0)} ms
              <span className="block text-xs text-muted-foreground font-normal">target: {targetMs.toFixed(0)} ms</span>
            </span>
          </div>
          <LatencyBar valueMs={endToEndMs} targetMs={targetMs} />
        </div>

        <Row label="Decode throughput"  value={`${optimizations.adjustedDecodeTokensPerSecPerReplica.toFixed(0)} tok/s`}
          sub="per replica" />
        <Row label="Confidence"         value={result.confidence.toUpperCase()}
          highlight={result.confidence === "low"} />
        <Row label="Optimizations"      value={opts || "None enabled"} />
      </div>
    </div>
  );
}
