"use client";

import { useProjectStore } from "@/lib/store";
import { RfpPaster }          from "@/components/rfi/RfpPaster";
import { RfpUploader }        from "@/components/rfi/RfpUploader";
import { RequirementsList }   from "@/components/rfi/RequirementsList";
import { QualificationPanel } from "@/components/rfi/QualificationPanel";
import { DraftResponse }      from "@/components/rfi/DraftResponse";
import { FileText, ClipboardList, CheckSquare, FileEdit } from "lucide-react";

export default function RfiPage() {
  const requirements = useProjectStore((s) => s.activeProject?.rfi.extracted.requirements ?? []);
  const hasRequirements = requirements.length > 0;

  return (
    <div className="p-6 space-y-8 max-w-4xl">
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">1 · Input RFP</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Paste text</p>
            <RfpPaster />
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Upload file</p>
            <RfpUploader />
          </div>
        </div>
      </section>
      {hasRequirements && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">2 · Extracted Requirements</h2>
          </div>
          <RequirementsList />
        </section>
      )}
      {hasRequirements && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">3 · Qualification</h2>
          </div>
          <QualificationPanel />
        </section>
      )}
      {hasRequirements && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <FileEdit className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">4 · Draft Response</h2>
          </div>
          <DraftResponse />
        </section>
      )}
      {!hasRequirements && (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 p-16 text-center gap-3">
          <FileText className="h-10 w-10 text-muted-foreground/40" />
          <div>
            <p className="text-sm font-medium">No RFP loaded yet</p>
            <p className="text-xs text-muted-foreground mt-1">Paste or upload an RFP above to extract requirements automatically.</p>
          </div>
        </div>
      )}
    </div>
  );
}
