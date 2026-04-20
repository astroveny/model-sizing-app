"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TABS = [
  { id: "workload", label: "Workload" },
  { id: "hardware", label: "Hardware" },
  { id: "infra", label: "Infra" },
  { id: "model-platform", label: "Model Platform" },
  { id: "application", label: "Application" },
] as const;

export default function DiscoveryPage() {
  return (
    <div className="flex flex-col h-full">
      <Tabs defaultValue="workload" className="flex flex-col h-full">
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
            <TabShell label="Workload" />
          </TabsContent>
          <TabsContent value="hardware" className="m-0 h-full">
            <TabShell label="Hardware" />
          </TabsContent>
          <TabsContent value="infra" className="m-0 h-full">
            <TabShell label="Infra" />
          </TabsContent>
          <TabsContent value="model-platform" className="m-0 h-full">
            <TabShell label="Model Platform" />
          </TabsContent>
          <TabsContent value="application" className="m-0 h-full">
            <TabShell label="Application" />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function TabShell({ label }: { label: string }) {
  return (
    <div className="p-6 text-sm text-muted-foreground">
      <p className="font-medium text-foreground mb-1">{label}</p>
      <p>Form coming in Phase 1.</p>
    </div>
  );
}
