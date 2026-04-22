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
import { SkippableField } from "@/components/discovery/SkippableField";
import { useProjectStore } from "@/lib/store";

const OBSERVABILITY_OPTIONS = [
  "prometheus",
  "grafana",
  "datadog",
  "newrelic",
  "opentelemetry",
  "elastic",
  "splunk",
] as const;

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
            active ? "text-[var(--accent-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
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

export function InfraForm() {
  const [activeField, setActiveField] = useState<string | null>(null);

  const infra = useProjectStore((s) => s.activeProject?.discovery.infra);
  const updateField = useProjectStore((s) => s.updateField);

  if (!infra) {
    return <p className="text-sm text-[var(--text-secondary)] p-6">Loading…</p>;
  }

  const upd = (path: string, value: unknown) =>
    updateField(`discovery.${path}`, value);

  function toggleObservability(tool: string) {
    const current = infra!.observability;
    const next = current.includes(tool)
      ? current.filter((t) => t !== tool)
      : [...current, tool];
    upd("infra.observability", next);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 p-6 items-start">
      <div className="space-y-8 min-w-0">
        <Section title="Orchestration">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldRow
              label="Orchestrator"
              fieldId="discovery.infra.orchestrator"
              activeField={activeField}
              onInfo={setActiveField}
            >
              <SkippableField fieldId="infra.orchestrator">
                <Select
                  value={infra.orchestrator}
                  onValueChange={(v) =>
                    upd(
                      "infra.orchestrator",
                      v as "kubernetes" | "ray" | "slurm" | "nomad" | "bare-metal"
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kubernetes">Kubernetes</SelectItem>
                    <SelectItem value="ray">Ray</SelectItem>
                    <SelectItem value="slurm">Slurm</SelectItem>
                    <SelectItem value="nomad">Nomad</SelectItem>
                    <SelectItem value="bare-metal">Bare metal (no orchestrator)</SelectItem>
                  </SelectContent>
                </Select>
              </SkippableField>
            </FieldRow>

            <FieldRow
              label="GitOps"
              fieldId="discovery.infra.gitops"
              activeField={activeField}
              onInfo={setActiveField}
            >
              <SkippableField fieldId="infra.gitops">
                <Select
                  value={infra.gitops ?? "none"}
                  onValueChange={(v) =>
                    upd("infra.gitops", v as "argocd" | "flux" | "none")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="argocd">Argo CD</SelectItem>
                    <SelectItem value="flux">Flux</SelectItem>
                  </SelectContent>
                </Select>
              </SkippableField>
            </FieldRow>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldRow
              label="Existing Cluster"
              fieldId="discovery.infra.existingCluster"
              activeField={activeField}
              onInfo={setActiveField}
              hint="Customer already has infrastructure"
            >
              <SkippableField fieldId="infra.existingCluster">
                <div className="flex items-center gap-2 h-9">
                  <Switch
                    checked={infra.existingCluster}
                    onCheckedChange={(v) => upd("infra.existingCluster", v)}
                  />
                  <span className="text-sm text-[var(--text-secondary)]">
                    {infra.existingCluster ? "Yes" : "No — greenfield"}
                  </span>
                </div>
              </SkippableField>
            </FieldRow>

            <FieldRow
              label="Air-Gapped"
              fieldId="discovery.infra.airGapped"
              activeField={activeField}
              onInfo={setActiveField}
              hint="No outbound internet access"
            >
              <SkippableField fieldId="infra.airGapped">
                <div className="flex items-center gap-2 h-9">
                  <Switch
                    checked={infra.airGapped}
                    onCheckedChange={(v) => upd("infra.airGapped", v)}
                  />
                  <span className="text-sm text-[var(--text-secondary)]">
                    {infra.airGapped ? "Yes — air-gapped" : "No"}
                  </span>
                </div>
              </SkippableField>
            </FieldRow>
          </div>
        </Section>

        <Section title="Observability Stack">
          <FieldRow
            label="Tools in use"
            fieldId="discovery.infra.observability"
            activeField={activeField}
            onInfo={setActiveField}
            hint="Select all that apply"
          >
            <SkippableField fieldId="infra.observability">
              <div className="flex flex-wrap gap-2 pt-1">
                {OBSERVABILITY_OPTIONS.map((tool) => {
                  const checked = infra.observability.includes(tool);
                  return (
                    <button
                      key={tool}
                      type="button"
                      onClick={() => toggleObservability(tool)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        checked
                          ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white"
                          : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      {tool}
                    </button>
                  );
                })}
              </div>
            </SkippableField>
          </FieldRow>
        </Section>
      </div>

      {/* Sticky explain panel */}
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
