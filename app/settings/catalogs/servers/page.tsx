"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Search, RotateCcw, Pencil, Ban, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OriginBadge } from "@/components/catalogs/OriginBadge";
import { ServerDialog } from "@/components/catalogs/ServerDialog";
import { toast } from "sonner";
import type { ServerRow, GpuRow } from "@/lib/catalogs/index";

type RowData = { servers: ServerRow[]; gpus: GpuRow[] };

function gpuConfigSummary(configs: ServerRow["gpuConfigs"], gpus: GpuRow[]): string {
  return configs
    .filter((c) => c.isDefault || configs.length === 1)
    .map((c) => {
      const gpu = gpus.find((g) => g.id === c.gpuId);
      const name = gpu?.model ?? c.gpuId;
      return `${c.gpuCount}×${name}`;
    })
    .join(", ") || configs.map((c) => `${c.gpuCount}×${c.gpuId}`).join(", ");
}

export default function ServersAdminPage() {
  const [data, setData] = useState<RowData | null>(null);
  const [showDeprecated, setShowDeprecated] = useState(false);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editServer, setEditServer] = useState<ServerRow | null>(null);

  const [catalogExtractAssigned, setCatalogExtractAssigned] = useState(false);

  const refresh = useCallback(async () => {
    const [serversRes, routingRes] = await Promise.all([
      fetch("/api/admin/catalogs/servers"),
      fetch("/api/settings/routing"),
    ]);
    if (serversRes.ok) setData(await serversRes.json() as RowData);
    if (routingRes.ok) {
      const routing = await routingRes.json() as Record<string, string | null>;
      setCatalogExtractAssigned(!!routing["catalog-extract"]);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const rows = useMemo(() => {
    if (!data) return [];
    return data.servers.filter((s) => {
      if (!showDeprecated && s.isDeprecated) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (s.vendor ?? "").toLowerCase().includes(q) || (s.model ?? "").toLowerCase().includes(q);
    });
  }, [data, showDeprecated, search]);

  async function handleDeprecate(s: ServerRow) {
    const res = await fetch(`/api/admin/catalogs/servers/${s.id}/deprecate`, { method: "POST" });
    if (res.ok) { toast.success(`${s.model ?? s.id} deprecated`); refresh(); }
    else toast.error("Failed to deprecate server");
  }

  async function handleDelete(s: ServerRow) {
    if (!confirm(`Delete "${s.model ?? s.id}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/catalogs/servers/${s.id}`, { method: "DELETE" });
    if (res.ok) { toast.success(`${s.model ?? s.id} deleted`); refresh(); }
    else {
      const body = await res.json().catch(() => ({ error: "Failed" })) as { error: string };
      toast.error(body.error);
    }
  }

  async function handleReset(s: ServerRow) {
    if (!confirm(`Reset "${s.model ?? s.id}" to seed values?`)) return;
    const res = await fetch(`/api/admin/catalogs/servers/${s.id}/reset`, { method: "POST" });
    if (res.ok) { toast.success("Reset to seed values"); refresh(); }
    else toast.error("Failed to reset");
  }

  function openAdd() { setEditServer(null); setDialogOpen(true); }
  function openEdit(s: ServerRow) { setEditServer(s); setDialogOpen(true); }

  const gpus = data?.gpus ?? [];

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Servers</h2>
          <p className="text-[var(--text-secondary)] text-sm mt-0.5">
            {data ? `${rows.length} of ${data.servers.filter((s) => !s.isDeprecated).length} active` : "Loading…"}
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" /> Add Server
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[var(--text-secondary)]" />
          <Input
            className="pl-8"
            placeholder="Search vendor or model…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={() => setShowDeprecated((v) => !v)}
          className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${showDeprecated ? "border-[var(--accent-primary)] text-[var(--accent-primary)]" : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)]"}`}
        >
          {showDeprecated ? "Hide deprecated" : "Show deprecated"}
        </button>
      </div>

      {!data ? (
        <p className="text-sm text-[var(--text-secondary)]">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">No servers match your filters.</p>
      ) : (
        <div className="rounded-lg border border-[var(--border-default)] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-subtle)] border-b border-[var(--border-default)]">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-[var(--text-secondary)]">Vendor</th>
                <th className="text-left px-4 py-2.5 font-medium text-[var(--text-secondary)]">Model</th>
                <th className="text-left px-4 py-2.5 font-medium text-[var(--text-secondary)]">GPU Configs</th>
                <th className="text-left px-4 py-2.5 font-medium text-[var(--text-secondary)]">TDP</th>
                <th className="text-left px-4 py-2.5 font-medium text-[var(--text-secondary)]">Rack U</th>
                <th className="text-left px-4 py-2.5 font-medium text-[var(--text-secondary)]">Origin</th>
                <th className="text-left px-4 py-2.5 font-medium text-[var(--text-secondary)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-muted)]">
              {rows.map((s) => (
                <tr key={s.id} className={`hover:bg-[var(--bg-subtle)] transition-colors ${s.isDeprecated ? "opacity-50" : ""}`}>
                  <td className="px-4 py-2.5 text-[var(--text-secondary)]">{s.vendor ?? "—"}</td>
                  <td className="px-4 py-2.5 font-medium">{s.model ?? s.id}</td>
                  <td className="px-4 py-2.5 text-xs text-[var(--text-secondary)] font-mono">
                    {gpuConfigSummary(s.gpuConfigs, gpus)}
                  </td>
                  <td className="px-4 py-2.5 text-[var(--text-secondary)]">{s.tdpWatts != null ? `${s.tdpWatts} W` : "—"}</td>
                  <td className="px-4 py-2.5 text-[var(--text-secondary)]">{s.rackUnits ?? "—"}</td>
                  <td className="px-4 py-2.5"><OriginBadge origin={s.origin} /></td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(s)}
                        title="Edit"
                        className="p-1 rounded hover:bg-[var(--border-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {s.origin === "seed-edited" && (
                        <button
                          onClick={() => handleReset(s)}
                          title="Reset to seed"
                          className="p-1 rounded hover:bg-[var(--border-muted)] text-[var(--text-secondary)] hover:text-yellow-600 transition-colors"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {!s.isDeprecated && (
                        <button
                          onClick={() => handleDeprecate(s)}
                          title="Deprecate"
                          className="p-1 rounded hover:bg-[var(--border-muted)] text-[var(--text-secondary)] hover:text-orange-500 transition-colors"
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {s.origin === "user" && (
                        <button
                          onClick={() => handleDelete(s)}
                          title="Delete"
                          className="p-1 rounded hover:bg-[var(--border-muted)] text-[var(--text-secondary)] hover:text-red-500 transition-colors"
                        >
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

      <ServerDialog
        open={dialogOpen}
        server={editServer}
        gpus={gpus}
        catalogExtractAssigned={catalogExtractAssigned}
        onClose={() => setDialogOpen(false)}
        onSaved={() => { refresh(); toast.success(editServer ? "Server updated" : "Server added"); }}
      />
    </div>
  );
}
