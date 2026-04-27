"use client";

import { useState, useEffect } from "react";
import { Link2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { LlmModelRow } from "@/lib/catalogs/index";

type Tab = "manual" | "extract";

interface LlmModelDialogProps {
  open: boolean;
  model: LlmModelRow | null;
  catalogExtractAssigned: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const ARCHITECTURES = ["dense", "moe"] as const;

const EMPTY_FORM = {
  family: "", name: "", paramsB: "", architecture: "dense", activeParamsB: "",
  layers: "", hiddenSize: "", numKvHeads: "", headDim: "", contextLengthMax: "",
  quantizationsSupported: "", releaseDate: "", huggingfaceId: "", notes: "",
};

function modelToForm(m: LlmModelRow) {
  return {
    family: m.family ?? "",
    name: m.name ?? "",
    paramsB: m.paramsB != null ? String(m.paramsB) : "",
    architecture: m.architecture ?? "dense",
    activeParamsB: m.activeParamsB != null ? String(m.activeParamsB) : "",
    layers: m.layers != null ? String(m.layers) : "",
    hiddenSize: m.hiddenSize != null ? String(m.hiddenSize) : "",
    numKvHeads: m.numKvHeads != null ? String(m.numKvHeads) : "",
    headDim: m.headDim != null ? String(m.headDim) : "",
    contextLengthMax: m.contextLengthMax != null ? String(m.contextLengthMax) : "",
    quantizationsSupported: (m.quantizationsSupported ?? []).join(", "),
    releaseDate: m.releaseDate ?? "",
    huggingfaceId: m.huggingfaceId ?? "",
    notes: m.notes ?? "",
  };
}

export function LlmModelDialog({ open, model, catalogExtractAssigned, onClose, onSaved }: LlmModelDialogProps) {
  const [tab, setTab] = useState<Tab>("manual");
  const [extractUrl, setExtractUrl] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(model ? modelToForm(model) : EMPTY_FORM);
      setError(null);
      setExtractError(null);
      setExtractUrl("");
      setTab("manual");
    }
  }, [open, model]);

  function field(name: keyof typeof EMPTY_FORM) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [name]: e.target.value }));
  }

  async function handleExtract() {
    if (!extractUrl.trim()) return;
    setExtracting(true);
    setExtractError(null);
    try {
      const res = await fetch("/api/admin/catalogs/llm-models/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: extractUrl.trim() }),
      });
      const body = await res.json() as { extracted?: Record<string, unknown>; error?: string };
      if (!res.ok) throw new Error(body.error ?? "Extraction failed");
      const ex = body.extracted ?? {};
      setForm((f) => ({
        ...f,
        family: String(ex.family ?? f.family),
        name: String(ex.name ?? f.name),
        paramsB: ex.params_b != null ? String(ex.params_b) : f.paramsB,
        architecture: String(ex.architecture ?? f.architecture),
        activeParamsB: ex.active_params_b != null ? String(ex.active_params_b) : f.activeParamsB,
        layers: ex.layers != null ? String(ex.layers) : f.layers,
        hiddenSize: ex.hidden_size != null ? String(ex.hidden_size) : f.hiddenSize,
        numKvHeads: ex.num_kv_heads != null ? String(ex.num_kv_heads) : f.numKvHeads,
        headDim: ex.head_dim != null ? String(ex.head_dim) : f.headDim,
        contextLengthMax: ex.context_length_max != null ? String(ex.context_length_max) : f.contextLengthMax,
        quantizationsSupported: Array.isArray(ex.quantizations_supported) ? (ex.quantizations_supported as string[]).join(", ") : f.quantizationsSupported,
        releaseDate: String(ex.release_date ?? f.releaseDate),
        huggingfaceId: String(ex.huggingface_id ?? f.huggingfaceId),
        notes: String(ex.notes ?? f.notes),
      }));
      setTab("manual");
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : String(err));
    } finally {
      setExtracting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Name is required."); return; }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        family: form.family.trim() || null,
        name: form.name.trim(),
        paramsB: form.paramsB ? Number(form.paramsB) : null,
        architecture: form.architecture || null,
        activeParamsB: form.activeParamsB ? Number(form.activeParamsB) : null,
        layers: form.layers ? Number(form.layers) : null,
        hiddenSize: form.hiddenSize ? Number(form.hiddenSize) : null,
        numKvHeads: form.numKvHeads ? Number(form.numKvHeads) : null,
        headDim: form.headDim ? Number(form.headDim) : null,
        contextLengthMax: form.contextLengthMax ? Number(form.contextLengthMax) : null,
        quantizationsSupported: form.quantizationsSupported ? form.quantizationsSupported.split(",").map((s) => s.trim()).filter(Boolean) : [],
        releaseDate: form.releaseDate.trim() || null,
        huggingfaceId: form.huggingfaceId.trim() || null,
        notes: form.notes.trim() || null,
      };
      const url = model ? `/api/admin/catalogs/llm-models/${model.id}` : "/api/admin/catalogs/llm-models";
      const method = model ? "PATCH" : "POST";
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{model ? "Edit LLM Model" : "Add LLM Model"}</DialogTitle>
        </DialogHeader>

        <div className="flex rounded-md border border-[var(--border-default)] overflow-hidden text-sm mb-1">
          <button type="button" onClick={() => setTab("manual")}
            className={`flex-1 px-3 py-1.5 transition-colors ${tab === "manual" ? "bg-[var(--accent-primary)] text-white" : "text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"}`}>
            Manual entry
          </button>
          <button type="button" onClick={() => { if (catalogExtractAssigned) setTab("extract"); }}
            disabled={!catalogExtractAssigned}
            title={!catalogExtractAssigned ? "Configure a model for 'Catalog Extraction' in Settings → LLM" : undefined}
            className={`flex-1 px-3 py-1.5 transition-colors flex items-center justify-center gap-1.5 ${tab === "extract" ? "bg-[var(--accent-primary)] text-white" : !catalogExtractAssigned ? "text-[var(--text-muted)] cursor-not-allowed opacity-50" : "text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"}`}>
            <Link2 className="h-3.5 w-3.5" />Extract from URL
          </button>
        </div>

        {tab === "extract" && (
          <div className="space-y-3 pb-2">
            <p className="text-xs text-[var(--text-secondary)]">Paste a Hugging Face model card URL or paper page. AI will pre-fill key specs.</p>
            <div className="flex gap-2">
              <Input value={extractUrl} onChange={(e) => setExtractUrl(e.target.value)} placeholder="https://huggingface.co/…" className="flex-1" />
              <Button type="button" onClick={handleExtract} disabled={extracting || !extractUrl.trim()}>
                {extracting ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Extracting…</> : "Extract"}
              </Button>
            </div>
            {extractError && <p className="text-sm text-red-500">{extractError}</p>}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Family</Label>
              <Input value={form.family} onChange={field("family")} placeholder="e.g. llama-3, mixtral" />
            </div>
            <div className="space-y-1.5">
              <Label>Name <span className="text-red-500">*</span></Label>
              <Input value={form.name} onChange={field("name")} placeholder="e.g. Llama 3.1 70B" />
            </div>
            <div className="space-y-1.5">
              <Label>Architecture</Label>
              <Select value={form.architecture} onValueChange={(v) => setForm((f) => ({ ...f, architecture: v ?? f.architecture }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ARCHITECTURES.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Params (B)</Label>
              <Input type="number" value={form.paramsB} onChange={field("paramsB")} placeholder="e.g. 70" />
            </div>
            <div className="space-y-1.5">
              <Label>Active Params (B) <span className="text-[var(--text-secondary)] text-xs">MoE only</span></Label>
              <Input type="number" value={form.activeParamsB} onChange={field("activeParamsB")} placeholder="e.g. 13" />
            </div>
            <div className="space-y-1.5">
              <Label>Layers</Label>
              <Input type="number" value={form.layers} onChange={field("layers")} placeholder="e.g. 80" />
            </div>
            <div className="space-y-1.5">
              <Label>Hidden Size</Label>
              <Input type="number" value={form.hiddenSize} onChange={field("hiddenSize")} placeholder="e.g. 8192" />
            </div>
            <div className="space-y-1.5">
              <Label>KV Heads</Label>
              <Input type="number" value={form.numKvHeads} onChange={field("numKvHeads")} placeholder="e.g. 8" />
            </div>
            <div className="space-y-1.5">
              <Label>Head Dim</Label>
              <Input type="number" value={form.headDim} onChange={field("headDim")} placeholder="e.g. 128" />
            </div>
            <div className="space-y-1.5">
              <Label>Max Context Length</Label>
              <Input type="number" value={form.contextLengthMax} onChange={field("contextLengthMax")} placeholder="e.g. 131072" />
            </div>
            <div className="space-y-1.5">
              <Label>Release Date</Label>
              <Input value={form.releaseDate} onChange={field("releaseDate")} placeholder="YYYY-MM-DD" />
            </div>
            <div className="space-y-1.5">
              <Label>Hugging Face ID</Label>
              <Input value={form.huggingfaceId} onChange={field("huggingfaceId")} placeholder="meta-llama/Llama-3-70B" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Quantizations Supported <span className="text-[var(--text-secondary)] text-xs">(comma-separated)</span></Label>
            <Input value={form.quantizationsSupported} onChange={field("quantizationsSupported")} placeholder="fp16, bf16, fp8, int8, int4" />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input value={form.notes} onChange={field("notes")} placeholder="Optional notes" />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : model ? "Save Changes" : "Add Model"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
