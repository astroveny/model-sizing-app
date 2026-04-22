"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkloadForm } from "@/components/discovery/WorkloadForm";
import { HardwareForm } from "@/components/discovery/HardwareForm";
import { InfraForm } from "@/components/discovery/InfraForm";
import { ModelPlatformForm } from "@/components/discovery/ModelPlatformForm";
import { ApplicationForm } from "@/components/discovery/ApplicationForm";
import { DiscoveryProgressBanner } from "@/components/discovery/DiscoveryProgressBanner";
import { ReviewDefaultsModal } from "@/components/discovery/ReviewDefaultsModal";
import { QuickSizingBanner } from "@/components/discovery/QuickSizingBanner";

const TABS = [
  { id: "workload", label: "Workload" },
  { id: "hardware", label: "Hardware" },
  { id: "infra", label: "Infra" },
  { id: "model-platform", label: "Model Platform" },
  { id: "application", label: "Application" },
] as const;

export default function DiscoveryPage() {
  const [reviewOpen, setReviewOpen] = useState(false);

  return (
    <div className="flex flex-col h-full">
      <QuickSizingBanner onReviewDefaults={() => setReviewOpen(true)} />
      <DiscoveryProgressBanner onReviewDefaults={() => setReviewOpen(true)} />
      <ReviewDefaultsModal open={reviewOpen} onClose={() => setReviewOpen(false)} />

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
