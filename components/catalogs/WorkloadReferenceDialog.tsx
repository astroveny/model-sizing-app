"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import type { WorkloadReferenceRow } from "@/lib/catalogs/index";

interface WorkloadReferenceDialogProps {
  open: boolean;
  ref_: WorkloadReferenceRow | null;
  onClose: () => void;
  onSaved: () => void;
}

const EMPTY_FORM = { label: "", url: "", description: "", sortOrder: "" };

function rowToForm(r: WorkloadReferenceRow) {
  return {
    label: r.label ?? "",
    url: r.url ?? "",
    description: r.description ?? "",
    sortOrder: r.sortOrder != null ? String(r.sortOrder) : "",
  };
}

export function WorkloadReferenceDialog({ open, ref_, onClose, onSaved }: WorkloadReferenceDialogProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(ref_ ? rowToForm(ref_) : EMPTY_FORM);
      setError(null);
    }
  }, [open, ref_]);

  function field(name: keyof typeof EMPTY_FORM) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.label.trim()) { setError("Label is required."); return; }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        label: form.label.trim(),
        url: form.url.trim() || null,
        description: form.description.trim() || null,
        sortOrder: form.sortOrder ? Number(form.sortOrder) : null,
      };
      const url = ref_ ? `/api/admin/catalogs/workload-references/${ref_.id}` : "/api/admin/catalogs/workload-references";
      const method = ref_ ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Unknown error" })) as { error: string };
        throw new Error(body.error);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{ref_ ? "Edit Workload Reference" : "Add Workload Reference"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Label <span className="text-red-500">*</span></Label>
            <Input value={form.label} onChange={field("label")} placeholder="e.g. NVIDIA LLM Sizing Guide" />
          </div>
          <div className="space-y-1.5">
            <Label>URL</Label>
            <Input value={form.url} onChange={field("url")} placeholder="https://…" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input value={form.description} onChange={field("description")} placeholder="Brief description of this reference" />
          </div>
          <div className="space-y-1.5">
            <Label>Sort Order</Label>
            <Input type="number" value={form.sortOrder} onChange={field("sortOrder")} placeholder="e.g. 10" />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : ref_ ? "Save Changes" : "Add Reference"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
