"use client";

import { useEffect } from "react";
import { useProjectStore, type Project } from "@/lib/store";
import { useAutosave } from "@/lib/hooks/useAutosave";

export function ProjectHydrator({ project }: { project: Project }) {
  const loadProject = useProjectStore((s) => s.loadProject);

  useEffect(() => {
    loadProject(project);
  }, [project.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useAutosave();

  return null;
}
