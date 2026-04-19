import { notFound } from "next/navigation";
import { getProject } from "@/lib/db/projects";

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) notFound();

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-1">{project.name}</h1>
      {project.customer && (
        <p className="text-muted-foreground mb-4">{project.customer}</p>
      )}
      {project.description && (
        <p className="text-sm text-muted-foreground">{project.description}</p>
      )}
      <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Deployment pattern</span>
          <p className="font-medium mt-1">{project.deploymentPattern}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Target</span>
          <p className="font-medium mt-1">{project.deploymentTarget}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Created</span>
          <p className="font-medium mt-1">
            {new Date(project.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}
