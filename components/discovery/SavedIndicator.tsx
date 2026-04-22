"use client";

import { useEffect, useState } from "react";
import { useAutosave } from "@/lib/hooks/useAutosave";
import { cn } from "@/lib/utils";

function elapsedLabel(savedAt: Date): string {
  const secs = Math.floor((Date.now() - savedAt.getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  return "1m+ ago";
}

export function SavedIndicator() {
  const { status, savedAt } = useAutosave();
  const [, tick] = useState(0);

  // Tick every second so the "Xs ago" counter updates
  useEffect(() => {
    if (status !== "saved") return;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [status]);

  if (status === "idle") return null;

  return (
    <span
      className={cn(
        "text-xs tabular-nums transition-colors duration-150",
        status === "pending" && "text-[var(--text-secondary)]",
        status === "saving"  && "text-[var(--text-secondary)]",
        status === "saved"   && "text-[var(--text-secondary)]",
        status === "error"   && "text-[var(--danger)]"
      )}
    >
      {status === "pending" && "Saving…"}
      {status === "saving"  && "Saving…"}
      {status === "saved"   && savedAt && `Saved · ${elapsedLabel(savedAt)}`}
      {status === "error"   && "Unsaved changes"}
    </span>
  );
}
