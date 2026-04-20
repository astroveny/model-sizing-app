"use client";

import type { BuildDerivedResult } from "@/lib/hooks/useBuildDerived";
import { Cpu, Server, Zap, LayoutGrid, DollarSign } from "lucide-react";

type Props = { result: BuildDerivedResult };

function Stat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="text-sm font-semibold tabular-nums">{value}</p>
      </div>
    </div>
  );
}

export function SummaryTotals({ result }: Props) {
  const { capacity, sharding } = result;

  const capexStr = capacity.capexUsd > 0
    ? `$${(capacity.capexUsd / 1_000_000).toFixed(1)}M`
    : "—";

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      <Stat icon={Cpu}        label="Total GPUs"    value={capacity.totalGpus.toString()} />
      <Stat icon={Server}     label="Servers"       value={`${capacity.serverCount} × ${sharding.gpusPerReplica}-GPU`} />
      <Stat icon={Zap}        label="Power"         value={`${capacity.powerKw.toFixed(1)} kW`} />
      <Stat icon={LayoutGrid} label="Rack Units"    value={`${capacity.rackUnits}U`} />
      <Stat icon={DollarSign} label="Est. CapEx"    value={capexStr} />
    </div>
  );
}
