"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { defaultProject } from "@/lib/store";
import { createProjectAction } from "@/lib/actions/projects";

interface SidebarNewProjectButtonProps {
  collapsed: boolean;
}

export function SidebarNewProjectButton({ collapsed }: SidebarNewProjectButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [customer, setCustomer] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!name.trim()) return;
    setSaving(true);
    const project = defaultProject(uuidv4(), name.trim());
    project.customer = customer.trim();
    await createProjectAction(project);
    setOpen(false);
    setName("");
    setCustomer("");
    setSaving(false);
    router.push(`/project/${project.id}/discovery`);
  }

  const trigger = (
    <button
      onClick={() => setOpen(true)}
      className={cn(
        "flex items-center gap-3 w-full rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150",
        "bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)]",
        collapsed && "justify-center px-2"
      )}
      aria-label="New Project"
    >
      <Plus className="h-5 w-5 shrink-0" />
      {!collapsed && <span className="truncate">New Project</span>}
    </button>
  );

  return (
    <>
      {collapsed ? (
        <TooltipProvider delay={200}>
          <Tooltip>
            <TooltipTrigger render={<div />}>{trigger}</TooltipTrigger>
            <TooltipContent side="right">New Project</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        trigger
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="sidebar-proj-name">Project name *</Label>
              <Input
                id="sidebar-proj-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Llama 70B — Acme Corp"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="sidebar-proj-customer">Customer</Label>
              <Input
                id="sidebar-proj-customer"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="e.g. Acme Corp"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!name.trim() || saving}>
              {saving ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
