"use client";

import { useState, useEffect } from "react";
import { Zap, X } from "lucide-react";
import { useProjectStore } from "@/lib/store";
import { useParams } from "next/navigation";

export function QuickSizingBanner({ onReviewDefaults }: { onReviewDefaults?: () => void }) {
  const { id } = useParams<{ id: string }>();
  const source = useProjectStore((s) => s.activeProject?._source);
  const skippedCount = useProjectStore(
    (s) => s.activeProject?.discovery._skipped?.length ?? 0
  );

  const storageKey = `ml-sizer:qs-banner-dismissed:${id}`;
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDismissed(sessionStorage.getItem(storageKey) === "1");
    }
  }, [storageKey]);

  if (source !== "quick-sizing" || dismissed) return null;

  function dismiss() {
    sessionStorage.setItem(storageKey, "1");
    setDismissed(true);
  }

  return (
    <div className="flex items-center gap-3 px-6 py-2.5 bg-[var(--accent-primary)]/8 border-b border-[var(--accent-primary)]/20 text-sm">
      <Zap className="h-4 w-4 text-[var(--accent-primary)] shrink-0" />
      <span className="text-[var(--text-primary)] flex-1">
        Quick Sizing applied with{" "}
        <strong>{skippedCount} defaults</strong>.{" "}
        {onReviewDefaults && (
          <button
            onClick={onReviewDefaults}
            className="underline underline-offset-2 hover:no-underline text-[var(--accent-primary)]"
          >
            Review defaults
          </button>
        )}
      </span>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
