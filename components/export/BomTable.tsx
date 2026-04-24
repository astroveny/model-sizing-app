"use client";

import { RotateCcw } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BomItem } from "@/lib/store";
import type { BomExport } from "@/lib/export/bom-schema";
import gpusData from "@/data/gpus.json";
import serversData from "@/data/servers.json";

type GpuEntry    = { id: string; model: string; vendor: string; vram_gb: number; list_price_usd?: number; memory_bandwidth_gbps: number };
type ServerEntry = { id: string; vendor: string; model: string; supported_gpu_ids: string[]; max_gpus: number; rack_units: number; list_price_usd?: number };

const ALL_GPUS    = gpusData.gpus    as GpuEntry[];
const ALL_SERVERS = serversData.servers as ServerEntry[];

/** Stable key for a BoM line. Used as bomOverrides map key. */
export function bomItemKey(item: { category: string; name: string }): string {
  return `${item.category}:${item.name}`;
}

type BomExportItem = BomExport["items"][0];

interface EffectiveItem extends BomExportItem {
  key: string;
  overridden: boolean;
}

interface BomTableProps {
  bom: BomExport;
  bomOverrides: Record<string, Partial<BomItem>>;
  /** GPU id currently selected by the sizing engine — used to filter compatible swap servers */
  currentGpuId: string;
  onSetOverride: (key: string, patch: Partial<BomItem>) => void;
  onClearOverride: (key: string) => void;
}

