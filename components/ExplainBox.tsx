"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle, Sparkles, AlertTriangle, Link2, Loader2, RotateCcw, Maximize2 } from "lucide-react";
import { getExplainEntry } from "@/lib/explain/loader";
import { useProjectStore } from "@/lib/store";
import { llmComplete, LlmFeatureUnassignedError } from "@/lib/llm/client";
import { EXPLAIN_FIELD_SYSTEM, buildExplainFieldPrompt } from "@/lib/llm/prompts/explain-field";
import type { LlmFeatureId } from "@/lib/settings/feature-ids";
import type { ExplainEntry } from "@/lib/explain/loader";

// Module-level cache so we only fetch once per page session.
let _featureLabelsCache: Record<string, string | null> | null = null;
let _featureLabelsFetch: Promise<Record<string, string | null>> | null = null;

async function getFeatureLabels(): Promise<Record<string, string | null>> {
  if (_featureLabelsCache) return _featureLabelsCache;
  if (!_featureLabelsFetch) {
    _featureLabelsFetch = fetch("/api/settings/feature-labels")
      .then((r) => r.json() as Promise<Record<string, string | null>>)
      .then((data) => { _featureLabelsCache = data; return data; })
      .catch(() => ({}));
  }
  return _featureLabelsFetch;
}

type Props = {
  fieldId: string;
  /** Optional inline label shown in the header if no title is in the catalog */
  label?: string;
};

const FEATURE: LlmFeatureId = "explain-field";
const MAX_LABEL_LEN = 12; // chars before truncating to "Ask AI"

// ---- Inner body component (shared between inline and modal) ----

interface ExplainBoxBodyProps {
  entry: ExplainEntry | null;
  fieldId: string;
  error: string | null;
  loading: boolean;
  isOverridden: boolean;
  assignedLabel: string | null;
  displayLabel: string;
  hasProject: boolean;
  onAskClaude: () => void;
  onReset: () => void;
}

