"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { ServerRow, GpuRow } from "@/lib/catalogs/index";

interface GpuConfigDraft {
  key: string;
  gpuId: string;
  gpuCount: number;
  interconnect: string;
  listPriceUsd: string;
  isDefault: boolean;
}

interface ServerDialogProps {
  open: boolean;
  server: ServerRow | null;
  gpus: GpuRow[];
  onClose: () => void;
  onSaved: () => void;
}

const VENDORS = ["dell", "hpe", "supermicro", "nvidia", "lenovo", "cisco", "other"] as const;
const INTERCONNECTS = ["nvlink", "infinity-fabric", "pcie", "none"] as const;

function emptyConfig(key: string, firstGpuId: string): GpuConfigDraft {
  return { key, gpuId: firstGpuId, gpuCount: 8, interconnect: "nvlink", listPriceUsd: "", isDefault: false };
}

function serverToForm(s: ServerRow) {
  return {
    vendor: s.vendor ?? "",
    model: s.model ?? "",
    cpu: s.cpu ?? "",
    memoryGb: s.memoryGb != null ? String(s.memoryGb) : "",
    storage: s.storage ?? "",
    network: s.network ?? "",
    tdpWatts: s.tdpWatts != null ? String(s.tdpWatts) : "",
    rackUnits: s.rackUnits != null ? String(s.rackUnits) : "",
    releaseYear: s.releaseYear != null ? String(s.releaseYear) : "",
    specSheetUrl: s.specSheetUrl ?? "",
    notes: s.notes ?? "",
  };
}

function configsFromServer(s: ServerRow): GpuConfigDraft[] {
  return s.gpuConfigs.map((c, i) => ({
    key: String(i),
    gpuId: c.gpuId,
    gpuCount: c.gpuCount,
    interconnect: c.interconnect ?? "nvlink",
    listPriceUsd: c.listPriceUsd != null ? String(c.listPriceUsd) : "",
    isDefault: c.isDefault,
  }));
}

const EMPTY_FORM = {
  vendor: "dell", model: "", cpu: "", memoryGb: "", storage: "", network: "",
  tdpWatts: "", rackUnits: "", releaseYear: "", specSheetUrl: "", notes: "",
};

