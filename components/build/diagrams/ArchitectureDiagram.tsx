"use client";

import { useProjectStore } from "@/lib/store";
import type { BuildDerivedResult } from "@/lib/hooks/useBuildDerived";

type Props = { result: BuildDerivedResult };

type Layer = { label: string; sublabel: string; color: string };

export function ArchitectureDiagram({ result }: Props) {
  const discovery = useProjectStore((s) => s.activeProject?.discovery);
  if (!discovery) return null;

  const { input, sharding, capacity } = result;

  const layers: Layer[] = [
    {
      label: "Application",
      sublabel: [
        discovery.application.apiGateway !== "none" ? discovery.application.apiGateway.toUpperCase() : null,
        discovery.application.auth !== "none" ? discovery.application.auth.toUpperCase() : null,
        discovery.application.rateLimiting ? "Rate limiting" : null,
      ].filter(Boolean).join(" · ") || "Direct access",
      color: "#8b5cf6",
    },
    {
      label: "Model Platform",
      sublabel: `${discovery.modelPlatform.inferenceServer.toUpperCase()} · ${capacity.replicas} replica${capacity.replicas !== 1 ? "s" : ""} · TP=${sharding.tensorParallelism}`,
      color: "#3b82f6",
    },
    {
      label: "Infrastructure",
      sublabel: `${discovery.infra.orchestrator} · ${capacity.serverCount} node${capacity.serverCount !== 1 ? "s" : ""}`,
      color: "#10b981",
    },
    {
      label: "Hardware",
      sublabel: `${capacity.totalGpus}× ${input.gpu.model} · ${input.gpu.vram_gb} GB VRAM each`,
      color: "#f59e0b",
    },
  ];

  const W = 400;
  const H = 60;
  const GAP = 12;
  const totalH = layers.length * (H + GAP) - GAP + 40;

  return (
    <div className="rounded-lg border">
      <div className="px-4 py-3 border-b bg-muted/30">
        <h3 className="text-sm font-semibold">Architecture Overview</h3>
      </div>
      <div className="p-4 flex justify-center overflow-x-auto">
        <svg width={W} height={totalH} aria-label="Architecture diagram">
          {layers.map((layer, i) => {
            const y = 20 + i * (H + GAP);
            return (
              <g key={layer.label}>
                {/* Arrow from prev */}
                {i > 0 && (
                  <line
                    x1={W / 2} y1={y - GAP}
                    x2={W / 2} y2={y}
                    stroke="var(--border)" strokeWidth={1.5}
                    markerEnd="url(#arrowhead)"
                  />
                )}
                {/* Layer box */}
                <rect
                  x={20} y={y}
                  width={W - 40} height={H}
                  rx={8}
                  fill={layer.color} fillOpacity={0.12}
                  stroke={layer.color} strokeWidth={1.5}
                />
                {/* Layer label */}
                <text
                  x={40} y={y + 22}
                  fontSize={13} fontWeight="600"
                  fill={layer.color} fontFamily="sans-serif"
                >
                  {layer.label}
                </text>
                {/* Sublabel */}
                <foreignObject x={40} y={y + 28} width={W - 60} height={28}>
                  <div
                    // @ts-expect-error xmlns required for SVG foreignObject
                    xmlns="http://www.w3.org/1999/xhtml"
                    style={{ fontSize: 11, color: "var(--muted-foreground)", lineHeight: 1.4, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}
                  >
                    {layer.sublabel}
                  </div>
                </foreignObject>
              </g>
            );
          })}
          {/* Arrowhead marker */}
          <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="4" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="var(--border)" />
            </marker>
          </defs>
        </svg>
      </div>
    </div>
  );
}
