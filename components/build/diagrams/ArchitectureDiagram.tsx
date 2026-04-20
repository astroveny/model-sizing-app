"use client";

import { useProjectStore } from "@/lib/store";
import type { BuildDerivedResult } from "@/lib/hooks/useBuildDerived";

type Props = { result: BuildDerivedResult };

export function ArchitectureDiagram({ result }: Props) {
  const discovery = useProjectStore((s) => s.activeProject?.discovery);
  if (!discovery) return null;

  const { input, sharding, capacity } = result;

  const gw = discovery.application.apiGateway !== "none"
    ? discovery.application.apiGateway.toUpperCase()
    : null;
  const auth = discovery.application.auth !== "none"
    ? discovery.application.auth.toUpperCase()
    : null;

  const W = 480;
  const BOX_W = 420;
  const BOX_X = (W - BOX_W) / 2;

  // ── layer definitions ───────────────────────────────────────────────────
  type LayerDef = { label: string; color: string; rows: string[] };
  const layers: LayerDef[] = [
    {
      label: "Application Layer",
      color: "#8b5cf6",
      rows: [
        gw ? `Gateway: ${gw}` : "No API gateway",
        auth ? `Auth: ${auth}` : "No auth",
        discovery.application.rateLimiting ? "Rate limiting enabled" : "No rate limiting",
      ],
    },
    {
      label: "Model Platform",
      color: "#3b82f6",
      rows: [
        `${discovery.modelPlatform.inferenceServer.toUpperCase()} — ${capacity.replicas} replica${capacity.replicas !== 1 ? "s" : ""}`,
        `TP=${sharding.tensorParallelism}  PP=${sharding.pipelineParallelism}  EP=${sharding.expertParallelism}`,
        `KV cache: ${result.memory.kvCacheTotalGb.toFixed(1)} GB/replica`,
      ],
    },
    {
      label: "Infrastructure",
      color: "#10b981",
      rows: [
        `${discovery.infra.orchestrator} · ${capacity.serverCount} node${capacity.serverCount !== 1 ? "s" : ""}`,
        sharding.interconnectRecommendation.interNode !== "none"
          ? `Inter-node: ${sharding.interconnectRecommendation.interNode}`
          : "Single-node deployment",
        discovery.infra.observability.length
          ? `Observability: ${discovery.infra.observability.slice(0, 2).join(", ")}`
          : "No observability configured",
      ],
    },
    {
      label: "Hardware",
      color: "#f59e0b",
      rows: [
        `${capacity.totalGpus}× ${input.gpu.model}`,
        `${input.gpu.vram_gb} GB VRAM · ${input.gpu.memory_bandwidth_gbps} GB/s BW`,
        `Power: ${capacity.powerKw.toFixed(1)} kW · ${capacity.rackUnits}U rack space`,
      ],
    },
  ];

  const ROW_H = 16;
  const PAD = 10;
  const BOX_H = PAD * 2 + 18 + ROW_H * 3;
  const GAP = 20;
  const ARROW_H = GAP;
  const totalH = layers.length * (BOX_H + ARROW_H) - ARROW_H + 30;

  return (
    <div className="rounded-lg border">
      <div className="px-4 py-3 border-b bg-muted/30">
        <h3 className="text-sm font-semibold">Architecture Overview</h3>
      </div>
      <div className="p-4 flex justify-center overflow-x-auto">
        <svg width={W} height={totalH} aria-label="Architecture diagram">
          <defs>
            <marker id="arch-arrow" markerWidth="8" markerHeight="6" refX="6" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#94a3b8" />
            </marker>
          </defs>

          {layers.map((layer, i) => {
            const y = i * (BOX_H + ARROW_H);
            return (
              <g key={layer.label}>
                {/* Connector arrow from layer above */}
                {i > 0 && (
                  <>
                    <line
                      x1={W / 2} y1={y - ARROW_H}
                      x2={W / 2} y2={y - 4}
                      stroke="#94a3b8" strokeWidth={1.5}
                      markerEnd="url(#arch-arrow)"
                    />
                    {/* "Request" label on arrow */}
                    <text x={W / 2 + 5} y={y - ARROW_H / 2 + 4} fontSize={9} fill="#94a3b8" fontFamily="sans-serif">
                      {i === 1 ? "API request" : i === 2 ? "Schedule" : "GPU ops"}
                    </text>
                  </>
                )}

                {/* Box */}
                <rect
                  x={BOX_X} y={y}
                  width={BOX_W} height={BOX_H}
                  rx={8}
                  fill={layer.color} fillOpacity={0.08}
                  stroke={layer.color} strokeWidth={1.5}
                />

                {/* Left color bar */}
                <rect
                  x={BOX_X} y={y}
                  width={5} height={BOX_H}
                  rx={4} fill={layer.color} fillOpacity={0.8}
                />

                {/* Layer title */}
                <text
                  x={BOX_X + 16} y={y + PAD + 12}
                  fontSize={12} fontWeight="700"
                  fill={layer.color} fontFamily="sans-serif"
                >
                  {layer.label}
                </text>

                {/* Detail rows */}
                {layer.rows.map((row, ri) => (
                  <text
                    key={ri}
                    x={BOX_X + 16} y={y + PAD + 26 + ri * ROW_H}
                    fontSize={10.5} fill="var(--muted-foreground)" fontFamily="sans-serif"
                  >
                    {row}
                  </text>
                ))}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
