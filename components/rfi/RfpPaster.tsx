"use client";

import { useState } from "react";
import { useProjectStore } from "@/lib/store";
import { llmComplete } from "@/lib/llm/client";
import { EXTRACT_RFP_SYSTEM, buildExtractRfpPrompt } from "@/lib/llm/prompts/extract-rfp";
import type { ExtractedRequirement } from "@/lib/store";
import { Loader2 } from "lucide-react";

export function RfpPaster() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const updateField = useProjectStore((s) => s.updateField);
  const rawText = useProjectStore((s) => s.activeProject?.rfi.rawText ?? "");

  async function handleExtract() {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await llmComplete({
        system: EXTRACT_RFP_SYSTEM,
        messages: [{ role: "user", content: buildExtractRfpPrompt(text) }],
        maxTokens: 4096,
        temperature: 0.1,
      });

      const parsed = JSON.parse(result.text);
      updateField("rfi.source", "pasted");
      updateField("rfi.rawText", text);
      updateField("rfi.extracted.requirements",     parsed.requirements     ?? []);
      updateField("rfi.extracted.timelines",        parsed.timelines        ?? []);
      updateField("rfi.extracted.evaluationCriteria", parsed.evaluationCriteria ?? []);
      updateField("rfi.extracted.mandatoryItems",   parsed.mandatoryItems   ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extraction failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <textarea
        className="w-full min-h-48 rounded-lg border bg-background px-3 py-2 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-ring"
        placeholder="Paste RFP or RFI text here…"
        value={text || rawText}
        onChange={(e) => setText(e.target.value)}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button
        onClick={handleExtract}
        disabled={loading || !text.trim()}
        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading ? "Extracting…" : "Extract Requirements"}
      </button>
    </div>
  );
}
