"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { Plus, Settings2, Database, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModelRow } from "@/components/settings/ModelRow";
import { FeatureRoutingSummary } from "@/components/settings/FeatureRoutingSummary";
import { AddModelDialog } from "@/components/settings/AddModelDialog";
import type { ConfiguredModelDTO } from "@/lib/settings/models";
import type { LlmFeatureId } from "@/lib/settings/feature-ids";

export default function SettingsPage() {
  const [models, setModels] = useState<ConfiguredModelDTO[]>([]);
  const [routing, setRouting] = useState<Record<LlmFeatureId, string | null>>({
    "rfp-extract": null,
    "rfi-draft-response": null,
    "explain-field": null,
    "explain-sizing": null,
    "build-report-summary": null,
    "quick-sizing-assist": null,
  });
  const [addOpen, setAddOpen] = useState(false);

  const refresh = useCallback(async () => {
    const [modelsRes, routingRes] = await Promise.all([
      fetch("/api/settings/models"),
      fetch("/api/settings/routing"),
    ]);
    setModels(await modelsRes.json() as ConfiguredModelDTO[]);
    setRouting(await routingRes.json() as Record<LlmFeatureId, string | null>);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div className="p-6 max-w-2xl space-y-8">
      <div className="flex items-center gap-3">
        <Settings2 className="h-5 w-5 text-[var(--text-secondary)]" />
        <div>
          <h1 className="text-xl font-semibold">LLM Settings</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Configure models and assign them to specific features. Each feature uses exactly one model.
          </p>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Configured Models</h2>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Model
          </Button>
        </div>

        {models.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-[var(--border-default)] p-8 text-center">
            <p className="text-sm text-[var(--text-secondary)]">No models configured yet.</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Add a model to enable AI features. Existing <code>.env</code> credentials are auto-migrated on next page load.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {models.map((model) => (
              <ModelRow key={model.id} model={model} routing={routing} onRefresh={refresh} />
            ))}
          </div>
        )}
      </section>

      <FeatureRoutingSummary routing={routing} models={models} />

      <section>
        <Link
          href="/settings/catalogs"
          className="flex items-center justify-between rounded-lg border border-[var(--border-default)] px-4 py-3 hover:border-[var(--accent-primary)] transition-colors group"
        >
          <div className="flex items-center gap-3">
            <Database className="h-4 w-4 text-[var(--text-secondary)]" />
            <div>
              <p className="text-sm font-medium">Hardware &amp; Model Catalogs</p>
              <p className="text-xs text-[var(--text-secondary)]">Manage GPUs, servers, LLM models, and workload references.</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-[var(--text-secondary)] group-hover:text-[var(--accent-primary)] transition-colors" />
        </Link>
      </section>

      <AddModelDialog open={addOpen} onClose={() => setAddOpen(false)} onAdded={refresh} />
    </div>
  );
}
