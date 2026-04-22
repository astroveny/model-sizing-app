"use client";

import type { BuildDerivedResult } from "@/lib/hooks/useBuildDerived";
import { getBestServer } from "@/lib/sizing/catalog";

type Props = { result: BuildDerivedResult };

const UNIT_PX = 13;
const RACK_WIDTH = 160;
const RACK_UNITS = 42;
const LABEL_W = 28; // unit number column width

export function RackLayout({ result }: Props) {
  const { capacity, input } = result;
  const server = getBestServer(input.gpu.id);
  const serverU = server?.rack_units ?? 4;
  const count = capacity.serverCount;
  const powerPerServer = server ? (server.tdp_watts / 1000).toFixed(1) : "?";

  const racksNeeded = Math.ceil((count * serverU) / RACK_UNITS);
  let globalServer = 0;

  const racks = Array.from({ length: racksNeeded }, (_, ri) => {
    const servers: { label: string; gpus: number; u: number }[] = [];
    let used = 0;
    while (used + serverU <= RACK_UNITS && globalServer < count) {
      servers.push({
        label: `S${globalServer + 1}`,
        gpus: count > 0 ? Math.ceil(capacity.totalGpus / count) : 0,
        u: serverU,
      });
      used += serverU;
      globalServer++;
    }
    return { servers, usedU: used };
  });

  const rackH = RACK_UNITS * UNIT_PX;

  return (
    <div className="rounded-lg border border-[var(--border-default)]">
      <div className="px-4 py-3 border-b border-[var(--border-default)] bg-[var(--bg-subtle)] flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold">Rack Layout</h3>
        <div className="flex gap-3 text-xs text-[var(--text-secondary)]">
          <span>{count} server{count !== 1 ? "s" : ""}</span>
          <span>{racksNeeded} rack{racksNeeded !== 1 ? "s" : ""}</span>
          <span>{serverU}U / server</span>
          <span>{capacity.powerKw.toFixed(1)} kW total</span>
        </div>
      </div>

      <div className="p-4 overflow-x-auto">
        <div className="flex gap-8 items-start">
          {racks.map((rack, ri) => (
            <div key={ri} className="flex flex-col items-center gap-1.5">
              <span className="text-xs font-medium text-[var(--text-secondary)]">Rack {ri + 1}</span>
              <div className="flex gap-0">
                {/* Unit number column */}
                <svg width={LABEL_W} height={rackH + 2} className="shrink-0">
                  {Array.from({ length: RACK_UNITS }, (_, u) => (
                    u % 5 === 0 ? (
                      <text key={u} x={LABEL_W - 4} y={u * UNIT_PX + UNIT_PX / 2 + 3}
                        textAnchor="end" fontSize={7} fill="var(--text-muted)" fontFamily="monospace">
                        {u + 1}U
                      </text>
                    ) : null
                  ))}
                </svg>

                {/* Rack body */}
                <svg
                  width={RACK_WIDTH} height={rackH + 2}
                  className="border border-[var(--border-default)] rounded"
                  aria-label={`Rack ${ri + 1}`}
                >
                  {/* Background */}
                  <rect x={0} y={0} width={RACK_WIDTH} height={rackH} fill="var(--bg-subtle)" opacity={1} />

                  {/* Rack unit grid lines */}
                  {Array.from({ length: RACK_UNITS + 1 }, (_, u) => (
                    <line key={u}
                      x1={0} y1={u * UNIT_PX}
                      x2={RACK_WIDTH} y2={u * UNIT_PX}
                      stroke="var(--border-default)" strokeWidth={u % 5 === 0 ? 0.8 : 0.3} opacity={0.6}
                    />
                  ))}

                  {/* Server blocks */}
                  {rack.servers.reduce<{ els: React.ReactNode[]; y: number }>(
                    (acc, srv, si) => {
                      const h = srv.u * UNIT_PX - 2;
                      const gpuCount = count > 0 ? Math.ceil(capacity.totalGpus / count) : 0;
                      acc.els.push(
                        <g key={si}>
                          {/* Server body */}
                          <rect
                            x={3} y={acc.y + 1}
                            width={RACK_WIDTH - 6} height={h}
                            rx={3}
                            fill="#3b82f6" fillOpacity={0.85}
                            stroke="#1e40af" strokeWidth={0.8}
                          />
                          {/* Server label */}
                          <text
                            x={RACK_WIDTH / 2} y={acc.y + h / 2 - 2}
                            textAnchor="middle" fontSize={9}
                            fill="white" fontWeight="600" fontFamily="monospace"
                          >
                            {srv.label}
                          </text>
                          <text
                            x={RACK_WIDTH / 2} y={acc.y + h / 2 + 9}
                            textAnchor="middle" fontSize={7.5}
                            fill="rgba(255,255,255,0.75)" fontFamily="sans-serif"
                          >
                            {gpuCount}× {input.gpu.model}
                          </text>
                          <text
                            x={RACK_WIDTH / 2} y={acc.y + h / 2 + 19}
                            textAnchor="middle" fontSize={7}
                            fill="rgba(255,255,255,0.6)" fontFamily="sans-serif"
                          >
                            {powerPerServer} kW
                          </text>
                        </g>
                      );
                      acc.y += srv.u * UNIT_PX;
                      return acc;
                    },
                    { els: [], y: 0 }
                  ).els}

                  {/* Empty space indicator */}
                  {rack.usedU < RACK_UNITS && (
                    <text
                      x={RACK_WIDTH / 2} y={rack.usedU * UNIT_PX + 20}
                      textAnchor="middle" fontSize={8}
                      fill="var(--text-muted)" fontFamily="sans-serif"
                    >
                      {RACK_UNITS - rack.usedU}U free
                    </text>
                  )}
                </svg>
              </div>

              {/* Per-rack stats */}
              <div className="text-center space-y-0.5">
                <p className="text-xs text-[var(--text-secondary)]">
                  {rack.servers.length} server{rack.servers.length !== 1 ? "s" : ""}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {(rack.servers.length * parseFloat(powerPerServer)).toFixed(1)} kW
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center gap-4 text-xs text-[var(--text-secondary)]">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-[var(--accent-primary)] opacity-85" />
            <span>{server?.model ?? "GPU server"}</span>
          </div>
          <span>{serverU}U per server</span>
          <span>{input.gpu.vram_gb * (count > 0 ? Math.ceil(capacity.totalGpus / count) : 0)} GB VRAM/server</span>
        </div>
      </div>
    </div>
  );
}
