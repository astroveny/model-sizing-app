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
import type { GpuRow } from "@/lib/catalogs/index";

type Tab = "manual" | "extract";

interface GpuDialogProps {
  open: boolean;
  gpu: GpuRow | null;
  catalogExtractAssigned: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const VENDORS = ["nvidia", "amd", "intel"] as const;
const AVAILABILITIES = ["available", "limited", "eol"] as const;
const INTRA_NODE_OPTIONS = ["nvlink-4", "nvlink-3", "infinity-fabric", "pcie-5", "pcie-4", "none"] as const;
const FORM_FACTORS = ["sxm5", "sxm4", "oam", "pcie"] as const;

const EMPTY_FORM = {
  vendor: "nvidia", family: "", model: "", vramGb: "", memoryType: "",
  memoryBandwidthGbps: "", fp16Tflops: "", bf16Tflops: "", fp8Tflops: "",
  int8Tops: "", int4Tops: "", tdpWatts: "", intraNode: "nvlink-4",
  intraNodeBandwidthGbps: "", formFactor: "sxm5", listPriceUsd: "",
  availability: "available", notes: "", supportedFeatures: "",
};

function gpuToForm(g: GpuRow) {
  const ic = (g.interconnect ?? {}) as Record<string, unknown>;
  return {
    vendor: g.vendor ?? "nvidia",
    family: g.family ?? "",
    model: g.model ?? "",
    vramGb: g.vramGb != null ? String(g.vramGb) : "",
    memoryType: g.memoryType ?? "",
    memoryBandwidthGbps: g.memoryBandwidthGbps != null ? String(g.memoryBandwidthGbps) : "",
    fp16Tflops: g.fp16Tflops != null ? String(g.fp16Tflops) : "",
    bf16Tflops: g.bf16Tflops != null ? String(g.bf16Tflops) : "",
    fp8Tflops: g.fp8Tflops != null ? String(g.fp8Tflops) : "",
    int8Tops: g.int8Tops != null ? String(g.int8Tops) : "",
    int4Tops: g.int4Tops != null ? String(g.int4Tops) : "",
    tdpWatts: g.tdpWatts != null ? String(g.tdpWatts) : "",
    intraNode: String(ic.intra_node ?? "nvlink-4"),
    intraNodeBandwidthGbps: ic.intra_node_bandwidth_gbps != null ? String(ic.intra_node_bandwidth_gbps) : "",
    formFactor: String(ic.form_factor ?? "sxm5"),
    listPriceUsd: g.listPriceUsd != null ? String(g.listPriceUsd) : "",
    availability: g.availability ?? "available",
    notes: g.notes ?? "",
    supportedFeatures: (g.supportedFeatures ?? []).join(", "),
  };
}

function formToPayload(form: typeof EMPTY_FORM) {
  return {
    vendor: form.vendor || null,
    family: form.family.trim() || null,
    model: form.model.trim() || null,
    vramGb: form.vramGb ? Number(form.vramGb) : null,
    memoryType: form.memoryType.trim() || null,
    memoryBandwidthGbps: form.memoryBandwidthGbps ? Number(form.memoryBandwidthGbps) : null,
    fp16Tflops: form.fp16Tflops ? Number(form.fp16Tflops) : null,
    bf16Tflops: form.bf16Tflops ? Number(form.bf16Tflops) : null,
    fp8Tflops: form.fp8Tflops ? Number(form.fp8Tflops) : null,
    int8Tops: form.int8Tops ? Number(form.int8Tops) : null,
    int4Tops: form.int4Tops ? Number(form.int4Tops) : null,
    tdpWatts: form.tdpWatts ? Number(form.tdpWatts) : null,
    interconnect: {
      intra_node: form.intraNode || "none",
      intra_node_bandwidth_gbps: form.intraNodeBandwidthGbps ? Number(form.intraNodeBandwidthGbps) : null,
      form_factor: form.formFactor || null,
    },
    listPriceUsd: form.listPriceUsd ? Number(form.listPriceUsd) : null,
    availability: form.availability || null,
    notes: form.notes.trim() || null,
    supportedFeatures: form.supportedFeatures ? form.supportedFeatures.split(",").map((s) => s.trim()).filter(Boolean) : [],
  };
}

export function GpuDialog({ open, gpu, catalogExtractAssigned, onClose, onSaved }: GpuDialogProps) {
  const [tab, setTab] = useState<Tab>("manual");
  const [extractUrl, setExtractUrl] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(gpu ? gpuToForm(gpu) : EMPTY_FORM);
      setError(null);
      setExtractError(null);
      setExtractUrl("");
      setTab("manual");
    }
  }, [open, gpu]);

  function field(name: keyof typeof EMPTY_FORM) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [name]: e.target.value }));
  }

  async function handleExtract() {
    if (!extractUrl.trim()) return;
    setExtracting(true);
    setExtractError(null);
    try {
      const res = await fetch("/api/admin/catalogs/gpus/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: extractUrl.trim() }),
      });
      const body = await res.json() as { extracted?: Record<string, unknown>; error?: string };
      if (!res.ok) throw new Error(body.error ?? "Extraction failed");
      const ex = body.extracted ?? {};
      const ic = (ex.interconnect as Record<string, unknown>) ?? {};
      setForm((f) => ({
        ...f,
        vendor: String(ex.vendor ?? f.vendor),
        family: String(ex.family ?? f.family),
        model: String(ex.model ?? f.model),
        vramGb: ex.vram_gb != null ? String(ex.vram_gb) : f.vramGb,
        memoryType: String(ex.memory_type ?? f.memoryType),
        memoryBandwidthGbps: ex.memory_bandwidth_gbps != null ? String(ex.memory_bandwidth_gbps) : f.memoryBandwidthGbps,
        fp16Tflops: ex.fp16_tflops != null ? String(ex.fp16_tflops) : f.fp16Tflops,
        bf16Tflops: ex.bf16_tflops != null ? String(ex.bf16_tflops) : f.bf16Tflops,
        fp8Tflops: ex.fp8_tflops != null ? String(ex.fp8_tflops) : f.fp8Tflops,
        int8Tops: ex.int8_tops != null ? String(ex.int8_tops) : f.int8Tops,
        int4Tops: ex.int4_tops != null ? String(ex.int4_tops) : f.int4Tops,
        tdpWatts: ex.tdp_watts != null ? String(ex.tdp_watts) : f.tdpWatts,
        intraNode: String(ic.intra_node ?? f.intraNode),
        intraNodeBandwidthGbps: ic.intra_node_bandwidth_gbps != null ? String(ic.intra_node_bandwidth_gbps) : f.intraNodeBandwidthGbps,
        formFactor: String(ic.form_factor ?? f.formFactor),
        listPriceUsd: ex.list_price_usd != null ? String(ex.list_price_usd) : f.listPriceUsd,
        availability: String(ex.availability ?? f.availability),
        notes: String(ex.notes ?? f.notes),
        supportedFeatures: Array.isArray(ex.supported_features) ? (ex.supported_features as string[]).join(", ") : f.supportedFeatures,
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
    if (!form.model.trim()) { setError("Model name is required."); return; }
    setSaving(true);
    setError(null);
    try {
      const payload = formToPayload(form);
      const url = gpu ? `/api/admin/catalogs/gpus/${gpu.id}` : "/api/admin/catalogs/gpus";
      const method = gpu ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{gpu ? "Edit GPU" : "Add GPU"}</DialogTitle>
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
            <p className="text-xs text-[var(--text-secondary)]">Paste a GPU product page URL. AI will pre-fill key specs. Review all fields before saving.</p>
            <div className="flex gap-2">
              <Input value={extractUrl} onChange={(e) => setExtractUrl(e.target.value)} placeholder="https://www.nvidia.com/…" className="flex-1" />
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
              <Label>Vendor</Label>
              <Select value={form.vendor} onValueChange={(v) => setForm((f) => ({ ...f, vendor: v ?? f.vendor }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{VENDORS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Family</Label>
              <Input value={form.family} onChange={field("family")} placeholder="e.g. hopper, ada, mi300" />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Model <span className="text-red-500">*</span></Label>
              <Input value={form.model} onChange={field("model")} placeholder="e.g. H100 SXM5" />
            </div>
            <div className="space-y-1.5">
              <Label>VRAM (GB)</Label>
              <Input type="number" value={form.vramGb} onChange={field("vramGb")} placeholder="e.g. 80" />
            </div>
            <div className="space-y-1.5">
              <Label>Memory Type</Label>
              <Input value={form.memoryType} onChange={field("memoryType")} placeholder="e.g. HBM3" />
            </div>
            <div className="space-y-1.5">
              <Label>Memory BW (GB/s)</Label>
              <Input type="number" value={form.memoryBandwidthGbps} onChange={field("memoryBandwidthGbps")} placeholder="e.g. 3350" />
            </div>
            <div className="space-y-1.5">
              <Label>TDP (W)</Label>
              <Input type="number" value={form.tdpWatts} onChange={field("tdpWatts")} placeholder="e.g. 700" />
            </div>
            <div className="space-y-1.5">
              <Label>FP16 TFLOPS</Label>
              <Input type="number" value={form.fp16Tflops} onChange={field("fp16Tflops")} placeholder="e.g. 989" />
            </div>
            <div className="space-y-1.5">
              <Label>BF16 TFLOPS</Label>
              <Input type="number" value={form.bf16Tflops} onChange={field("bf16Tflops")} placeholder="e.g. 989" />
            </div>
            <div className="space-y-1.5">
              <Label>FP8 TFLOPS</Label>
              <Input type="number" value={form.fp8Tflops} onChange={field("fp8Tflops")} placeholder="e.g. 1979" />
            </div>
            <div className="space-y-1.5">
              <Label>INT8 TOPS</Label>
              <Input type="number" value={form.int8Tops} onChange={field("int8Tops")} placeholder="e.g. 1979" />
            </div>
            <div className="space-y-1.5">
              <Label>INT4 TOPS</Label>
              <Input type="number" value={form.int4Tops} onChange={field("int4Tops")} placeholder="e.g. 3958" />
            </div>
            <div className="space-y-1.5">
              <Label>List Price (USD)</Label>
              <Input type="number" value={form.listPriceUsd} onChange={field("listPriceUsd")} placeholder="e.g. 30000" />
            </div>
          </div>

          {/* Interconnect */}
          <div>
            <p className="text-sm font-medium mb-2">Interconnect</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Intra-node</Label>
                <Select value={form.intraNode} onValueChange={(v) => setForm((f) => ({ ...f, intraNode: v ?? f.intraNode }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{INTRA_NODE_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>BW (GB/s)</Label>
                <Input type="number" value={form.intraNodeBandwidthGbps} onChange={field("intraNodeBandwidthGbps")} placeholder="e.g. 900" />
              </div>
              <div className="space-y-1.5">
                <Label>Form Factor</Label>
                <Select value={form.formFactor} onValueChange={(v) => setForm((f) => ({ ...f, formFactor: v ?? f.formFactor }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FORM_FACTORS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Availability</Label>
              <Select value={form.availability} onValueChange={(v) => setForm((f) => ({ ...f, availability: v ?? f.availability }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{AVAILABILITIES.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Supported Features <span className="text-[var(--text-secondary)] text-xs">(comma-separated)</span></Label>
            <Input value={form.supportedFeatures} onChange={field("supportedFeatures")} placeholder="e.g. fp8-native, transformer-engine, flash-attention-3" />
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input value={form.notes} onChange={field("notes")} placeholder="Optional notes" />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : gpu ? "Save Changes" : "Add GPU"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
