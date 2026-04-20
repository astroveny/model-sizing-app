export const dynamic = "force-dynamic";

import Link from "next/link";
import { listProjects } from "@/lib/db/projects";
import { NewProjectButton } from "@/components/NewProjectButton";
import { Cpu } from "lucide-react";

export default function HomePage() {
  const projects = listProjects();

  return (
    <div className="flex flex-col flex-1">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">ML Sizer</h1>
        <NewProjectButton />
      </header>
      <main className="flex-1 p-6">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center gap-4">
            <div className="rounded-full bg-muted p-4">
              <Cpu className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">No projects yet</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                Create a project to start sizing a ML/GenAI inference deployment.
              </p>
            </div>
            <NewProjectButton />
          </div>
        ) : (
          <ul className="grid gap-3 max-w-2xl">
            {projects.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/project/${p.id}/discovery`}
                  className="flex items-center justify-between rounded-lg border border-border px-4 py-3 hover:bg-accent transition-colors"
                >
                  <div>
                    <p className="font-medium">{p.name}</p>
                    {p.customer && (
                      <p className="text-sm text-muted-foreground">{p.customer}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(p.updatedAt).toLocaleDateString()}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
