"use client";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import pkg from "../../package.json";

interface Props {
  collapsed: boolean;
}

const sha = process.env.NEXT_PUBLIC_BUILD_SHA;
const date = process.env.NEXT_PUBLIC_BUILD_DATE;
const version = pkg.version;

const tooltipText = [
  `v${version}`,
  sha ? `build ${sha.slice(0, 7)}` : null,
  date ? `built ${date}` : null,
].filter(Boolean).join(" · ");

export function SidebarVersion({ collapsed }: Props) {
  if (collapsed) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={<span />}>
          <p className="text-[10px] text-[var(--text-secondary)] opacity-50 hover:opacity-100 transition-opacity px-3 pb-2 cursor-default select-none">
            v{version}
            {!sha && <span className="ml-1 opacity-60">(dev)</span>}
          </p>
        </TooltipTrigger>
        <TooltipContent side="right">
          {tooltipText || `v${version} · dev build`}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
