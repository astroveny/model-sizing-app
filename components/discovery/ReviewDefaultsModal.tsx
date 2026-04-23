"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useProjectStore } from "@/lib/store";
import { DISCOVERY_DEFAULTS } from "@/lib/discovery/defaults";
import { SKIPPABLE_FIELDS } from "@/lib/discovery/field-meta";
import { Button } from "@/components/ui/button";

interface ReviewDefaultsModalProps {
  open: boolean;
  onClose: () => void;
}

const EMPTY_SKIPPED: string[] = [];

export function ReviewDefaultsModal({ open, onClose }: ReviewDefaultsModalProps) {
  const skipped = useProjectStore(
    (s) => s.activeProject?.discovery._skipped ?? EMPTY_SKIPPED
  );
  const updateField = useProjectStore((s) => s.updateField);

  const skippedFields = SKIPPABLE_FIELDS.filter((f) => skipped.includes(f));

  function override(fieldId: string) {
    // Un-skip: remove from _skipped so the field becomes editable
    const current = useProjectStore.getState().activeProject?.discovery._skipped ?? [];
    updateField("discovery._skipped", current.filter((id) => id !== fieldId));
    onClose();
  }

  function formatDefault(value: unknown): string {
    if (value === undefined || value === null) return "—";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (Array.isArray(value)) return value.length === 0 ? "None" : (value as unknown[]).join(", ");
    return String(value);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Review Default Values</DialogTitle>
        </DialogHeader>

        {skippedFields.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)] py-4 text-center">
            No fields are using defaults.
          </p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto py-2">
            {skippedFields.map((fieldId) => {
              const defaultVal = DISCOVERY_DEFAULTS[fieldId as keyof typeof DISCOVERY_DEFAULTS];
              return (
                <div
                  key={fieldId}
                  className="flex items-center justify-between gap-3 rounded-md border border-[var(--border-default)] px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[var(--text-primary)] truncate">{fieldId}</p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Default: {formatDefault(defaultVal)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => override(fieldId)}
                    className="shrink-0 text-xs"
                  >
                    Override
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
