export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getProject } from "@/lib/db/projects";
import { ProjectHydrator } from "@/components/ProjectHydrator";

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
    <>
      <ProjectHydrator project={project} />
      {children}
    </>
  );
}
