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

export function ApplicationForm() {
  const [activeField, setActiveField] = useState<string | null>(null);

  const app = useProjectStore((s) => s.activeProject?.discovery.application);
  const updateField = useProjectStore((s) => s.updateField);

  if (!app) {
    return <p className="text-sm text-[var(--text-secondary)] p-6">Loading…</p>;
  }

  const upd = (path: string, value: unknown) =>
    updateField(`discovery.${path}`, value);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 p-6 items-start">
      <div className="space-y-8 min-w-0">
        <Section title="API Layer">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldRow
              label="API Gateway"
              fieldId="discovery.application.apiGateway"
              activeField={activeField}
              onInfo={setActiveField}
            >
              <SkippableField fieldId="application.apiGateway">
                <Select
                  value={app.apiGateway}
                  onValueChange={(v) =>
                    upd(
                      "application.apiGateway",
                      v as "kong" | "apisix" | "envoy" | "cloud-native" | "none"
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="kong">Kong</SelectItem>
                    <SelectItem value="apisix">Apache APISIX</SelectItem>
                    <SelectItem value="envoy">Envoy</SelectItem>
                    <SelectItem value="cloud-native">Cloud-native (ALB / API GW)</SelectItem>
                  </SelectContent>
                </Select>
              </SkippableField>
            </FieldRow>

            <FieldRow
              label="Authentication"
              fieldId="discovery.application.auth"
              activeField={activeField}
              onInfo={setActiveField}
            >
              <SkippableField fieldId="application.auth">
                <Select
                  value={app.auth}
                  onValueChange={(v) =>
                    upd(
                      "application.auth",
                      v as "oidc" | "apikey" | "mtls" | "jwt" | "none"
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="apikey">API Key</SelectItem>
                    <SelectItem value="jwt">JWT</SelectItem>
                    <SelectItem value="oidc">OIDC / OAuth 2.0</SelectItem>
                    <SelectItem value="mtls">mTLS</SelectItem>
                  </SelectContent>
                </Select>
              </SkippableField>
            </FieldRow>
          </div>
        </Section>

        <Section title="Features">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldRow
              label="Rate Limiting"
              fieldId="discovery.application.rateLimiting"
              activeField={activeField}
              onInfo={setActiveField}
              hint="Per-key or per-user request throttling"
            >
              <SkippableField fieldId="application.rateLimiting">
                <div className="flex items-center gap-2 h-9">
                  <Switch
                    checked={app.rateLimiting}
                    onCheckedChange={(v) => upd("application.rateLimiting", v)}
                  />
                  <span className="text-sm text-[var(--text-secondary)]">
                    {app.rateLimiting ? "Enabled" : "Disabled"}
                  </span>
                </div>
              </SkippableField>
            </FieldRow>

            <FieldRow
              label="UI Required"
              fieldId="discovery.application.uiRequired"
              activeField={activeField}
              onInfo={setActiveField}
              hint="Chat UI or admin console needed"
            >
              <SkippableField fieldId="application.uiRequired">
                <div className="flex items-center gap-2 h-9">
                  <Switch
                    checked={app.uiRequired}
                    onCheckedChange={(v) => upd("application.uiRequired", v)}
                  />
                  <span className="text-sm text-[var(--text-secondary)]">
                    {app.uiRequired ? "Yes" : "No — API only"}
                  </span>
                </div>
              </SkippableField>
            </FieldRow>

            <FieldRow
              label="Audit Logging"
              fieldId="discovery.application.auditLogging"
              activeField={activeField}
              onInfo={setActiveField}
              hint="Log all prompts and completions for compliance"
            >
              <SkippableField fieldId="application.auditLogging">
                <div className="flex items-center gap-2 h-9">
                  <Switch
                    checked={app.auditLogging}
                    onCheckedChange={(v) => upd("application.auditLogging", v)}
                  />
                  <span className="text-sm text-[var(--text-secondary)]">
                    {app.auditLogging ? "Required" : "Not required"}
                  </span>
                </div>
              </SkippableField>
            </FieldRow>

            <FieldRow
              label="Metering"
              fieldId="discovery.application.metering"
              activeField={activeField}
              onInfo={setActiveField}
              hint="Token-level usage tracking — required for GPUaaS / SaaS patterns"
            >
              <SkippableField fieldId="application.metering">
                <div className="flex items-center gap-2 h-9">
                  <Switch
                    checked={app.metering}
                    onCheckedChange={(v) => upd("application.metering", v)}
                  />
                  <span className="text-sm text-[var(--text-secondary)]">
                    {app.metering ? "Required" : "Not required"}
                  </span>
                </div>
              </SkippableField>
            </FieldRow>
          </div>
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
