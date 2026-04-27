"use client";

import Link from "next/link";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Search, RotateCcw, Pencil, Ban, Trash2, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OriginBadge } from "@/components/catalogs/OriginBadge";
import { GpuDialog } from "@/components/catalogs/GpuDialog";
import { toast } from "sonner";
import type { GpuRow } from "@/lib/catalogs/index";

export default function GpusAdminPage() {
  const [gpus, setGpus] = useState<GpuRow[]>([]);
  const [showDeprecated, setShowDeprecated] = useState(false);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editGpu, setEditGpu] = useState<GpuRow | null>(null);
  const [catalogExtractAssigned, setCatalogExtractAssigned] = useState(false);

  const refresh = useCallback(async () => {
    const [gpusRes, routingRes] = await Promise.all([
      fetch("/api/admin/catalogs/gpus"),
      fetch("/api/settings/routing"),
    ]);
    if (gpusRes.ok) {
      const data = await gpusRes.json() as { gpus: GpuRow[] };
      setGpus(data.gpus);
    }
    if (routingRes.ok) {
      const routing = await routingRes.json() as Record<string, string | null>;
      setCatalogExtractAssigned(!!routing["catalog-extract"]);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const rows = useMemo(() => {
    return gpus.filter((g) => {
      if (!showDeprecated && g.isDeprecated) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (g.vendor ?? "").toLowerCase().includes(q)
        || (g.model ?? "").toLowerCase().includes(q)
        || (g.family ?? "").toLowerCase().includes(q);
    });
  }, [gpus, showDeprecated, search]);

  async function handleDeprecate(g: GpuRow) {
    const res = await fetch(`/api/admin/catalogs/gpus/${g.id}/deprecate`, { method: "POST" });
    if (res.ok) { toast.success(`${g.model ?? g.id} deprecated`); refresh(); }
    else toast.error("Failed to deprecate GPU");
  }

  async function handleDelete(g: GpuRow) {
    if (!confirm(`Delete "${g.model ?? g.id}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/catalogs/gpus/${g.id}`, { method: "DELETE" });
    if (res.ok) { toast.success(`${g.model ?? g.id} deleted`); refresh(); }
    else {
      const body = await res.json().catch(() => ({ error: "Failed" })) as { error: string };
      toast.error(body.error);
    }
  }

  async function handleReset(g: GpuRow) {
    if (!confirm(`Reset "${g.model ?? g.id}" to seed values?`)) return;
    const res = await fetch(`/api/admin/catalogs/gpus/${g.id}/reset`, { method: "POST" });
    if (res.ok) { toast.success("Reset to seed values"); refresh(); }
    else toast.error("Failed to reset");
  }

  function openAdd() { setEditGpu(null); setDialogOpen(true); }
  function openEdit(g: GpuRow) { setEditGpu(g); setDialogOpen(true); }

  const activeCount = gpus.filter((g) => !g.isDeprecated).length;

  return (
    <div className="space-y-5 max-w-6xl">
      <Link href="/settings/catalogs" className="inline-flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
        <ChevronLeft className="h-4 w-4" /> Catalogs
      </Link>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">GPUs</h2>
          <p className="text-[var(--text-secondary)] text-sm mt-0.5">
            {gpus.length ? `${rows.length} of ${activeCount} active` : "Loading…"}
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" /> Add GPU
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[var(--text-secondary)]" />
          <Input className="pl-8" placeholder="Search vendor, family, or model…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button
          onClick={() => setShowDeprecated((v) => !v)}
          className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${showDeprecated ? "border-[var(--accent-primary)] text-[var(--accent-primary)]" : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)]"}`}
        >
          {showDeprecated ? "Hide deprecated" : "Show deprecated"}
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">No GPUs match your filters.</p>
      ) : (
        <div className="rounded-lg border border-[var(--border-default)] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-subtle)] border-b border-[var(--border-default)]">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-[var(--text-secondary)]">Vendor</th>
                <th className="text-left px-4 py-2.5 font-medium text-[var(--text-secondary)]">Model</th>
                <th className="text-right px-4 py-2.5 font-medium text-[var(--text-secondary)]">VRAM</th>
                <th className="text-right px-4 py-2.5 font-medium text-[var(--text-secondary)]">BW GB/s</th>
                <th className="text-right px-4 py-2.5 font-medium text-[var(--text-secondary)]">FP16 T</th>
                <th className="text-right px-4 py-2.5 font-medium text-[var(--text-secondary)]">TDP W</th>
                <th className="text-left px-4 py-2.5 font-medium text-[var(--text-secondary)]">Origin</th>
                <th className="text-left px-4 py-2.5 font-medium text-[var(--text-secondary)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-muted)]">
              {rows.map((g) => (
                <tr key={g.id} className={`hover:bg-[var(--bg-subtle)] transition-colors ${g.isDeprecated ? "opacity-50" : ""}`}>
                  <td className="px-4 py-2.5 text-[var(--text-secondary)]">{g.vendor ?? "—"}</td>
                  <td className="px-4 py-2.5 font-medium">
                    {g.model ?? g.id}
                    {g.family && <span className="ml-1.5 text-xs text-[var(--text-secondary)]">{g.family}</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{g.vramGb != null ? `${g.vramGb} GB` : "—"}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{g.memoryBandwidthGbps ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{g.fp16Tflops ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{g.tdpWatts ?? "—"}</td>
                  <td className="px-4 py-2.5"><OriginBadge origin={g.origin} /></td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(g)} title="Edit" className="p-1 rounded hover:bg-[var(--border-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {g.origin === "seed-edited" && (
                        <button onClick={() => handleReset(g)} title="Reset to seed" className="p-1 rounded hover:bg-[var(--border-muted)] text-[var(--text-secondary)] hover:text-yellow-600 transition-colors">
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {!g.isDeprecated && (
                        <button onClick={() => handleDeprecate(g)} title="Deprecate" className="p-1 rounded hover:bg-[var(--border-muted)] text-[var(--text-secondary)] hover:text-orange-500 transition-colors">
                          <Ban className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {g.origin === "user" && (
                        <button onClick={() => handleDelete(g)} title="Delete" className="p-1 rounded hover:bg-[var(--border-muted)] text-[var(--text-secondary)] hover:text-red-500 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <GpuDialog
        open={dialogOpen}
        gpu={editGpu}
        catalogExtractAssigned={catalogExtractAssigned}
        onClose={() => setDialogOpen(false)}
        onSaved={() => { refresh(); toast.success(editGpu ? "GPU updated" : "GPU added"); }}
      />
    </div>
  );
}
