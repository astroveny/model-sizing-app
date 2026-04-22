"use client";

import { CheckCircle2, AlertCircle, Info } from "lucide-react";
import { useProjectStore } from "@/lib/store";
import { useDiscoveryValidation } from "@/lib/hooks/useDiscoveryValidation";
import { SavedIndicator } from "@/components/discovery/SavedIndicator";
import { cn } from "@/lib/utils";

interface DiscoveryProgressBannerProps {
  onReviewDefaults?: () => void;
}

export function DiscoveryProgressBanner({ onReviewDefaults }: DiscoveryProgressBannerProps) {
  const { progressPct, filledCount, totalCount, isReadyForBuild, errors } =
    useDiscoveryValidation();
  const skippedCount = useProjectStore(
    (s) => s.activeProject?.discovery._skipped?.length ?? 0
  );

  const state: "red" | "amber" | "green" =
    !isReadyForBuild ? "red" : skippedCount > 0 ? "amber" : "green";

  return (
    <div
      className={cn(
        "px-6 py-3 border-b flex items-center gap-3",
        state === "red" && "bg-red-500/5 border-[var(--border-default)]",
        state === "amber" && "bg-amber-500/5 border-[var(--border-default)]",
        state === "green" && "bg-[var(--success)]/5 border-[var(--border-default)]"
      )}
    >
      {/* Progress bar */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {state === "red" && (
            <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
          )}
          {state === "amber" && (
            <Info className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          )}
          {state === "green" && (
            <CheckCircle2 className="h-3.5 w-3.5 text-[var(--success)] shrink-0" />
          )}
          <span
            className={cn(
              "text-xs font-medium truncate",
              state === "red" && "text-red-600 dark:text-red-400",
              state === "amber" && "text-amber-600 dark:text-amber-400",
              state === "green" && "text-[var(--success)]"
            )}
          >
            {state === "red" && errors.length > 0
              ? `${errors.length} required field${errors.length > 1 ? "s" : ""} missing — Build locked`
              : state === "amber"
              ? `Ready with ${skippedCount} default value${skippedCount > 1 ? "s" : ""} — Build unlocked`
              : "All fields filled — Build unlocked"}
          </span>
          {state === "amber" && onReviewDefaults && (
            <button
              onClick={onReviewDefaults}
              className="text-xs text-amber-600 dark:text-amber-400 underline underline-offset-2 hover:no-underline shrink-0"
            >
              Review defaults
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-[var(--border-default)] overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                state === "red" && "bg-red-500",
                state === "amber" && "bg-amber-500",
                state === "green" && "bg-[var(--success)]"
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-xs text-[var(--text-secondary)] whitespace-nowrap shrink-0">
            {filledCount} / {totalCount}
          </span>
        </div>
      </div>

      <SavedIndicator />
    </div>
  );
}
