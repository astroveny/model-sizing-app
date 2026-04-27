import Link from "next/link";
import { ChevronRight, Cpu, Server, BookOpen, BarChart2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listGpus, listServers, listLlmModels, listWorkloadReferences } from "@/lib/catalogs/index";

export const dynamic = "force-dynamic";

function counts(rows: { isDeprecated: boolean }[]) {
  const total = rows.length;
  const active = rows.filter((r) => !r.isDeprecated).length;
  const deprecated = total - active;
  return { active, deprecated };
}

const SECTIONS = [
  {
    title: "GPUs",
    description: "GPU hardware specs — VRAM, bandwidth, TFLOPS, pricing.",
    href: "/settings/catalogs/gpus",
    Icon: Cpu,
    color: "text-green-500",
  },
  {
    title: "Servers",
    description: "Server chassis with GPU configs, rack units, and TDP.",
    href: "/settings/catalogs/servers",
    Icon: Server,
    color: "text-blue-500",
  },
  {
    title: "LLM Models",
    description: "Model architectures — params, layers, KV heads, head dim.",
    href: "/settings/catalogs/llm-models",
    Icon: BookOpen,
    color: "text-purple-500",
  },
  {
    title: "Workload References",
    description: "Reference workloads used in sizing recommendations.",
    href: "/settings/catalogs/workload-references",
    Icon: BarChart2,
    color: "text-orange-500",
  },
];

export default function CatalogsIndexPage() {
  const gpuCounts = counts(listGpus(true));
  const serverCounts = counts(listServers(true));
  const modelCounts = counts(listLlmModels(true));
  const refCounts = counts(listWorkloadReferences(true));

  const allCounts = [gpuCounts, serverCounts, modelCounts, refCounts];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-semibold">Catalogs</h2>
        <p className="text-[var(--text-secondary)] mt-1 text-sm">
          Manage hardware and model catalog entries. Seed rows can be edited or deprecated but not deleted.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SECTIONS.map(({ title, description, href, Icon, color }, i) => {
          const { active, deprecated } = allCounts[i];
          return (
            <Link key={href} href={href} className="group block">
              <Card className="h-full transition-colors hover:border-[var(--accent-primary)]">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span className="flex items-center gap-2">
                      <Icon className={`h-5 w-5 ${color}`} />
                      {title}
                    </span>
                    <ChevronRight className="h-4 w-4 text-[var(--text-secondary)] group-hover:text-[var(--accent-primary)] transition-colors" />
                  </CardTitle>
                  <CardDescription className="text-xs">{description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-3 text-sm">
                    <span className="font-medium">{active} active</span>
                    {deprecated > 0 && (
                      <span className="text-[var(--text-secondary)] text-xs">{deprecated} deprecated</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
