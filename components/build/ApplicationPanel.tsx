"use client";

import { useProjectStore } from "@/lib/store";
import type { BuildDerivedResult } from "@/lib/hooks/useBuildDerived";

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

export function ApplicationPanel({ result }: Props) {
  const app = useProjectStore((s) => s.activeProject?.discovery.application);
  const streaming = useProjectStore((s) => s.activeProject?.discovery.load.streaming);
  const deploymentPattern = useProjectStore((s) => s.activeProject?.deploymentPattern);
  const { input } = result;

  if (!app) return null;

  const needsMetering = deploymentPattern === "gpuaas-multi-tenant" || deploymentPattern === "saas-product" || app.metering;
  const rpsLimit = Math.ceil(input.concurrentUsers * 1.5);
  const burstLimit = Math.ceil(rpsLimit * input.peakBurstMultiplier);

  return (
    <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)]">
      <div className="px-4 py-3 border-b border-[var(--border-default)] bg-[var(--bg-subtle)]">
        <h3 className="text-sm font-semibold">Application</h3>
      </div>
      <div className="px-4 py-1">
        <Row label="API gateway"     value={app.apiGateway === "none" ? "None" : app.apiGateway.toUpperCase()} />
        <Row label="Auth"            value={app.auth === "none" ? "None" : app.auth.toUpperCase()} />
        <Row label="Rate limiting"   value={app.rateLimiting ? `${rpsLimit} RPS · burst ${burstLimit}` : "Disabled"} />
        <Row label="UI required"     value={app.uiRequired ? "Yes" : "No"} />
        <Row label="Audit logging"   value={app.auditLogging ? "Enabled" : "Disabled"} />
        {needsMetering && (
          <Row label="Metering"      value="Required"
            sub="Billing API + usage tracking (GPUaaS/SaaS pattern)" />
        )}
        <Row label="Streaming"       value={streaming ? "Enabled (SSE/WS)" : "Disabled"} />
      </div>
    </div>
  );
}
