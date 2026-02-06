"use client";

import { cn } from "@/lib/utils/cn";
import { ReactNode } from "react";

interface KanbanColumnProps {
  title: string;
  icon?: ReactNode;
  headerCount?: string;
  summaryValue?: string | number;
  summaryMeta?: string;
  summaryColor?: "cyan" | "blue" | "purple" | "green" | "amber" | "red" | "pink" | "indigo";
  footerLeft?: string;
  footerRight?: string;
  color?: "cyan" | "blue" | "purple" | "green" | "amber" | "red" | "pink" | "indigo";
  wide?: boolean;
  children: ReactNode;
  className?: string;
}

const dotColors = {
  cyan: "bg-accent-cyan",
  blue: "bg-accent-blue",
  purple: "bg-accent-purple",
  green: "bg-accent-green",
  amber: "bg-accent-amber",
  red: "bg-accent-red",
  pink: "bg-accent-pink",
  indigo: "bg-accent-indigo",
};

const textColors = {
  cyan: "text-accent-cyan",
  blue: "text-accent-blue",
  purple: "text-accent-purple",
  green: "text-accent-green",
  amber: "text-accent-amber",
  red: "text-accent-red",
  pink: "text-accent-pink",
  indigo: "text-accent-indigo",
};

export function KanbanColumn({
  title,
  icon,
  headerCount,
  summaryValue,
  summaryMeta,
  summaryColor = "blue",
  footerLeft,
  footerRight,
  color = "blue",
  wide = false,
  children,
  className,
}: KanbanColumnProps) {
  return (
    <div
      className={cn(
        "flex flex-col bg-zone-column border border-border rounded-[10px]",
        wide ? "flex-[0_0_320px]" : "flex-[0_0_260px]",
        "max-h-[calc(100vh-200px)]",
        className
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className={cn("w-2 h-2 rounded-full", dotColors[color])} />
          {icon && <span className="text-sm">{icon}</span>}
          <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider">
            {title}
          </span>
        </div>
        {headerCount && (
          <span className="text-[10px] text-foreground-muted bg-background-card px-2 py-0.5 rounded-full">
            {headerCount}
          </span>
        )}
      </div>

      {/* Column Summary */}
      {summaryValue !== undefined && (
        <div className="px-4 py-3 border-b border-border bg-white/[0.01]">
          <div className={cn("text-[28px] font-bold leading-tight", textColors[summaryColor])}>
            {summaryValue}
          </div>
          {summaryMeta && (
            <div className="text-[11px] text-foreground-muted mt-0.5">
              {summaryMeta}
            </div>
          )}
        </div>
      )}

      {/* Column Content */}
      <div className="flex-1 flex flex-col gap-2 p-2.5 overflow-y-auto">
        {children}
      </div>

      {/* Column Footer */}
      {(footerLeft || footerRight) && (
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-border text-[10px] text-foreground-muted">
          <span>{footerLeft}</span>
          <span>{footerRight}</span>
        </div>
      )}
    </div>
  );
}

export default KanbanColumn;
