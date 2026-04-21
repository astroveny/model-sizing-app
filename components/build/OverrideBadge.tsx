"use client";

import { useProjectStore } from "@/lib/store";
import { X } from "lucide-react";

type Props = {
  overrideKey: string;
  label: string;
};

/** Small badge shown next to a value that has been manually overridden. */
export function OverrideBadge({ overrideKey, label }: Props) {
  const clearOverride = useProjectStore((s) => s.clearBuildOverride);
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--warning)]/10 text-[var(--warning)] px-2 py-0.5 text-xs font-medium">
      {label} overridden
      <button
        onClick={() => clearOverride(overrideKey)}
        className="hover:opacity-70"
        aria-label={`Clear ${label} override`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

/** Strip at the top of the Build page when any overrides are active. */
export function OverrideStrip() {
  const overrides = useProjectStore((s) => s.activeProject?.build.overrides);
  const clearAll  = useProjectStore((s) => s.clearAllBuildOverrides);

  const count = Object.keys(overrides ?? {}).length;
  if (count === 0) return null;

  return (
    <div className="flex items-center justify-between rounded-lg border border-[var(--warning)]/30 bg-[var(--warning)]/5 px-4 py-2 text-sm">
      <span className="text-[var(--warning)]">
        {count} manual override{count > 1 ? "s" : ""} active — derived values are suppressed for overridden fields.
      </span>
      <button
        onClick={clearAll}
        className="text-xs font-medium text-[var(--warning)] hover:underline ml-4"
      >
        Clear all
      </button>
    </div>
  );
}
