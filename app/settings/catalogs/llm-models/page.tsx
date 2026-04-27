"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Search, RotateCcw, Pencil, Ban, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OriginBadge } from "@/components/catalogs/OriginBadge";
import { LlmModelDialog } from "@/components/catalogs/LlmModelDialog";
import { toast } from "sonner";
import type { LlmModelRow } from "@/lib/catalogs/index";

export default function LlmModelsAdminPage() {
  const [models, setModels] = useState<LlmModelRow[]>([]);
  const [showDeprecated, setShowDeprecated] = useState(false);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editModel, setEditModel] = useState<LlmModelRow | null>(null);
  const [catalogExtractAssigned, setCatalogExtractAssigned] = useState(false);

  const refresh = useCallback(async () => {
    const [modelsRes, routingRes] = await Promise.all([
      fetch("/api/admin/catalogs/llm-models"),
      fetch("/api/settings/routing"),
    ]);
    if (modelsRes.ok) {
      const data = await modelsRes.json() as { models: LlmModelRow[] };
      setModels(data.models);
    }
    if (routingRes.ok) {
      const routing = await routingRes.json() as Record<string, string | null>;
      setCatalogExtractAssigned(!!routing["catalog-extract"]);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const rows = useMemo(() => {
    return models.filter((m) => {
      if (!showDeprecated && m.isDeprecated) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (m.family ?? "").toLowerCase().includes(q) || (m.name ?? "").toLowerCase().includes(q);
    });
  }, [models, showDeprecated, search]);

  async function handleDeprecate(m: LlmModelRow) {
    const res = await fetch(`/api/admin/catalogs/llm-models/${m.id}/deprecate`, { method: "POST" });
    if (res.ok) { toast.success(`${m.name ?? m.id} deprecated`); refresh(); }
    else toast.error("Failed to deprecate model");
  }

  async function handleDelete(m: LlmModelRow) {
    if (!confirm(`Delete "${m.name ?? m.id}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/catalogs/llm-models/${m.id}`, { method: "DELETE" });
    if (res.ok) { toast.success(`${m.name ?? m.id} deleted`); refresh(); }
    else {
      const body = await res.json().catch(() => ({ error: "Failed" })) as { error: string };
      toast.error(body.error);
    }
  }

  async function handleReset(m: LlmModelRow) {
    if (!confirm(`Reset "${m.name ?? m.id}" to seed values?`)) return;
    const res = await fetch(`/api/admin/catalogs/llm-models/${m.id}/reset`, { method: "POST" });
    if (res.ok) { toast.success("Reset to seed values"); refresh(); }
    else toast.error("Failed to reset");
  }

  function openAdd() { setEditModel(null); setDialogOpen(true); }
  function openEdit(m: LlmModelRow) { setEditModel(m); setDialogOpen(true); }

  const activeCount = models.filter((m) => !m.isDeprecated).length;

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">LLM Models</h2>
          <p className="text-[var(--text-secondary)] text-sm mt-0.5">
            {models.length ? `${rows.length} of ${activeCount} active` : "Loading…"}
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" /> Add Model
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[var(--text-secondary)]" />
          <Input className="pl-8" placeholder="Search family or name…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button
          onClick={() => setShowDeprecated((v) => !v)}
          className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${showDeprecated ? "border-[var(--accent-primary)] text-[var(--accent-primary)]" : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)]"}`}
        >
          {showDeprecated ? "Hide deprecated" : "Show deprecated"}
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">No models match your filters.</p>
      ) : (
        <div className="rounded-lg border border-[var(--border-default)] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-subtle)] border-b border-[var(--border-default)]">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-[var(--text-secondary)]">Family</th>
                <th className="text-left px-4 py-2.5 font-medium text-[var(--text-secondary)]">Name</th>
                <th className="text-right px-4 py-2.5 font-medium text-[var(--text-secondary)]">Params B</th>
                <th className="text-left px-4 py-2.5 font-medium text-[var(--text-secondary)]">Arch</th>
                <th className="text-right px-4 py-2.5 font-medium text-[var(--text-secondary)]">Layers</th>
                <th className="text-right px-4 py-2.5 font-medium text-[var(--text-secondary)]">KV Heads</th>
                <th className="text-left px-4 py-2.5 font-medium text-[var(--text-secondary)]">Origin</th>
                <th className="text-left px-4 py-2.5 font-medium text-[var(--text-secondary)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-muted)]">
              {rows.map((m) => (
                <tr key={m.id} className={`hover:bg-[var(--bg-subtle)] transition-colors ${m.isDeprecated ? "opacity-50" : ""}`}>
                  <td className="px-4 py-2.5 text-[var(--text-secondary)]">{m.family ?? "—"}</td>
                  <td className="px-4 py-2.5 font-medium">{m.name ?? m.id}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {m.paramsB != null ? `${m.paramsB}B` : "—"}
                    {m.activeParamsB != null && <span className="text-xs text-[var(--text-secondary)] ml-1">({m.activeParamsB}B active)</span>}
                  </td>
                  <td className="px-4 py-2.5">{m.architecture ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{m.layers ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{m.numKvHeads ?? "—"}</td>
                  <td className="px-4 py-2.5"><OriginBadge origin={m.origin} /></td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(m)} title="Edit" className="p-1 rounded hover:bg-[var(--border-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {m.origin === "seed-edited" && (
                        <button onClick={() => handleReset(m)} title="Reset to seed" className="p-1 rounded hover:bg-[var(--border-muted)] text-[var(--text-secondary)] hover:text-yellow-600 transition-colors">
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {!m.isDeprecated && (
                        <button onClick={() => handleDeprecate(m)} title="Deprecate" className="p-1 rounded hover:bg-[var(--border-muted)] text-[var(--text-secondary)] hover:text-orange-500 transition-colors">
                          <Ban className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {m.origin === "user" && (
                        <button onClick={() => handleDelete(m)} title="Delete" className="p-1 rounded hover:bg-[var(--border-muted)] text-[var(--text-secondary)] hover:text-red-500 transition-colors">
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

      <LlmModelDialog
        open={dialogOpen}
        model={editModel}
        catalogExtractAssigned={catalogExtractAssigned}
        onClose={() => setDialogOpen(false)}
        onSaved={() => { refresh(); toast.success(editModel ? "Model updated" : "Model added"); }}
      />
    </div>
  );
}
