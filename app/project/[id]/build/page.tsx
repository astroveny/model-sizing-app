"use client";

import { useDiscoveryValidation } from "@/lib/hooks/useDiscoveryValidation";
import { useBuildDerived } from "@/lib/hooks/useBuildDerived";
import { useProjectStore } from "@/lib/store";
import { AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { SummaryTotals }       from "@/components/build/SummaryTotals";
import { HardwarePanel }       from "@/components/build/HardwarePanel";
import { InfraPanel }          from "@/components/build/InfraPanel";
import { ModelPlatformPanel }  from "@/components/build/ModelPlatformPanel";
import { ApplicationPanel }    from "@/components/build/ApplicationPanel";
import { VendorComparison }    from "@/components/build/VendorComparison";
import { EngineNotes }         from "@/components/build/EngineNotes";
import { OverrideStrip }       from "@/components/build/OverrideBadge";
import { RackLayout }          from "@/components/build/diagrams/RackLayout";
import { ArchitectureDiagram } from "@/components/build/diagrams/ArchitectureDiagram";

export default function BuildPage() {
  const { id } = useParams<{ id: string }>();
  const { isReadyForBuild, errors } = useDiscoveryValidation();
  const preferredVendor = useProjectStore((s) => s.activeProject?.discovery.hardware.preferredVendor);
  const result = useBuildDerived();

  if (!isReadyForBuild) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center gap-4">
        <div className="rounded-full bg-amber-100 dark:bg-amber-900/30 p-3">
          <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-semibold">Complete Discovery first</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            The following required fields need values before the sizing engine can run.
          </p>
        </div>
        <ul className="text-sm text-left space-y-1 text-muted-foreground">
          {errors.map((e, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
              {e}
            </li>
          ))}
        </ul>
        <Link
          href={`/project/${id}/discovery`}
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Go to Discovery
        </Link>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        Computing sizing…
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <OverrideStrip />
      {/* Summary totals bar */}
      <SummaryTotals result={result} />

      {/* Four layer panels */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ModelPlatformPanel result={result} />
        <HardwarePanel      result={result} />
        <InfraPanel         result={result} />
        <ApplicationPanel   result={result} />
      </div>

      {/* Vendor comparison — only when user chose "either" */}
      {preferredVendor === "either" && (
        <VendorComparison baseInput={result.input} />
      )}

      {/* Diagrams */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ArchitectureDiagram result={result} />
        <RackLayout          result={result} />
      </div>

      {/* Engine notes */}
      <EngineNotes notes={result.notes} defaultOpen={result.notes.some((n) => n.startsWith("[WARNING]"))} />
    </div>
  );
}
