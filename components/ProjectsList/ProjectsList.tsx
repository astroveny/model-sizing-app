"use client";

import { useSearchParams } from "next/navigation";
import type { Project } from "@/lib/store";
import { ProjectCard } from "./ProjectCard";
import { ProjectsSearchFilter } from "./ProjectsSearchFilter";

const MODIFIED_DAYS: Record<string, number> = {
  "7d":  7,
  "30d": 30,
  "90d": 90,
};

function filterProjects(projects: Project[], q: string, modified: string): Project[] {
  let list = projects;

  if (q.trim()) {
    const lower = q.toLowerCase();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        (p.customer ?? "").toLowerCase().includes(lower)
    );
  }

  if (modified && modified !== "all" && MODIFIED_DAYS[modified]) {
    const cutoff = Date.now() - MODIFIED_DAYS[modified] * 86_400_000;
    list = list.filter((p) => new Date(p.updatedAt).getTime() >= cutoff);
  }

  return list;
}

interface ProjectsListProps {
  projects: Project[];
}

export function ProjectsList({ projects }: ProjectsListProps) {
  const params   = useSearchParams();
  const q        = params.get("q") ?? "";
  const modified = params.get("modified") ?? "all";

  const filtered         = filterProjects(projects, q, modified);
  const hasActiveFilters = !!(q || (modified && modified !== "all"));

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          Projects
          <span className="ml-2 text-base font-normal text-[var(--text-muted)]">
            {filtered.length}
          </span>
        </h1>
      </div>

      {/* Search + filter bar */}
      <ProjectsSearchFilter hasActiveFilters={hasActiveFilters} />

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
          {hasActiveFilters ? (
            <>
              <p className="text-[var(--text-primary)] font-medium">No projects match these filters</p>
              <p className="text-sm text-[var(--text-muted)]">Clear filters to see all projects.</p>
            </>
          ) : (
            <>
              <p className="text-[var(--text-primary)] font-medium">No projects yet</p>
              <p className="text-sm text-[var(--text-muted)] max-w-xs">
                Create a project to start sizing a ML/GenAI inference deployment.
              </p>
            </>
          )}
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((project) => (
            <li key={project.id}>
              <ProjectCard project={project} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
