"use client";

import type { BuildDerivedResult } from "@/lib/hooks/useBuildDerived";
import { getBestServer } from "@/lib/sizing/catalog";

type Props = { result: BuildDerivedResult };

function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-start justify-between py-2 border-b last:border-0 gap-4">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium text-right">
        {value}
        {sub && <span className="block text-xs text-muted-foreground font-normal">{sub}</span>}
      </span>
    </div>
  );
}

export function HardwarePanel({ result }: Props) {
  const { input, sharding, capacity, memory } = result;
  const server = getBestServer(input.gpu.id);

  return (
    <div className="rounded-lg border">
      <div className="px-4 py-3 border-b bg-muted/30">
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
    </div>
  );
}
