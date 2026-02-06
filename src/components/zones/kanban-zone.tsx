"use client";

import { cn } from "@/lib/utils/cn";
import { ReactNode } from "react";

interface KanbanZoneProps {
  children: ReactNode;
  className?: string;
}

export function KanbanZone({ children, className }: KanbanZoneProps) {
  return (
    <div
      className={cn(
        "zone-kanban flex-1 flex gap-3 p-4 overflow-x-auto min-h-0",
        className
      )}
    >
      {children}
    </div>
  );
}

export default KanbanZone;