function ExplainBoxBody({
  entry, fieldId, error, loading, isOverridden, assignedLabel, displayLabel, hasProject, onAskClaude, onReset,
}: ExplainBoxBodyProps) {
  return (
    <>
      {entry ? (
        <Tabs defaultValue="explain">
          <TabsList className="h-7 mb-2">
            <TabsTrigger value="explain" className="text-xs h-6 px-2">Explain</TabsTrigger>
            <TabsTrigger value="example" className="text-xs h-6 px-2">Example</TabsTrigger>
          </TabsList>

          <TabsContent value="explain" className="mt-0 space-y-2">
            <p className="text-xs leading-relaxed text-[var(--text-secondary)]">{entry.explain}</p>

            {entry.customerFriendlyHint && (
              <p className="text-xs italic text-[var(--text-secondary)] border-l-2 border-[var(--accent-primary)]/30 pl-2">
                {entry.customerFriendlyHint}
              </p>
            )}

            {entry.commonMistakes && entry.commonMistakes.length > 0 && (
              <div className="space-y-0.5">
                <p className="flex items-center gap-1 text-xs font-medium text-[var(--warning)]">
                  <AlertTriangle className="h-3 w-3" />
                  Common mistakes
                </p>
                <ul className="list-disc list-inside space-y-0.5">
                  {entry.commonMistakes.map((m, i) => (
                    <li key={i} className="text-xs text-[var(--text-secondary)]">{m}</li>
                  ))}
                </ul>
              </div>
            )}

            {entry.relatedFields && entry.relatedFields.length > 0 && (
              <p className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                <Link2 className="h-3 w-3 shrink-0" />
                See also: <span className="font-mono">{entry.relatedFields.join(", ")}</span>
              </p>
            )}
          </TabsContent>

          <TabsContent value="example" className="mt-0">
            <p className="text-xs leading-relaxed text-[var(--text-secondary)]">{entry.example}</p>
          </TabsContent>
        </Tabs>
      ) : (
        <p className="text-xs text-[var(--text-secondary)] italic">
          No explanation yet — <span className="font-mono text-[10px]">{fieldId}</span>
        </p>
      )}

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

      <div className="mt-2 border-t pt-2 flex items-center gap-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger render={<span className="inline-flex" />}>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 gap-1.5 px-2 text-xs text-[var(--text-secondary)]"
                disabled={loading || !hasProject || assignedLabel === null}
                onClick={onAskClaude}
              >
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                {loading ? `Asking ${displayLabel}…` : `Ask ${displayLabel}`}
              </Button>
            </TooltipTrigger>
            {assignedLabel === null && (
              <TooltipContent>Configure a model for Explain Field in Settings → LLM</TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>

        {isOverridden && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 gap-1.5 px-2 text-xs text-[var(--text-secondary)]"
            onClick={onReset}
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </Button>
        )}
      </div>
    </>
  );
}

// ---- Main ExplainBox ----

export function ExplainBox({ fieldId, label }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // null = unassigned/loading, string = assigned model label
  const [assignedLabel, setAssignedLabel] = useState<string | null>(null);
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    getFeatureLabels().then((labels) => {
      setAssignedLabel(labels[FEATURE] ?? null);
    });
  }, []);

  const activeProject = useProjectStore((s) => s.activeProject);
  const updateField = useProjectStore((s) => s.updateField);

  const explainOverrides = activeProject?.explainOverrides;
  const entry = getExplainEntry(fieldId, explainOverrides);
  const isOverridden = !!explainOverrides?.[fieldId];

  const title = entry?.title ?? label ?? fieldId;
  const displayLabel =
    assignedLabel !== null && assignedLabel.length > MAX_LABEL_LEN ? "AI" : assignedLabel ?? "AI";

  async function handleAskClaude() {
    if (!activeProject) return;
    setLoading(true);
    setError(null);

    try {
      const ctx = {
        fieldId,
        fieldLabel: label ?? fieldId,
        projectName: activeProject.name,
        customer: activeProject.customer,
        modelName: activeProject.discovery.model.name,
        concurrentUsers: activeProject.discovery.load.concurrentUsers,
        deploymentPattern: activeProject.deploymentPattern,
      };

      const result = await llmComplete({
        system: EXPLAIN_FIELD_SYSTEM,
        messages: [{ role: "user", content: buildExplainFieldPrompt(ctx) }],
        maxTokens: 400,
        json: true,
      }, FEATURE);

      const parsed = JSON.parse(result.text) as { explain?: string; example?: string };
      if (!parsed.explain || !parsed.example) throw new Error("Unexpected response shape");

      // Use whole-object update so fieldId (which may contain dots) is stored
      // as a single key, not traversed as a nested path by setDeep.
      updateField("explainOverrides", {
        ...(activeProject.explainOverrides ?? {}),
        [fieldId]: { fieldId, explain: parsed.explain, example: parsed.example },
      });
    } catch (err) {
      if (err instanceof LlmFeatureUnassignedError) {
        setError("No model configured for this feature. Configure one in Settings.");
      } else {
        setError(err instanceof Error ? err.message : "LLM call failed");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    const next = { ...(activeProject?.explainOverrides ?? {}) };
    delete next[fieldId];
    updateField("explainOverrides", next);
    setError(null);
  }

  const bodyProps: ExplainBoxBodyProps = {
    entry,
    fieldId,
    error,
    loading,
    isOverridden,
    assignedLabel,
    displayLabel,
    hasProject: !!activeProject,
    onAskClaude: handleAskClaude,
    onReset: handleReset,
  };

  return (
    <>
      <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] p-3 text-sm">
        <div className="mb-2 flex items-center gap-1.5 font-medium text-[var(--text-secondary)]">
          <HelpCircle className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{title}</span>
          <div className="ml-auto flex items-center gap-1">
            {isOverridden && (
              <span className="text-[10px] font-normal text-[var(--accent-primary)] bg-[var(--accent-primary)]/10 px-1.5 py-0.5 rounded">
                AI
              </span>
            )}
            <button
              type="button"
              onClick={() => setMaximized(true)}
              className="p-0.5 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              aria-label="Expand explanation"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <ExplainBoxBody {...bodyProps} />
      </div>

      <Dialog open={maximized} onOpenChange={(o) => { if (!o) setMaximized(false); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5 text-base">
              <HelpCircle className="h-4 w-4 shrink-0" />
              {title}
            </DialogTitle>
          </DialogHeader>
          <div className="text-sm">
            <ExplainBoxBody {...bodyProps} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
