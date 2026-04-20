"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkloadForm } from "@/components/discovery/WorkloadForm";
import { HardwareForm } from "@/components/discovery/HardwareForm";
import { InfraForm } from "@/components/discovery/InfraForm";
import { ModelPlatformForm } from "@/components/discovery/ModelPlatformForm";
import { ApplicationForm } from "@/components/discovery/ApplicationForm";
import { useDiscoveryValidation } from "@/lib/hooks/useDiscoveryValidation";
import { CheckCircle2 } from "lucide-react";

const TABS = [
  { id: "workload", label: "Workload" },
  { id: "hardware", label: "Hardware" },
  { id: "infra", label: "Infra" },
  { id: "model-platform", label: "Model Platform" },
  { id: "application", label: "Application" },
] as const;

export default function DiscoveryPage() {
  const { progressPct, filledCount, totalCount, isReadyForBuild } =
    useDiscoveryValidation();

  return (
    <div className="flex flex-col h-full">
      {/* Progress bar */}
      <div className="px-6 py-3 border-b bg-muted/30 flex items-center gap-3">
        <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {filledCount} / {totalCount} fields
        </span>
        {isReadyForBuild && (
          <span className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400 whitespace-nowrap">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Ready for Build
          </span>
        )}
      </div>

      <Tabs defaultValue="workload" className="flex flex-col flex-1 min-h-0">
        <div className="border-b px-6">
          <TabsList className="h-10 bg-transparent p-0 gap-0">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="rounded-none border-b-2 border-transparent px-4 pb-2.5 pt-2 text-sm font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="flex-1 overflow-auto">
          <TabsContent value="workload" className="m-0 h-full">
            <WorkloadForm />
          </TabsContent>
          <TabsContent value="hardware" className="m-0 h-full">
            <HardwareForm />
          </TabsContent>
          <TabsContent value="infra" className="m-0 h-full">
            <InfraForm />
          </TabsContent>
          <TabsContent value="model-platform" className="m-0 h-full">
            <ModelPlatformForm />
          </TabsContent>
          <TabsContent value="application" className="m-0 h-full">
            <ApplicationForm />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
