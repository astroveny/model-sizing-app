"use client";

import { useMemo } from "react";
import { computeSizing } from "@/lib/sizing/index";
import { getGpuById } from "@/lib/sizing/catalog";
import type { SizingInput } from "@/lib/sizing/types";
import type { BuildDerivedResult } from "@/lib/hooks/useBuildDerived";

type Props = { baseInput: SizingInput };

const NVIDIA_BEST = "h100-sxm";
const AMD_BEST    = "mi300x";

function CompareCol({ label, nvidia, amd, unit = "", lowerIsBetter = true }:
  { label: string; nvidia: number; amd: number; unit?: string; lowerIsBetter?: boolean }) {
  const nvidiaWins = lowerIsBetter ? nvidia <= amd : nvidia >= amd;
  return (
    <div className="grid grid-cols-3 items-center py-2 border-b last:border-0 gap-2 text-sm">
      <span className="text-[var(--text-muted)] text-xs">{label}</span>
      <span className={`text-center font-medium tabular-nums ${nvidiaWins ? "text-[var(--success)]" : ""}`}>
        {nvidia.toFixed(nvidia < 10 ? 1 : 0)}{unit}
      </span>
      <span className={`text-center font-medium tabular-nums ${!nvidiaWins ? "text-[var(--success)]" : ""}`}>
        {amd.toFixed(amd < 10 ? 1 : 0)}{unit}
      </span>
    </div>
  );
}

export function VendorComparison({ baseInput }: Props) {
  const nvidiaGpu = getGpuById(NVIDIA_BEST);
  const amdGpu    = getGpuById(AMD_BEST);

  const { nvidia, amd } = useMemo(() => {
    if (!nvidiaGpu || !amdGpu) return { nvidia: null, amd: null };
    const nResult = computeSizing({ ...baseInput, gpu: nvidiaGpu });
    const aResult = computeSizing({ ...baseInput, gpu: amdGpu });
    return { nvidia: nResult, amd: aResult };
  }, [baseInput, nvidiaGpu, amdGpu]);

  if (!nvidia || !amd || !nvidiaGpu || !amdGpu) return null;

  return (
    <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)]">
      <div className="px-4 py-3 border-b border-[var(--border-default)] bg-[var(--bg-subtle)]">
        <h3 className="text-sm font-semibold">Vendor Comparison</h3>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">NVIDIA H100 SXM vs AMD MI300X</p>
      </div>
      <div className="px-4 py-1">
        {/* Header */}
        <div className="grid grid-cols-3 py-2 border-b text-xs font-semibold text-[var(--text-muted)] gap-2">
          <span></span>
          <span className="text-center">NVIDIA H100</span>
          <span className="text-center">AMD MI300X</span>
        </div>
        <CompareCol label="Total GPUs"       nvidia={nvidia.capacity.totalGpus}      amd={amd.capacity.totalGpus}      lowerIsBetter />
        <CompareCol label="Servers"          nvidia={nvidia.capacity.serverCount}    amd={amd.capacity.serverCount}    lowerIsBetter />
        <CompareCol label="Power (kW)"       nvidia={nvidia.capacity.powerKw}        amd={amd.capacity.powerKw}        lowerIsBetter unit=" kW" />
        <CompareCol label="TTFT (ms)"        nvidia={nvidia.optimizations.adjustedTtftMs} amd={amd.optimizations.adjustedTtftMs} lowerIsBetter unit=" ms" />
        <CompareCol label="Decode tok/s"     nvidia={nvidia.optimizations.adjustedDecodeTokensPerSecPerReplica} amd={amd.optimizations.adjustedDecodeTokensPerSecPerReplica} lowerIsBetter={false} unit="" />
        {nvidia.capacity.capexUsd > 0 && amd.capacity.capexUsd > 0 && (
          <CompareCol label="Est. CapEx"     nvidia={nvidia.capacity.capexUsd / 1e6}  amd={amd.capacity.capexUsd / 1e6}  lowerIsBetter unit="M USD" />
        )}
        <div className="py-2 text-xs text-[var(--text-muted)]">
          <span className="inline-block h-2 w-2 rounded-full bg-[var(--success)] mr-1" />
          Green = better value for this metric
        </div>
      </div>
    </div>
  );
}
