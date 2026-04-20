"use client";

import type { BuildDerivedResult } from "@/lib/hooks/useBuildDerived";
import { getBestServer } from "@/lib/sizing/catalog";

type Props = { result: BuildDerivedResult };

const UNIT_PX = 14;      // px per rack unit
const RACK_WIDTH = 140;  // px
const RACK_UNITS = 42;   // standard rack height

export function RackLayout({ result }: Props) {
  const { capacity, input } = result;
  const server = getBestServer(input.gpu.id);
  const serverU = server?.rack_units ?? 4;
  const count = capacity.serverCount;

  // Rack count needed
  const unitsPerRack = RACK_UNITS;
  const racksNeeded = Math.ceil((count * serverU) / unitsPerRack);
  const racks = Array.from({ length: racksNeeded }, (_, ri) => {
    const servers: { label: string; u: number }[] = [];
    let remaining = unitsPerRack;
    let si = ri * Math.floor(unitsPerRack / serverU);
    while (remaining >= serverU && si < count) {
      servers.push({ label: `Server ${si + 1}`, u: serverU });
      remaining -= serverU;
      si++;
    }
    return servers;
  });

  return (
    <div className="rounded-lg border">
      <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Rack Layout</h3>
        <span className="text-xs text-muted-foreground">
          {count} server{count !== 1 ? "s" : ""} · {racksNeeded} rack{racksNeeded !== 1 ? "s" : ""} · {server?.rack_units ?? "?"}U each
        </span>
      </div>
      <div className="p-4 overflow-x-auto">
        <div className="flex gap-6">
          {racks.map((rackServers, ri) => (
            <div key={ri} className="flex flex-col items-center gap-1">
              <span className="text-xs text-muted-foreground mb-1">Rack {ri + 1}</span>
              <svg
                width={RACK_WIDTH}
                height={RACK_UNITS * UNIT_PX + 2}
                className="border rounded"
                aria-label={`Rack ${ri + 1}`}
              >
                {/* Rack background */}
                <rect x={0} y={0} width={RACK_WIDTH} height={RACK_UNITS * UNIT_PX} fill="var(--muted)" />

                {/* Unit markers */}
                {Array.from({ length: RACK_UNITS }, (_, u) => (
                  <line
                    key={u}
                    x1={0} y1={u * UNIT_PX}
                    x2={RACK_WIDTH} y2={u * UNIT_PX}
                    stroke="var(--border)" strokeWidth={0.5} opacity={0.5}
                  />
                ))}

                {/* Servers */}
                {rackServers.reduce<{ el: React.ReactNode[]; y: number }>(
                  (acc, srv, si) => {
                    const h = srv.u * UNIT_PX - 2;
                    acc.el.push(
                      <g key={si}>
                        <rect
                          x={4} y={acc.y + 1}
                          width={RACK_WIDTH - 8} height={h}
                          rx={2}
                          fill="#3b82f6" fillOpacity={0.8}
                          stroke="#1d4ed8" strokeWidth={0.5}
                        />
                        <text
                          x={RACK_WIDTH / 2} y={acc.y + h / 2 + 5}
                          textAnchor="middle"
                          fontSize={9} fill="white" fontFamily="monospace"
                        >
                          {srv.label}
                        </text>
                        <text
                          x={RACK_WIDTH / 2} y={acc.y + h / 2 + 16}
                          textAnchor="middle"
                          fontSize={7.5} fill="rgba(255,255,255,0.7)" fontFamily="monospace"
                        >
                          {input.gpu.model}
                        </text>
                      </g>
                    );
                    acc.y += srv.u * UNIT_PX;
                    return acc;
                  },
                  { el: [], y: 0 }
                ).el}
              </svg>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {count} × {server?.model ?? "server"} · {serverU}U each · {capacity.powerKw.toFixed(1)} kW total
        </p>
      </div>
    </div>
  );
}
