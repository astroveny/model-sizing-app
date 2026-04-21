"use client";

import { useEffect, useRef, useState } from "react";
import { useProjectStore } from "@/lib/store";
import { saveProjectAction } from "@/lib/actions/projects";

export type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

export interface AutosaveState {
  status: SaveStatus;
  savedAt: Date | null;
}

export function useAutosave(): AutosaveState {
  const activeProject = useProjectStore((s) => s.activeProject);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  const [status, setStatus] = useState<SaveStatus>("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!activeProject) return;

    setStatus("pending");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setStatus("saving");
      saveProjectAction(activeProject)
        .then(() => {
          setSavedAt(new Date());
          setStatus("saved");
        })
        .catch(() => {
          setStatus("error");
        });
    }, 500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activeProject]);

  return { status, savedAt };
}
