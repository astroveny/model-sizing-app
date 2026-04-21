"use client";

import { useState } from "react";
import { Info } from "lucide-react";
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
import { useProjectStore } from "@/lib/store";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
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
}: {
  label: string;
  fieldId: string;
  activeField: string | null;
  onInfo: (id: string) => void;
  children: React.ReactNode;
  hint?: string;
}) {
  const active = activeField === fieldId;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Label className="text-sm">{label}</Label>
        <button
          type="button"
          onClick={() => onInfo(active ? "" : fieldId)}
          className={`rounded p-0.5 transition-colors ${
            active ? "text-[var(--accent-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          }`}
          aria-label={`Explain ${label}`}
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </div>
      {children}
      {hint && <p className="text-xs text-[var(--text-muted)]">{hint}</p>}
    </div>
  );
}

const OPTIMIZATIONS: {
  key: keyof NonNullable<
    ReturnType<typeof useProjectStore.getState>["activeProject"]
  >["discovery"]["modelPlatform"]["optimizations"];
  label: string;
  hint: string;
}[] = [
  {
    key: "continuousBatching",
    label: "Continuous Batching",
    hint: "Usually on by default in modern servers",
  },
  {
    key: "flashAttention",
    label: "FlashAttention",
    hint: "Fused attention kernel — on by default",
  },
  {
    key: "chunkedPrefill",
    label: "Chunked Prefill",
    hint: "Splits long prefills to reduce TTFT variance",
  },
  {
    key: "prefixCaching",
    label: "Prefix Caching",
    hint: "Reuses KV cache for repeated prompt prefixes",
  },
  {
    key: "fp8KvCache",
    label: "FP8 KV Cache",
    hint: "Halves KV cache VRAM on Hopper / MI300X",
  },
  {
    key: "speculativeDecoding",
    label: "Speculative Decoding",
    hint: "Draft + verify — ~1.5–2× decode throughput",
  },
];

export function ModelPlatformForm() {
  const [activeField, setActiveField] = useState<string | null>(null);

  const mp = useProjectStore((s) => s.activeProject?.discovery.modelPlatform);
  const updateField = useProjectStore((s) => s.updateField);

  if (!mp) {
    return <p className="text-sm text-[var(--text-muted)] p-6">Loading…</p>;
  }

  const upd = (path: string, value: unknown) =>
    updateField(`discovery.${path}`, value);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 p-6 items-start">
      <div className="space-y-8 min-w-0">
        {/* Serving config */}
        <Section title="Serving Configuration">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldRow
              label="Inference Server"
              fieldId="discovery.modelPlatform.inferenceServer"
              activeField={activeField}
              onInfo={setActiveField}
            >
              <Select
                value={mp.inferenceServer}
                onValueChange={(v) =>
                  upd(
                    "modelPlatform.inferenceServer",
                    v as "vllm" | "tgi" | "triton" | "tensorrt-llm" | "sglang"
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vllm">vLLM</SelectItem>
                  <SelectItem value="tgi">TGI (Text Generation Inference)</SelectItem>
                  <SelectItem value="triton">Triton Inference Server</SelectItem>
                  <SelectItem value="tensorrt-llm">TensorRT-LLM</SelectItem>
                  <SelectItem value="sglang">SGLang</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>

            <FieldRow
              label="Model Registry"
              fieldId="discovery.modelPlatform.modelRegistry"
              activeField={activeField}
              onInfo={setActiveField}
            >
              <Select
                value={mp.modelRegistry ?? "none"}
                onValueChange={(v) =>
                  upd(
                    "modelPlatform.modelRegistry",
                    v === "none"
                      ? undefined
                      : (v as "mlflow" | "huggingface" | "s3" | "custom")
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="huggingface">Hugging Face Hub</SelectItem>
                  <SelectItem value="mlflow">MLflow</SelectItem>
                  <SelectItem value="s3">S3 / object store</SelectItem>
                  <SelectItem value="custom">Custom registry</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>

            <FieldRow
              label="KV Cache Backend"
              fieldId="discovery.modelPlatform.caching"
              activeField={activeField}
              onInfo={setActiveField}
            >
              <Select
                value={mp.caching ?? "none"}
                onValueChange={(v) =>
                  upd(
                    "modelPlatform.caching",
                    v === "none" ? undefined : (v as "redis" | "semantic")
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="redis">Redis (exact match)</SelectItem>
                  <SelectItem value="semantic">Semantic cache</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldRow
              label="Multi-Model Serving"
              fieldId="discovery.modelPlatform.multiModelServing"
              activeField={activeField}
              onInfo={setActiveField}
              hint="Multiple models on shared GPU pool"
            >
              <div className="flex items-center gap-2 h-9">
                <Switch
                  checked={mp.multiModelServing}
                  onCheckedChange={(v) => upd("modelPlatform.multiModelServing", v)}
                />
                <span className="text-sm text-[var(--text-muted)]">
                  {mp.multiModelServing ? "Enabled" : "Disabled"}
                </span>
              </div>
            </FieldRow>

            <FieldRow
              label="A/B Testing"
              fieldId="discovery.modelPlatform.abTesting"
              activeField={activeField}
              onInfo={setActiveField}
              hint="Traffic splitting between model versions"
            >
              <div className="flex items-center gap-2 h-9">
                <Switch
                  checked={mp.abTesting}
                  onCheckedChange={(v) => upd("modelPlatform.abTesting", v)}
                />
                <span className="text-sm text-[var(--text-muted)]">
                  {mp.abTesting ? "Enabled" : "Disabled"}
                </span>
              </div>
            </FieldRow>
          </div>
        </Section>

        {/* Optimizations */}
        <Section title="Inference Optimizations">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {OPTIMIZATIONS.map(({ key, label, hint }) => (
              <FieldRow
                key={key}
                label={label}
                fieldId={`discovery.modelPlatform.optimizations.${key}`}
                activeField={activeField}
                onInfo={setActiveField}
                hint={hint}
              >
                <div className="flex items-center gap-2 h-9">
                  <Switch
                    checked={mp.optimizations[key]}
                    onCheckedChange={(v) =>
                      upd(`modelPlatform.optimizations.${key}`, v)
                    }
                  />
                  <span className="text-sm text-[var(--text-muted)]">
                    {mp.optimizations[key] ? "On" : "Off"}
                  </span>
                </div>
              </FieldRow>
            ))}
          </div>
        </Section>
      </div>

      {/* Sticky explain panel */}
      <div className="lg:sticky lg:top-6">
        {activeField ? (
          <ExplainBox fieldId={activeField} />
        ) : (
          <div className="rounded-lg border border-dashed p-4 text-xs text-[var(--text-muted)] text-center">
            Click <Info className="inline h-3.5 w-3.5 mx-0.5" /> next to any
            field to see an explanation.
          </div>
        )}
      </div>
    </div>
  );
}
