"use client";

import Link from "next/link";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Search, RotateCcw, Pencil, Ban, Trash2, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OriginBadge } from "@/components/catalogs/OriginBadge";
import { WorkloadReferenceDialog } from "@/components/catalogs/WorkloadReferenceDialog";
import { toast } from "sonner";
import type { WorkloadReferenceRow } from "@/lib/catalogs/index";

export default function WorkloadReferencesAdminPage() {
  const [refs, setRefs] = useState<WorkloadReferenceRow[]>([]);
  const [showDeprecated, setShowDeprecated] = useState(false);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRef, setEditRef] = useState<WorkloadReferenceRow | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/admin/catalogs/workload-references");
    if (res.ok) {
      const data = await res.json() as { refs: WorkloadReferenceRow[] };
      setRefs(data.refs);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const rows = useMemo(() => {
    return refs.filter((r) => {
      if (!showDeprecated && r.isDeprecated) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (r.label ?? "").toLowerCase().includes(q) || (r.description ?? "").toLowerCase().includes(q);
    });
  }, [refs, showDeprecated, search]);

  async function handleDeprecate(r: WorkloadReferenceRow) {
    const res = await fetch(`/api/admin/catalogs/workload-references/${r.id}/deprecate`, { method: "POST" });
    if (res.ok) { toast.success(`"${r.label ?? r.id}" deprecated`); refresh(); }
    else toast.error("Failed to deprecate");
  }

  async function handleDelete(r: WorkloadReferenceRow) {
    if (!confirm(`Delete "${r.label ?? r.id}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/catalogs/workload-references/${r.id}`, { method: "DELETE" });
    if (res.ok) { toast.success(`"${r.label ?? r.id}" deleted`); refresh(); }
    else {
      const body = await res.json().catch(() => ({ error: "Failed" })) as { error: string };
      toast.error(body.error);
    }
  }

  async function handleReset(r: WorkloadReferenceRow) {
    if (!confirm(`Reset "${r.label ?? r.id}" to seed values?`)) return;
    const res = await fetch(`/api/admin/catalogs/workload-references/${r.id}/reset`, { method: "POST" });
    if (res.ok) { toast.success("Reset to seed values"); refresh(); }
    else toast.error("Failed to reset");
  }

  function openAdd() { setEditRef(null); setDialogOpen(true); }
  function openEdit(r: WorkloadReferenceRow) { setEditRef(r); setDialogOpen(true); }

  const activeCount = refs.filter((r) => !r.isDeprecated).length;

  return (
    <div className="space-y-5 max-w-4xl">
      <Link href="/settings/catalogs" className="inline-flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
        <ChevronLeft className="h-4 w-4" /> Catalogs
      </Link>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Workload References</h2>
          <p className="text-[var(--text-secondary)] text-sm mt-0.5">
            {refs.length ? `${rows.length} of ${activeCount} active` : "Loading…"}
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" /> Add Reference
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[var(--text-secondary)]" />
          <Input className="pl-8" placeholder="Search label or description…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button
          onClick={() => setShowDeprecated((v) => !v)}
          className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${showDeprecated ? "border-[var(--accent-primary)] text-[var(--accent-primary)]" : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)]"}`}
        >
          {showDeprecated ? "Hide deprecated" : "Show deprecated"}
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">No references match your filters.</p>
      ) : (
        <div className="rounded-lg border border-[var(--border-default)] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-subtle)] border-b border-[var(--border-default)]">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-[var(--text-secondary)]">Label</th>
                <th className="text-left px-4 py-2.5 font-medium text-[var(--text-secondary)]">URL</th>
                <th className="text-left px-4 py-2.5 font-medium text-[var(--text-secondary)]">Description</th>
                <th className="text-right px-4 py-2.5 font-medium text-[var(--text-secondary)]">Sort</th>
                <th className="text-left px-4 py-2.5 font-medium text-[var(--text-secondary)]">Origin</th>
                <th className="text-left px-4 py-2.5 font-medium text-[var(--text-secondary)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-muted)]">
              {rows.map((r) => (
                <tr key={r.id} className={`hover:bg-[var(--bg-subtle)] transition-colors ${r.isDeprecated ? "opacity-50" : ""}`}>
                  <td className="px-4 py-2.5 font-medium">{r.label ?? "—"}</td>
                  <td className="px-4 py-2.5 max-w-[200px] truncate">
                    {r.url ? (
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-[var(--accent-primary)] hover:underline">
                        {r.url}
                      </a>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-[var(--text-secondary)] max-w-[240px] truncate">{r.description ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{r.sortOrder ?? "—"}</td>
                  <td className="px-4 py-2.5"><OriginBadge origin={r.origin} /></td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(r)} title="Edit" className="p-1 rounded hover:bg-[var(--border-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {r.origin === "seed-edited" && (
                        <button onClick={() => handleReset(r)} title="Reset to seed" className="p-1 rounded hover:bg-[var(--border-muted)] text-[var(--text-secondary)] hover:text-yellow-600 transition-colors">
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {!r.isDeprecated && (
                        <button onClick={() => handleDeprecate(r)} title="Deprecate" className="p-1 rounded hover:bg-[var(--border-muted)] text-[var(--text-secondary)] hover:text-orange-500 transition-colors">
                          <Ban className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {r.origin === "user" && (
                        <button onClick={() => handleDelete(r)} title="Delete" className="p-1 rounded hover:bg-[var(--border-muted)] text-[var(--text-secondary)] hover:text-red-500 transition-colors">
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

      <WorkloadReferenceDialog
        open={dialogOpen}
        ref_={editRef}
        onClose={() => setDialogOpen(false)}
        onSaved={() => { refresh(); toast.success(editRef ? "Reference updated" : "Reference added"); }}
      />
    </div>
  );
}
