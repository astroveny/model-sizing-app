"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, X } from "lucide-react";
import { llmComplete } from "@/lib/llm/client";
import { EXPLAIN_SIZING_SYSTEM, buildExplainSizingPrompt } from "@/lib/llm/prompts/explain-sizing";
import type { ExplainSizingContext } from "@/lib/llm/prompts/explain-sizing";

export type { ExplainSizingContext };

type Props = {
  context: ExplainSizingContext;
};

export function ExplainSizingButton({ context }: Props) {
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExplain() {
    if (explanation) { setExplanation(null); return; }
    setLoading(true);
    setError(null);

    try {
      const result = await llmComplete({
        system: EXPLAIN_SIZING_SYSTEM,
        messages: [{ role: "user", content: buildExplainSizingPrompt(context) }],
        maxTokens: 600,
      });
      setExplanation(result.text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "LLM call failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1.5 px-2 text-xs text-[var(--text-muted)]"
        disabled={loading}
        onClick={handleExplain}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : explanation ? (
          <X className="h-3.5 w-3.5" />
        ) : (
          <Sparkles className="h-3.5 w-3.5" />
        )}
        {loading ? "Thinking…" : explanation ? "Dismiss" : "Why this choice?"}
      </Button>

      {error && (
        <p className="mt-2 text-xs text-destructive">{error}</p>
      )}

      {explanation && (
        <div className="mt-2 rounded-md border border-[var(--border-default)] bg-[var(--bg-subtle)] p-3">
          <p className="text-xs font-medium text-[var(--accent-primary)] mb-1.5 flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" />
            Claude&apos;s explanation
          </p>
          <div className="text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
            {explanation}
          </div>
        </div>
      )}
    </div>
  );
}
