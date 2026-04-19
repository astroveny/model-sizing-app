"use client";

import { useEffect, useRef } from "react";
import { useProjectStore } from "@/lib/store";
import { saveProjectAction } from "@/lib/actions/projects";

export function useAutosave() {
  const activeProject = useProjectStore((s) => s.activeProject);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Skip save on the very first render (initial load from DB)
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!activeProject) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      saveProjectAction(activeProject).catch(console.error);
    }, 500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activeProject]);
}
