"use client";

import { useState } from "react";
import { useProjectStore } from "@/lib/store";
import { useBuildDerived } from "@/lib/hooks/useBuildDerived";
import { llmComplete, LlmFeatureUnassignedError } from "@/lib/llm/client";
import { DRAFT_RESPONSE_SYSTEM, buildDraftResponsePrompt } from "@/lib/llm/prompts/draft-response";
import { Loader2, Copy, Check } from "lucide-react";
import { useCatalog } from "@/lib/catalogs/client";

export function DraftResponse() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const projectName    = useProjectStore((s) => s.activeProject?.name ?? "Unnamed Project");
  const requirements   = useProjectStore((s) => s.activeProject?.rfi.extracted.requirements ?? []);
  const rawText        = useProjectStore((s) => s.activeProject?.rfi.rawText ?? "");
  const draftResponse  = useProjectStore((s) => s.activeProject?.rfi.draftResponse);
  const deployPattern  = useProjectStore((s) => s.activeProject?.deploymentPattern ?? "internal-inference");
  const updateField    = useProjectStore((s) => s.updateField);
  const result         = useBuildDerived();
  const catalog        = useCatalog();

  async function generate() {
    if (!result) return;
    setLoading(true);
    setError(null);

    try {
      const { input, capacity, optimizations } = result;
      const server = catalog?.getBestServer(input.gpu.id);
      const endToEndMs = optimizations.adjustedTtftMs + optimizations.adjustedItlMs * input.avgOutputTokens;

      const ctx = {
        rfpSummary: rawText.slice(0, 2000),
        requirements: requirements.map((r) => ({ text: r.text, layer: r.layer, mandatory: r.mandatory })),
        projectName,
        hardware: `${capacity.totalGpus}× ${input.gpu.model} in ${server?.model ?? "best-match servers"}`,
        inferenceServer: useProjectStore.getState().activeProject?.discovery.modelPlatform.inferenceServer ?? "vLLM",
        replicas: capacity.replicas,
        totalGpus: capacity.totalGpus,
        ttftMs: optimizations.adjustedTtftMs,
        endToEndMs,
        deploymentPattern: deployPattern,
      };

      const llmResult = await llmComplete({
        system: DRAFT_RESPONSE_SYSTEM,
        messages: [{ role: "user", content: buildDraftResponsePrompt(ctx) }],
        maxTokens: 8192,
        temperature: 0.4,
      }, "rfi-draft-response");

      updateField("rfi.draftResponse", llmResult.text);
    } catch (err) {
      if (err instanceof LlmFeatureUnassignedError) {
        setError("No model configured for draft response. Go to Settings to assign one.");
      } else {
        setError(err instanceof Error ? err.message : "Generation failed");
      }
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!draftResponse) return;
    await navigator.clipboard.writeText(draftResponse);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <button
          onClick={generate}
          disabled={loading || !result}
          className="inline-flex items-center gap-2 rounded-md bg-[var(--accent-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? "Generating…" : draftResponse ? "Regenerate" : "Generate Draft Response"}
        </button>
        {!result && <p className="text-xs text-[var(--text-secondary)]">Complete Discovery first to generate a response.</p>}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {draftResponse && (
        <div className="relative rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)]">
          <button
            onClick={copy}
            className="absolute top-2 right-2 flex items-center gap-1 rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-2 py-1 text-xs hover:bg-[var(--bg-subtle)]"
          >
            {copied ? <Check className="h-3 w-3 text-[var(--success)]" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
          <pre className="whitespace-pre-wrap text-sm p-4 pr-16 font-sans leading-relaxed max-h-[600px] overflow-y-auto">
            {draftResponse}
          </pre>
        </div>
      )}
    </div>
  );
}