export function BomTable({ bom, bomOverrides, currentGpuId, onSetOverride, onClearOverride }: BomTableProps) {
  const effectiveItems: EffectiveItem[] = bom.items.map((item) => {
    const key = bomItemKey(item);
    const patch = bomOverrides[key];
    if (patch && Object.keys(patch).length > 0) {
      const merged = { ...item, ...patch };
      if (patch.unitPriceUsd !== undefined && !patch.totalPriceUsd) {
        merged.totalPriceUsd = patch.unitPriceUsd * item.quantity;
      }
      return { ...merged, key, overridden: true };
    }
    return { ...item, key, overridden: false };
  });

  const totalCapex = effectiveItems.reduce((s, i) => s + (i.totalPriceUsd ?? 0), 0);

  function handlePriceChange(item: EffectiveItem, raw: string) {
    const val = parseFloat(raw.replace(/[^0-9.]/g, ""));
    if (!isNaN(val) && val >= 0) {
      onSetOverride(item.key, {
        unitPriceUsd: val,
        totalPriceUsd: val * item.quantity,
      });
    }
  }

  function handleServerSwap(item: EffectiveItem, serverId: string) {
    if (serverId === "__current__") {
      onClearOverride(item.key);
      return;
    }
    const s = ALL_SERVERS.find((sv) => sv.id === serverId);
    if (!s) return;
    const qty = item.quantity;
    onSetOverride(item.key, {
      name: s.model,
      vendor: s.vendor,
      unitPriceUsd: s.list_price_usd ?? 0,
      totalPriceUsd: (s.list_price_usd ?? 0) * qty,
      notes: `${s.rack_units}U, ${s.max_gpus} GPU slots`,
    });
  }

  function handleGpuSwap(item: EffectiveItem, gpuId: string) {
    if (gpuId === "__current__") {
      onClearOverride(item.key);
      return;
    }
    const g = ALL_GPUS.find((gp) => gp.id === gpuId);
    if (!g) return;
    const qty = item.quantity;
    onSetOverride(item.key, {
      name: g.model,
      vendor: g.vendor === "nvidia" ? "NVIDIA" : "AMD",
      unitPriceUsd: g.list_price_usd ?? 0,
      totalPriceUsd: (g.list_price_usd ?? 0) * qty,
      notes: `${g.vram_gb} GB VRAM, ${g.memory_bandwidth_gbps} GB/s`,
    });
  }

  const compatibleServers = ALL_SERVERS.filter((s) => s.supported_gpu_ids.includes(currentGpuId));

  return (
    <div className="overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border-default)] text-left text-[var(--text-secondary)]">
            <th className="pb-2 pr-3 font-medium">Item</th>
            <th className="pb-2 pr-3 font-medium">Category</th>
            <th className="pb-2 pr-3 font-medium">Swap</th>
            <th className="pb-2 pr-3 font-medium text-right">Qty</th>
            <th className="pb-2 pr-3 font-medium text-right">Unit Price</th>
            <th className="pb-2 font-medium text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {effectiveItems.map((item) => (
            <tr
              key={item.key}
              className={[
                "border-b border-[var(--border-muted)] last:border-0",
                item.overridden ? "bg-[var(--accent-primary)]/5" : "",
              ].join(" ")}
            >
              {/* Item name + override indicator */}
              <td className="py-2 pr-3">
                <span className={item.overridden ? "text-[var(--accent-primary)] font-medium" : ""}>
                  {item.name}
                </span>
                {item.overridden && (
                  <span className="ml-1.5 text-[10px] font-medium uppercase tracking-wide text-[var(--accent-primary)] opacity-70">
                    overridden
                  </span>
                )}
              </td>

              {/* Category */}
              <td className="py-2 pr-3 text-[var(--text-secondary)] capitalize">{item.category}</td>

              {/* Swap dropdown — only for gpu and server rows */}
              <td className="py-2 pr-3">
                {item.category === "server" && (
                  <Select
                    value={item.overridden ? (ALL_SERVERS.find((s) => s.model === item.name)?.id ?? "__current__") : "__current__"}
                    onValueChange={(v) => v !== null && handleServerSwap(item, v)}
                  >
                    <SelectTrigger className="h-7 text-xs w-40">
                      <SelectValue placeholder="Swap…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__current__">
                        {item.overridden ? "Reset to default" : "Keep current"}
                      </SelectItem>
                      {compatibleServers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.vendor} {s.model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {item.category === "gpu" && (
                  <Select
                    value={item.overridden ? (ALL_GPUS.find((g) => g.model === item.name)?.id ?? "__current__") : "__current__"}
                    onValueChange={(v) => v !== null && handleGpuSwap(item, v)}
                  >
                    <SelectTrigger className="h-7 text-xs w-40">
                      <SelectValue placeholder="Swap…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__current__">
                        {item.overridden ? "Reset to default" : "Keep current"}
                      </SelectItem>
                      {ALL_GPUS.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.vendor === "nvidia" ? "NVIDIA" : "AMD"} {g.model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </td>

              {/* Qty */}
              <td className="py-2 pr-3 text-right">{item.quantity}</td>

              {/* Unit price — editable */}
              <td className="py-2 pr-3 text-right">
                <div className="flex items-center justify-end gap-1">
                  {item.overridden && (
                    <button
                      onClick={() => onClearOverride(item.key)}
                      title="Reset to catalog"
                      className="text-[var(--text-secondary)] hover:text-[var(--danger)] transition-colors"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </button>
                  )}
                  <input
                    type="text"
                    defaultValue={item.unitPriceUsd?.toLocaleString() ?? ""}
                    placeholder="—"
                    onBlur={(e) => handlePriceChange(item, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    }}
                    className={[
                      "w-24 text-right bg-transparent border rounded px-1.5 py-0.5 text-sm",
                      "focus:outline-none focus:border-[var(--accent-primary)]",
                      item.overridden
                        ? "border-[var(--accent-primary)] text-[var(--accent-primary)]"
                        : "border-[var(--border-muted)] hover:border-[var(--border-default)]",
                    ].join(" ")}
                  />
                </div>
              </td>

              {/* Total */}
              <td className="py-2 text-right font-medium">
                {item.totalPriceUsd ? `$${item.totalPriceUsd.toLocaleString()}` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={5} className="pt-3 font-semibold text-right pr-3">
              Total CapEx (Est.)
            </td>
            <td className="pt-3 font-semibold text-right">
              {totalCapex > 0 ? `$${totalCapex.toLocaleString()}` : "—"}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
