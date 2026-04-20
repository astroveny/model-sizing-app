"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Info, AlertTriangle, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

type Note = string; // "[INFO] ..." | "[WARNING] ..." | "[RECOMMENDATION] ..."

function parseNote(note: Note): { category: "info" | "warning" | "recommendation"; message: string } {
  if (note.startsWith("[WARNING]"))        return { category: "warning",        message: note.replace("[WARNING] ", "") };
  if (note.startsWith("[RECOMMENDATION]")) return { category: "recommendation", message: note.replace("[RECOMMENDATION] ", "") };
  return { category: "info", message: note.replace("[INFO] ", "") };
}

const ICON = {
  info:           <Info       className="h-3.5 w-3.5 text-blue-500  shrink-0 mt-0.5" />,
  warning:        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />,
  recommendation: <Lightbulb  className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />,
};

type Props = { notes: string[]; defaultOpen?: boolean };

export function EngineNotes({ notes, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  if (notes.length === 0) return null;

  const warnings = notes.filter((n) => n.startsWith("[WARNING]")).length;

  return (
    <div className="rounded-lg border">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
      >
        <span className="flex items-center gap-2">
          Engine notes
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs tabular-nums">{notes.length}</span>
          {warnings > 0 && (
            <span className="rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 text-xs">
              {warnings} warning{warnings > 1 ? "s" : ""}
            </span>
          )}
        </span>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <ul className="border-t divide-y">
          {notes.map((note, i) => {
            const { category, message } = parseNote(note);
            return (
              <li key={i} className={cn("flex gap-2 px-4 py-2.5 text-xs",
                category === "warning"        && "bg-amber-50/50 dark:bg-amber-950/20",
                category === "recommendation" && "bg-emerald-50/50 dark:bg-emerald-950/20",
              )}>
                {ICON[category]}
                <span className="text-muted-foreground leading-relaxed">{message}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
