"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExplainBox } from "@/components/ExplainBox";
import { SkippableField } from "@/components/discovery/SkippableField";
import { WorkloadReferences } from "@/components/discovery/WorkloadReferences";
import { useProjectStore } from "@/lib/store";
import type { Quantization } from "@/lib/store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
        {title}
      </h3>
      {children}
    </section>
  );
}

function FieldRow({
  label,
  fieldId,
  activeField,
  onInfo,
  children,
  hint,
  required,
  optional,
}: {
  label: string;
  fieldId: string;
  activeField: string | null;
  onInfo: (id: string) => void;
  children: React.ReactNode;
  hint?: string;
  required?: boolean;
  optional?: boolean;
}) {
  const active = activeField === fieldId;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Label className="text-sm">
          {label}
          {required && <span className="text-red-500 ml-0.5" aria-hidden>*</span>}
          {optional && <span className="text-[var(--text-secondary)] text-xs font-normal ml-1">Optional</span>}
        </Label>
        <button
          type="button"
          onClick={() => onInfo(active ? "" : fieldId)}
          className={`rounded p-0.5 transition-colors ${
            active
              ? "text-[var(--accent-primary)]"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
          aria-label={`Explain ${label}`}
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </div>
      {children}
      {hint && <p className="text-xs text-[var(--text-secondary)]">{hint}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// WorkloadForm
// ---------------------------------------------------------------------------

export function WorkloadForm() {
  const [activeField, setActiveField] = useState<string | null>(null);

  const discovery = useProjectStore((s) => s.activeProject?.discovery);
  const updateField = useProjectStore((s) => s.updateField);

  const model = discovery?.model;
  const load = discovery?.load;

  if (!model || !load) {
    return <p className="text-sm text-muted-foreground p-6">Loading…</p>;
  }

  const upd = (path: string, value: unknown) =>
    updateField(`discovery.${path}`, value);

  const num = (v: string) => (v === "" ? 0 : Number(v));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 p-6 items-start">
      {/* ------------------------------------------------------------------ */}
      {/* Left: form fields                                                    */}
      {/* ------------------------------------------------------------------ */}
      <div className="space-y-8 min-w-0">
        <WorkloadReferences />
        {/* Model */}
        <Section title="Model">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldRow
              label="Model Family"
              fieldId="discovery.model.family"
              activeField={activeField}
              onInfo={setActiveField}
              hint="e.g. llama, mistral, qwen"
            >
              <Input
                value={model.family}
                onChange={(e) => upd("model.family", e.target.value)}
                placeholder="llama"
              />
            </FieldRow>

            <FieldRow
              label="Model Name"
              fieldId="discovery.model.name"
              activeField={activeField}
              onInfo={setActiveField}
              hint="e.g. Llama-3.1-70B"
              required
            >
              <Input
                value={model.name}
                onChange={(e) => upd("model.name", e.target.value)}
                placeholder="Llama-3.1-70B"
              />
            </FieldRow>

            <FieldRow
              label="Parameters (B)"
              fieldId="discovery.model.params"
              activeField={activeField}
              onInfo={setActiveField}
              hint="Total parameter count in billions"
              required
            >
              <Input
                type="number"
                min={0}
                step={0.1}
                value={model.params || ""}
                onChange={(e) => upd("model.params", num(e.target.value))}
                placeholder="70"
              />
            </FieldRow>

            <FieldRow
              label="Quantization"
              fieldId="discovery.model.quantization"
              activeField={activeField}
              onInfo={setActiveField}
              required
            >
              <Select
                value={model.quantization}
                onValueChange={(v) => upd("model.quantization", v as Quantization)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["FP32", "FP16", "BF16", "FP8", "INT8", "INT4"] as Quantization[]).map(
                    (q) => (
                      <SelectItem key={q} value={q}>
                        {q}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </FieldRow>

            <FieldRow
              label="Context Length (tokens)"
              fieldId="discovery.model.contextLength"
              activeField={activeField}
              onInfo={setActiveField}
            >
              <SkippableField fieldId="model.contextLength">
                <Input
                  type="number"
                  min={128}
                  step={1024}
                  value={model.contextLength || ""}
                  onChange={(e) => upd("model.contextLength", num(e.target.value))}
                  placeholder="4096"
                />
              </SkippableField>
            </FieldRow>

            <FieldRow
              label="Architecture"
              fieldId="discovery.model.architecture"
              activeField={activeField}
              onInfo={setActiveField}
            >
              <SkippableField fieldId="model.architecture">
                <Select
                  value={model.architecture}
                  onValueChange={(v) =>
                    upd("model.architecture", v as "dense" | "moe")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dense">Dense</SelectItem>
                    <SelectItem value="moe">MoE (Mixture of Experts)</SelectItem>
                  </SelectContent>
                </Select>
              </SkippableField>
            </FieldRow>

            {model.architecture === "moe" && (
              <FieldRow
                label="MoE Active Params (B)"
                fieldId="discovery.model.moeActiveParams"
                activeField={activeField}
                onInfo={setActiveField}
                hint="Parameters in active experts per token"
              >
                <Input
                  type="number"
                  min={0}
                  step={0.1}
                  value={model.moeActiveParams ?? ""}
                  onChange={(e) =>
                    upd(
                      "model.moeActiveParams",
                      e.target.value === "" ? undefined : num(e.target.value)
                    )
                  }
                  placeholder="13"
                />
              </FieldRow>
            )}
          </div>
        </Section>

        {/* Load */}
        <Section title="Load & Latency Targets">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldRow
              label="Concurrent Users"
              fieldId="discovery.load.concurrentUsers"
              activeField={activeField}
              onInfo={setActiveField}
              hint="Peak simultaneous active requests"
              required
            >
              <Input
                type="number"
                min={1}
                value={load.concurrentUsers || ""}
                onChange={(e) => upd("load.concurrentUsers", num(e.target.value))}
                placeholder="50"
              />
            </FieldRow>

            <FieldRow
              label="Requests / Second"
              fieldId="discovery.load.requestsPerSecond"
              activeField={activeField}
              onInfo={setActiveField}
              hint="Sustained RPS at steady state"
            >
              <SkippableField fieldId="load.requestsPerSecond">
                <Input
                  type="number"
                  min={0}
                  step={0.1}
                  value={load.requestsPerSecond || ""}
                  onChange={(e) => upd("load.requestsPerSecond", num(e.target.value))}
                  placeholder="10"
                />
              </SkippableField>
            </FieldRow>

            <FieldRow
              label="Avg Input Tokens"
              fieldId="discovery.load.avgInputTokens"
              activeField={activeField}
              onInfo={setActiveField}
              required
            >
              <Input
                type="number"
                min={1}
                value={load.avgInputTokens || ""}
                onChange={(e) => upd("load.avgInputTokens", num(e.target.value))}
                placeholder="512"
              />
            </FieldRow>

            <FieldRow
              label="Avg Output Tokens"
              fieldId="discovery.load.avgOutputTokens"
              activeField={activeField}
              onInfo={setActiveField}
              required
            >
              <Input
                type="number"
                min={1}
                value={load.avgOutputTokens || ""}
                onChange={(e) => upd("load.avgOutputTokens", num(e.target.value))}
                placeholder="256"
              />
            </FieldRow>

            <FieldRow
              label="Target End-to-End P50 (ms)"
              fieldId="discovery.load.targetLatencyP50Ms"
              activeField={activeField}
              onInfo={setActiveField}
            >
              <SkippableField fieldId="load.targetLatencyP50Ms">
                <Input
                  type="number"
                  min={0}
                  value={load.targetLatencyP50Ms || ""}
                  onChange={(e) => upd("load.targetLatencyP50Ms", num(e.target.value))}
                  placeholder="3000"
                />
              </SkippableField>
            </FieldRow>

            <FieldRow
              label="Target End-to-End P95 (ms)"
              fieldId="discovery.load.targetLatencyP95Ms"
              activeField={activeField}
              onInfo={setActiveField}
            >
              <SkippableField fieldId="load.targetLatencyP95Ms">
                <Input
                  type="number"
                  min={0}
                  value={load.targetLatencyP95Ms || ""}
                  onChange={(e) => upd("load.targetLatencyP95Ms", num(e.target.value))}
                  placeholder="8000"
                />
              </SkippableField>
            </FieldRow>

            <FieldRow
              label="Target TTFT (ms)"
              fieldId="discovery.load.targetTTFTMs"
              activeField={activeField}
              onInfo={setActiveField}
              hint="Time-to-first-token SLA"
            >
              <SkippableField fieldId="load.targetTTFTMs">
                <Input
                  type="number"
                  min={0}
                  value={load.targetTTFTMs || ""}
                  onChange={(e) => upd("load.targetTTFTMs", num(e.target.value))}
                  placeholder="500"
                />
              </SkippableField>
            </FieldRow>

            <FieldRow
              label="Target ITL (ms)"
              fieldId="discovery.load.targetITLMs"
              activeField={activeField}
              onInfo={setActiveField}
              hint="Inter-token latency SLA"
            >
              <SkippableField fieldId="load.targetITLMs">
                <Input
                  type="number"
                  min={0}
                  value={load.targetITLMs || ""}
                  onChange={(e) => upd("load.targetITLMs", num(e.target.value))}
                  placeholder="50"
                />
              </SkippableField>
            </FieldRow>

            <FieldRow
              label="Peak Burst Multiplier"
              fieldId="discovery.load.peakBurstMultiplier"
              activeField={activeField}
              onInfo={setActiveField}
              hint="Peak / sustained load ratio"
            >
              <SkippableField fieldId="load.peakBurstMultiplier">
                <Input
                  type="number"
                  min={1}
                  max={20}
                  step={0.1}
                  value={load.peakBurstMultiplier || ""}
                  onChange={(e) => upd("load.peakBurstMultiplier", num(e.target.value))}
                  placeholder="2"
                />
              </SkippableField>
            </FieldRow>

            <FieldRow
              label="Uptime SLA (%)"
              fieldId="discovery.load.uptimeSla"
              activeField={activeField}
              onInfo={setActiveField}
            >
              <SkippableField fieldId="load.uptimeSla">
                <Input
                  type="number"
                  min={90}
                  max={100}
                  step={0.1}
                  value={load.uptimeSla || ""}
                  onChange={(e) => upd("load.uptimeSla", num(e.target.value))}
                  placeholder="99.9"
                />
              </SkippableField>
            </FieldRow>
          </div>

          <FieldRow
            label="Streaming"
            fieldId="discovery.load.streaming"
            activeField={activeField}
            onInfo={setActiveField}
            hint="Stream tokens as they are generated"
          >
            <SkippableField fieldId="load.streaming">
              <div className="flex items-center gap-2 h-9">
                <Switch
                  checked={load.streaming}
                  onCheckedChange={(v) => upd("load.streaming", v)}
                />
                <span className="text-sm text-muted-foreground">
                  {load.streaming ? "Enabled" : "Disabled"}
                </span>
              </div>
            </SkippableField>
          </FieldRow>
        </Section>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Right: sticky ExplainBox panel                                       */}
      {/* ------------------------------------------------------------------ */}
      <div className="lg:sticky lg:top-6">
        {activeField ? (
          <ExplainBox fieldId={activeField} />
        ) : (
          <div className="rounded-lg border border-dashed p-4 text-xs text-[var(--text-secondary)] text-center">
            Click <Info className="inline h-3.5 w-3.5 mx-0.5" /> next to any
            field to see an explanation.
          </div>
        )}
      </div>
    </div>
  );
}
