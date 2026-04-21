export const dynamic = "force-dynamic";

import { listProjects } from "@/lib/db/projects";
import { ProjectsList } from "@/components/ProjectsList/ProjectsList";

export default function HomePage() {
  const projects = listProjects();

  return (
    <div className="max-w-3xl mx-auto">
      <ProjectsList projects={projects} />
    </div>
  );
}
