import { notFound } from "next/navigation";
import { getProject } from "@/lib/db/projects";
import { ProjectHydrator } from "@/components/ProjectHydrator";
import { TabBar } from "@/components/TabBar";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) notFound();

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <ProjectHydrator project={project} />
      <header className="border-b border-border px-6 py-4 flex items-center gap-3">
        <a href="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Projects
        </a>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium truncate">{project.name}</span>
        {project.customer && (
          <span className="text-sm text-muted-foreground truncate">
            — {project.customer}
          </span>
        )}
      </header>
      <TabBar projectId={id} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
