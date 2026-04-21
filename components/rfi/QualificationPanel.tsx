"use client";

import { useMemo } from "react";
import { useProjectStore } from "@/lib/store";
import { computeQualification } from "@/lib/sizing/qualification";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

const WIN_COLOR = {
  high:   "text-[var(--success)]",
  medium: "text-[var(--warning)]",
  low:    "text-[var(--danger)]",
};

export function QualificationPanel() {
  const discovery     = useProjectStore((s) => s.activeProject?.discovery);
  const requirements  = useProjectStore((s) => s.activeProject?.rfi.extracted.requirements ?? []);
  const goNoGo        = useProjectStore((s) => s.activeProject?.rfi.qualification.goNoGo);
  const updateField   = useProjectStore((s) => s.updateField);

  const qual = useMemo(() => {
    if (!discovery) return null;
    return computeQualification(discovery, requirements);
  }, [discovery, requirements]);

  if (!qual) return null;

  const WinIcon = qual.winProbability === "high" ? TrendingUp
    : qual.winProbability === "medium" ? Minus
    : TrendingDown;

  return (
    <div className="rounded-lg border">
      <div className="px-4 py-3 border-b border-[var(--border-default)] bg-[var(--bg-subtle)] flex items-center justify-between">
        <h3 className="text-sm font-semibold">Qualification</h3>
        <span className={cn("flex items-center gap-1 text-sm font-semibold", WIN_COLOR[qual.winProbability])}>
          <WinIcon className="h-4 w-4" />
          {qual.winProbability.toUpperCase()} win probability
        </span>
      </div>

      <div className="px-4 py-3 space-y-4">
        {/* Fit score */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[var(--text-muted)]">Fit score</span>
            <span className="text-sm font-semibold tabular-nums">{qual.fitScore}/100</span>
          </div>
          <div className="h-2 rounded-full bg-[var(--bg-subtle)] overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all",
                qual.fitScore >= 75 ? "bg-[var(--success)]" : qual.fitScore >= 50 ? "bg-[var(--warning)]" : "bg-[var(--danger)]"
              )}
              style={{ width: `${qual.fitScore}%` }}
            />
          </div>
        </div>

        {/* Strengths */}
        {qual.strengths.length > 0 && (
          <div>
            <p className="text-xs font-medium text-[var(--success)] mb-1">Strengths</p>
            <ul className="space-y-1">
              {qual.strengths.map((s, i) => (
                <li key={i} className="text-xs text-[var(--text-muted)] flex gap-1.5">
                  <span className="text-[var(--success)] shrink-0">✓</span>{s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Risks */}
        {qual.risks.length > 0 && (
          <div>
            <p className="text-xs font-medium text-[var(--warning)] mb-1">Risks</p>
            <ul className="space-y-1">
              {qual.risks.map((r, i) => (
                <li key={i} className="text-xs text-[var(--text-muted)] flex gap-1.5">
                  <span className="text-[var(--warning)] shrink-0">⚠</span>{r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Go / No-go toggle */}
        <div className="flex gap-2 pt-1">
          {(["go", "no-go", "undecided"] as const).map((v) => (
            <button
              key={v}
              onClick={() => updateField("rfi.qualification.goNoGo", v)}
              className={cn(
                "flex-1 rounded-md border py-1.5 text-xs font-medium transition-colors",
                goNoGo === v
                  ? v === "go"    ? "bg-[var(--success)] text-white border-[var(--success)]"
                  : v === "no-go" ? "bg-[var(--danger)] text-white border-[var(--danger)]"
                  : "bg-[var(--bg-subtle)] text-[var(--text-primary)]"
                  : "hover:bg-[var(--bg-subtle)]"
              )}
            >
              {v === "go" ? "Go" : v === "no-go" ? "No-Go" : "Undecided"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
