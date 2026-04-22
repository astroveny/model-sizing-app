"use client";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useProjectStore } from "@/lib/store";
import { DISCOVERY_DEFAULTS } from "@/lib/discovery/defaults";
import type { DiscoveryDefaultKey } from "@/lib/discovery/defaults";

interface SkippableFieldProps {
  fieldId: DiscoveryDefaultKey;
  children: React.ReactNode;
}

/** Wraps a skippable Discovery field with a "Use default" toggle. */
export function SkippableField({ fieldId, children }: SkippableFieldProps) {
  const skipped = useProjectStore(
    (s) => s.activeProject?.discovery._skipped?.includes(fieldId) ?? false
  );
  const updateField = useProjectStore((s) => s.updateField);

  const defaultValue = DISCOVERY_DEFAULTS[fieldId];
  const defaultLabel =
    typeof defaultValue === "boolean"
      ? defaultValue ? "Yes" : "No"
      : Array.isArray(defaultValue)
      ? defaultValue.length === 0 ? "None" : (defaultValue as unknown[]).join(", ")
      : defaultValue === undefined || defaultValue === null
      ? "—"
      : String(defaultValue);

  function toggle(checked: boolean) {
    const current: string[] =
      useProjectStore.getState().activeProject?.discovery._skipped ?? [];
    const next = checked
      ? [...current.filter((id) => id !== fieldId), fieldId]
      : current.filter((id) => id !== fieldId);
    updateField("discovery._skipped", next);
    if (checked) {
      updateField(`discovery.${fieldId}`, defaultValue);
    }
  }

  return (
    <div className="space-y-1.5">
      {skipped ? (
        <div className="flex items-center justify-between rounded-md border border-[var(--border-muted)] bg-[var(--bg-subtle)] px-3 py-2 text-sm text-[var(--text-secondary)]">
          <span>Using default: <strong className="text-[var(--text-primary)]">{defaultLabel}</strong></span>
          <div className="flex items-center gap-2 ml-4 shrink-0">
            <Label htmlFor={`skip-${fieldId}`} className="text-xs cursor-pointer">Use default</Label>
            <Switch
              id={`skip-${fieldId}`}
              checked={skipped}
              onCheckedChange={toggle}
            />
          </div>
        </div>
      ) : (
        <div className="relative">
          {children}
          <div className="flex items-center gap-1.5 mt-1.5">
            <Switch
              id={`skip-${fieldId}`}
              checked={false}
              onCheckedChange={toggle}
              className="scale-75 origin-left"
            />
            <Label
              htmlFor={`skip-${fieldId}`}
              className="text-xs text-[var(--text-secondary)] cursor-pointer"
            >
              Use default: {defaultLabel}
            </Label>
          </div>
        </div>
      )}
    </div>
  );
}
