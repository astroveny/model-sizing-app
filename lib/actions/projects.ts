"use server";

import {
  listProjects,
  getProject,
  createProject,
  saveProject,
  deleteProject,
} from "@/lib/db/projects";
import type { Project } from "@/lib/store";

export async function listProjectsAction(): Promise<Project[]> {
  return listProjects();
}

export async function getProjectAction(id: string): Promise<Project | null> {
  return getProject(id);
}

export async function createProjectAction(project: Project): Promise<void> {
  createProject(project);
}

export async function saveProjectAction(project: Project): Promise<void> {
  saveProject(project);
}

export async function deleteProjectAction(id: string): Promise<void> {
  deleteProject(id);
}
