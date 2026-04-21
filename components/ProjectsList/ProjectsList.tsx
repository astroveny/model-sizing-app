"use client";

import type { Project } from "@/lib/store";
import { ProjectCard } from "./ProjectCard";

interface ProjectsListProps {
  projects: Project[];
  /** Search/filter bar slot — injected by P7.11 */
  filterBar?: React.ReactNode;
}

export function ProjectsList({ projects, filterBar }: ProjectsListProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          Projects
          <span className="ml-2 text-base font-normal text-[var(--text-muted)]">
            {projects.length}
          </span>
        </h1>
      </div>

      {/* Search/filter bar slot */}
      {filterBar}

      {/* List */}
      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
          <p className="text-[var(--text-primary)] font-medium">No projects yet</p>
          <p className="text-sm text-[var(--text-muted)] max-w-xs">
            Create a project to start sizing a ML/GenAI inference deployment.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {projects.map((project) => (
            <li key={project.id}>
              <ProjectCard project={project} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
