"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { HelpCircle, Sparkles, AlertTriangle, Link2, Loader2, RotateCcw } from "lucide-react";
import { getExplainEntry } from "@/lib/explain/loader";
import { useProjectStore } from "@/lib/store";
import { llmComplete } from "@/lib/llm/client";
import { EXPLAIN_FIELD_SYSTEM, buildExplainFieldPrompt } from "@/lib/llm/prompts/explain-field";

type Props = {
  fieldId: string;
  /** Optional inline label shown in the header if no title is in the catalog */
  label?: string;
};

export function ExplainBox({ fieldId, label }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { activeProject, updateField } = useProjectStore((s) => ({
    activeProject: s.activeProject,
    updateField: s.updateField,
  }));

  const explainOverrides = activeProject?.explainOverrides;
  const entry = getExplainEntry(fieldId, explainOverrides);
  const isOverridden = !!explainOverrides?.[fieldId];

  const title = entry?.title ?? label ?? fieldId;

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
      });

      const parsed = JSON.parse(result.text) as { explain?: string; example?: string };
      if (!parsed.explain || !parsed.example) throw new Error("Unexpected response shape");

      updateField(`explainOverrides.${fieldId}`, {
        fieldId,
        explain: parsed.explain,
        example: parsed.example,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "LLM call failed");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    updateField(`explainOverrides.${fieldId}`, undefined);
    setError(null);
  }

  return (
    <div className="rounded-lg border bg-muted/40 p-3 text-sm">
      <div className="mb-2 flex items-center gap-1.5 font-medium text-muted-foreground">
        <HelpCircle className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{title}</span>
        {isOverridden && (
          <span className="ml-auto text-[10px] font-normal text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded">
            AI
          </span>
        )}
      </div>

      {entry ? (
        <Tabs defaultValue="explain">
          <TabsList className="h-7 mb-2">
            <TabsTrigger value="explain" className="text-xs h-6 px-2">
              Explain
            </TabsTrigger>
            <TabsTrigger value="example" className="text-xs h-6 px-2">
              Example
            </TabsTrigger>
          </TabsList>

          <TabsContent value="explain" className="mt-0 space-y-2">
            <p className="text-xs leading-relaxed text-foreground/80">
              {entry.explain}
            </p>

            {entry.customerFriendlyHint && (
              <p className="text-xs italic text-muted-foreground border-l-2 border-primary/30 pl-2">
                {entry.customerFriendlyHint}
              </p>
            )}

            {entry.commonMistakes && entry.commonMistakes.length > 0 && (
              <div className="space-y-0.5">
                <p className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-3 w-3" />
                  Common mistakes
                </p>
                <ul className="list-disc list-inside space-y-0.5">
                  {entry.commonMistakes.map((m, i) => (
                    <li key={i} className="text-xs text-muted-foreground">
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {entry.relatedFields && entry.relatedFields.length > 0 && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Link2 className="h-3 w-3 shrink-0" />
                See also:{" "}
                <span className="font-mono">
                  {entry.relatedFields.join(", ")}
                </span>
              </p>
            )}
          </TabsContent>

          <TabsContent value="example" className="mt-0">
            <p className="text-xs leading-relaxed text-foreground/80">
              {entry.example}
            </p>
          </TabsContent>
        </Tabs>
      ) : (
        <p className="text-xs text-muted-foreground italic">
          No explanation yet —{" "}
          <span className="font-mono text-[10px]">{fieldId}</span>
        </p>
      )}

      {error && (
        <p className="mt-2 text-xs text-destructive">{error}</p>
      )}

      <div className="mt-2 border-t pt-2 flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 gap-1.5 px-2 text-xs text-muted-foreground"
          disabled={loading || !activeProject}
          onClick={handleAskClaude}
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3" />
          )}
          {loading ? "Asking Claude…" : "Ask Claude"}
        </Button>

        {isOverridden && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 gap-1.5 px-2 text-xs text-muted-foreground"
            onClick={handleReset}
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </Button>
        )}
      </div>
    </div>
  );
}
