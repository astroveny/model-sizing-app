import { eq } from "drizzle-orm";
import { db } from "./client";
import { projects } from "./schema";
import type { Project } from "@/lib/store";

type ProjectRow = typeof projects.$inferSelect;

function rowToProject(row: ProjectRow): Project {
  return JSON.parse(row.dataJson) as Project;
}

export function listProjects(): Project[] {
  const rows = db
    .select()
    .from(projects)
    .orderBy(projects.createdAt)
    .all();
  return rows.map(rowToProject);
}

export function getProject(id: string): Project | null {
  const row = db.select().from(projects).where(eq(projects.id, id)).get();
  if (!row) return null;
  return rowToProject(row);
}

export function createProject(project: Project): void {
  db.insert(projects)
    .values({
      id: project.id,
      name: project.name,
      description: project.description ?? null,
      customer: project.customer,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      dataJson: JSON.stringify(project),
    })
    .run();
}

export function saveProject(project: Project): void {
  db.update(projects)
    .set({
      name: project.name,
      description: project.description ?? null,
      customer: project.customer,
      updatedAt: new Date().toISOString(),
      dataJson: JSON.stringify(project),
    })
    .where(eq(projects.id, project.id))
    .run();
}

export function deleteProject(id: string): void {
  db.delete(projects).where(eq(projects.id, id)).run();
}