export function ServerDialog({ open, server, gpus, onClose, onSaved }: ServerDialogProps) {
  const firstGpuId = gpus[0]?.id ?? "";
  const [form, setForm] = useState(EMPTY_FORM);
  const [configs, setConfigs] = useState<GpuConfigDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (server) {
        setForm(serverToForm(server));
        setConfigs(configsFromServer(server));
      } else {
        setForm(EMPTY_FORM);
        setConfigs([emptyConfig("0", firstGpuId)]);
      }
      setError(null);
    }
  }, [open, server, firstGpuId]);

  function field(name: keyof typeof EMPTY_FORM) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [name]: e.target.value }));
  }

  function addConfig() {
    setConfigs((cs) => [...cs, emptyConfig(String(Date.now()), firstGpuId)]);
  }

  function removeConfig(key: string) {
    setConfigs((cs) => cs.filter((c) => c.key !== key));
  }

  function updateConfig(key: string, patch: Partial<GpuConfigDraft>) {
    setConfigs((cs) =>
      cs.map((c) => {
        if (c.key !== key) return c;
        const updated = { ...c, ...patch };
        if (patch.isDefault) {
          // enforce single default
        }
        return updated;
      })
    );
  }

  function setDefault(key: string) {
    setConfigs((cs) => cs.map((c) => ({ ...c, isDefault: c.key === key })));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.model.trim()) { setError("Model name is required."); return; }
    if (configs.length === 0) { setError("At least one GPU configuration is required."); return; }
    if (!configs.some((c) => c.isDefault)) { setError("Mark one GPU configuration as default."); return; }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        vendor: form.vendor || null,
        model: form.model.trim(),
        cpu: form.cpu.trim() || null,
        memoryGb: form.memoryGb ? Number(form.memoryGb) : null,
        storage: form.storage.trim() || null,
        network: form.network.trim() || null,
        tdpWatts: form.tdpWatts ? Number(form.tdpWatts) : null,
        rackUnits: form.rackUnits ? Number(form.rackUnits) : null,
        releaseYear: form.releaseYear ? Number(form.releaseYear) : null,
        specSheetUrl: form.specSheetUrl.trim() || null,
        notes: form.notes.trim() || null,
        gpuConfigs: configs.map((c) => ({
          gpuId: c.gpuId,
          gpuCount: Number(c.gpuCount),
          interconnect: c.interconnect || null,
          listPriceUsd: c.listPriceUsd ? Number(c.listPriceUsd) : null,
          isDefault: c.isDefault,
        })),
      };

      const url = server
        ? `/api/admin/catalogs/servers/${server.id}`
        : "/api/admin/catalogs/servers";
      const method = server ? "PATCH" : "POST";

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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{server ? "Edit Server" : "Add Server"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Basic fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Vendor</Label>
              <Select value={form.vendor} onValueChange={(v) => setForm((f) => ({ ...f, vendor: v ?? f.vendor }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VENDORS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Model <span className="text-red-500">*</span></Label>
              <Input value={form.model} onChange={field("model")} placeholder="e.g. PowerEdge XE9680" />
            </div>
            <div className="space-y-1.5">
              <Label>CPU</Label>
              <Input value={form.cpu} onChange={field("cpu")} placeholder="e.g. 2× Intel Xeon 8480+" />
            </div>
            <div className="space-y-1.5">
              <Label>Memory (GB)</Label>
              <Input type="number" value={form.memoryGb} onChange={field("memoryGb")} placeholder="e.g. 2048" />
            </div>
            <div className="space-y-1.5">
              <Label>Storage</Label>
              <Input value={form.storage} onChange={field("storage")} placeholder="e.g. 8× 3.84 TB NVMe" />
            </div>
            <div className="space-y-1.5">
              <Label>Network</Label>
              <Input value={form.network} onChange={field("network")} placeholder="e.g. 2× 400G InfiniBand" />
            </div>
            <div className="space-y-1.5">
              <Label>TDP (W)</Label>
              <Input type="number" value={form.tdpWatts} onChange={field("tdpWatts")} placeholder="e.g. 10200" />
            </div>
            <div className="space-y-1.5">
              <Label>Rack Units</Label>
              <Input type="number" value={form.rackUnits} onChange={field("rackUnits")} placeholder="e.g. 8" />
            </div>
            <div className="space-y-1.5">
              <Label>Release Year</Label>
              <Input type="number" value={form.releaseYear} onChange={field("releaseYear")} placeholder="e.g. 2024" />
            </div>
            <div className="space-y-1.5">
              <Label>Spec Sheet URL</Label>
              <Input value={form.specSheetUrl} onChange={field("specSheetUrl")} placeholder="https://…" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input value={form.notes} onChange={field("notes")} placeholder="Optional notes" />
          </div>

          {/* GPU Configs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>GPU Configurations <span className="text-red-500">*</span></Label>
              <Button type="button" size="sm" variant="outline" onClick={addConfig}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Config
              </Button>
            </div>
            {configs.length === 0 && (
              <p className="text-xs text-[var(--text-secondary)]">At least one GPU configuration is required.</p>
            )}
            <div className="space-y-2">
              {configs.map((cfg) => (
                <div key={cfg.key} className="grid grid-cols-[1fr_80px_120px_100px_auto_auto] gap-2 items-center rounded-md border border-[var(--border-default)] p-2">
                  <Select value={cfg.gpuId} onValueChange={(v) => updateConfig(cfg.key, { gpuId: v ?? cfg.gpuId })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {gpus.filter((g) => !g.isDeprecated).map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.model ?? g.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number" min={1} className="h-8 text-xs" value={cfg.gpuCount}
                    onChange={(e) => updateConfig(cfg.key, { gpuCount: Number(e.target.value) })}
                    placeholder="Count"
                  />
                  <Select value={cfg.interconnect} onValueChange={(v) => updateConfig(cfg.key, { interconnect: v ?? cfg.interconnect })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {INTERCONNECTS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number" className="h-8 text-xs" value={cfg.listPriceUsd}
                    onChange={(e) => updateConfig(cfg.key, { listPriceUsd: e.target.value })}
                    placeholder="Price $"
                  />
                  <button
                    type="button"
                    onClick={() => setDefault(cfg.key)}
                    className={`text-xs px-2 py-1 rounded border transition-colors ${cfg.isDefault ? "border-[var(--accent-primary)] text-[var(--accent-primary)] bg-[var(--accent-primary)]/10" : "border-[var(--border-muted)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)]"}`}
                  >
                    {cfg.isDefault ? "Default" : "Set default"}
                  </button>
                  <button type="button" onClick={() => removeConfig(cfg.key)} className="text-[var(--text-secondary)] hover:text-red-500 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              GPU × Count · Interconnect · List Price · Default flag
            </p>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : server ? "Save Changes" : "Add Server"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
