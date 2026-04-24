"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Trash2, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { ALL_FEATURES, FEATURE_LABELS } from "@/lib/settings/feature-ids";
import type { LlmFeatureId } from "@/lib/settings/feature-ids";
import type { ConfiguredModelDTO } from "@/lib/settings/models";

interface ModelRowProps {
  model: ConfiguredModelDTO;
  routing: Record<LlmFeatureId, string | null>;
  onRefresh: () => void;
}

export function ModelRow({ model, routing, onRefresh }: ModelRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [testState, setTestState] = useState<"idle" | "testing" | "ok" | "error">("idle");
  const [testError, setTestError] = useState<string | null>(null);
  const [clearLoading, setClearLoading] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);

  async function handleTest() {
    setTestState("testing");
    setTestError(null);
    const res = await fetch(`/api/settings/models/${model.id}/test`, { method: "POST" });
    const body = await res.json() as { ok: boolean; error?: string };
    if (body.ok) { setTestState("ok"); }
    else { setTestState("error"); setTestError(body.error ?? "Unknown error"); }
  }

  async function handleClearAssignments() {
    setClearLoading(true);
    await fetch(`/api/settings/models/${model.id}/clear-assignments`, { method: "POST" });
    setClearLoading(false);
    onRefresh();
  }

  async function handleDelete() {
    if (!confirm(`Delete model "${model.label}"? All assigned features will become unassigned.`)) return;
    await fetch(`/api/settings/models/${model.id}`, { method: "DELETE" });
    onRefresh();
  }

  async function handleFeatureToggle(feature: LlmFeatureId, checked: boolean) {
    if (checked) {
      await fetch(`/api/settings/routing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feature, modelId: model.id }),
      });
    } else {
      await fetch(`/api/settings/routing`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feature }),
      });
    }
    onRefresh();
  }

  async function handleSaveKey() {
    if (!apiKey.trim()) return;
    setSaveLoading(true);
    await fetch(`/api/settings/models/${model.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerConfig: { apiKey: apiKey.trim() } }),
    });
    setApiKey("");
    setSaveLoading(false);
    onRefresh();
  }

  return (
    <div className="rounded-lg border border-[var(--border-default)] overflow-hidden">
      {/* Row header */}
      <div
        className="flex items-center gap-3 px-4 py-3 bg-[var(--bg-surface)] cursor-pointer hover:bg-[var(--bg-subtle)] transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? <ChevronDown className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" /> : <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" />}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{model.label}</p>
          <p className="text-xs text-[var(--text-secondary)]">
            {model.provider} · {model.providerConfig.model}
            {model.isValid === true && <span className="ml-2 text-[var(--success)]">● Connected</span>}
            {model.isValid === false && <span className="ml-2 text-[var(--danger)]">● Failed</span>}
          </p>
        </div>
        <span className="shrink-0 text-xs text-[var(--text-secondary)] bg-[var(--bg-subtle)] rounded-full px-2 py-0.5">
          {model.assignedFeatures.length} feature{model.assignedFeatures.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="px-4 py-4 space-y-5 border-t border-[var(--border-default)] bg-[var(--bg-canvas)]">
          {/* API key update */}
          <div className="space-y-1.5">
            <Label className="text-xs">API Key</Label>
            <p className="text-xs text-[var(--text-secondary)]">
              Currently: {model.providerConfig.apiKeyMasked ?? "not set"}
            </p>
            <div className="flex gap-2">
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter new key to rotate…"
                className="text-sm"
              />
              <Button size="sm" variant="outline" onClick={handleSaveKey} disabled={!apiKey.trim() || saveLoading}>
                {saveLoading ? "Saving…" : "Update"}
              </Button>
            </div>
          </div>

          {/* Feature checkboxes */}
          <div className="space-y-2">
            <Label className="text-xs">Feature Assignments</Label>
            <div className="space-y-2">
              {ALL_FEATURES.map((feature) => {
                const ownerModelId = routing[feature];
                const ownedByThis = ownerModelId === model.id;
                const ownedByOther = ownerModelId !== null && ownerModelId !== model.id;
                return (
                  <div key={feature} className="flex items-center gap-3">
                    <Switch
                      checked={ownedByThis}
                      disabled={ownedByOther}
                      onCheckedChange={(checked) => handleFeatureToggle(feature, checked)}
                    />
                    <span className={cn("text-sm", ownedByOther && "text-[var(--text-secondary)]")}>
                      {FEATURE_LABELS[feature]}
                    </span>
                    {ownedByOther && (
                      <span className="text-xs text-[var(--text-secondary)] italic">
                        (assigned elsewhere)
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={handleTest} disabled={testState === "testing"}>
              {testState === "testing" && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              {testState === "ok" && <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-[var(--success)]" />}
              {testState === "error" && <XCircle className="h-3.5 w-3.5 mr-1.5 text-[var(--danger)]" />}
              Test Connection
            </Button>
            {testState === "error" && testError && (
              <span className="text-xs text-[var(--danger)] self-center">{testError}</span>
            )}
            <Button size="sm" variant="outline" onClick={handleClearAssignments} disabled={clearLoading}>
              {clearLoading ? "Clearing…" : "Clear Assignments"}
            </Button>
            <Button size="sm" variant="outline" className="text-[var(--danger)] hover:text-[var(--danger)] ml-auto" onClick={handleDelete}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Delete
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
