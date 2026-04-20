"use client";

import { useProjectStore } from "@/lib/store";
import type { BuildDerivedResult } from "@/lib/hooks/useBuildDerived";

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

export function InfraPanel({ result }: Props) {
  const infra = useProjectStore((s) => s.activeProject?.discovery.infra);
  const { capacity } = result;

  if (!infra) return null;

  const nodePools = [
    { role: "GPU inference", nodes: capacity.serverCount },
    { role: "Control plane", nodes: infra.orchestrator === "kubernetes" ? 3 : 1 },
  ];

  const monitoringStr = infra.observability.length > 0
    ? infra.observability.join(", ")
    : "Not configured";

  return (
    <div className="rounded-lg border">
      <div className="px-4 py-3 border-b bg-muted/30">
        <h3 className="text-sm font-semibold">Infrastructure</h3>
      </div>
      <div className="px-4 py-1">
        <Row label="Orchestrator"    value={infra.orchestrator} />
        <Row label="Node pools"      value={nodePools.map((p) => `${p.role}: ${p.nodes}`).join(" · ")} />
        <Row label="Load balancer"   value={infra.orchestrator === "kubernetes" ? "K8s Service + Ingress" : "Native LB"} />
        <Row label="Air-gapped"      value={infra.airGapped ? "Yes — no external registry access" : "No"} />
        <Row label="GitOps"          value={infra.gitops && infra.gitops !== "none" ? infra.gitops : "Not configured"} />
        <Row label="Observability"   value={monitoringStr} />
        <Row label="Existing cluster" value={infra.existingCluster ? "Yes — sizing into existing" : "New cluster"} />
      </div>
    </div>
  );
}
