"use client";

import { cn } from "@/lib/utils/cn";
import { ReactNode } from "react";

interface KanbanCardProps {
  title: string;
  value?: string | number;
  subtitle?: string;
  change?: number;
  changeLabel?: string;
  icon?: ReactNode;
  color?: "cyan" | "blue" | "purple" | "green" | "amber" | "red" | "pink" | "indigo";
  barPercent?: number;
  sparkline?: number[];
  footerLeft?: string;
  footerRight?: string;
  className?: string;
  children?: ReactNode;
  variant?: "default" | "dora" | "correlation";
}

const colorClasses = {
  cyan: { text: "text-accent-cyan", bar: "bg-accent-cyan", bg: "bg-accent-cyan" },
  blue: { text: "text-accent-blue", bar: "bg-accent-blue", bg: "bg-accent-blue" },
  purple: { text: "text-accent-purple", bar: "bg-accent-purple", bg: "bg-accent-purple" },
  green: { text: "text-accent-green", bar: "bg-accent-green", bg: "bg-accent-green" },
  amber: { text: "text-accent-amber", bar: "bg-accent-amber", bg: "bg-accent-amber" },
  red: { text: "text-accent-red", bar: "bg-accent-red", bg: "bg-accent-red" },
  pink: { text: "text-accent-pink", bar: "bg-accent-pink", bg: "bg-accent-pink" },
  indigo: { text: "text-accent-indigo", bar: "bg-accent-indigo", bg: "bg-accent-indigo" },
};

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  return (
    <div className="flex items-end gap-[2px] h-6 my-2">
      {data.map((value, index) => (
        <div
          key={index}
          className={cn("flex-1 rounded-[1px] opacity-70 hover:opacity-100 transition-opacity", color)}
          style={{ height: `${(value / max) * 100}%` }}
        />
      ))}
    </div>
  );
}

export function KanbanCard({
  title,
  value,
  subtitle,
  change,
  changeLabel,
  icon,
  color = "blue",
  barPercent,
  sparkline,
  footerLeft,
  footerRight,
  className,
  children,
  variant = "default",
}: KanbanCardProps) {
  const colors = colorClasses[color];

  const baseClasses = cn(
    "bg-background-card border border-border rounded-lg p-3 cursor-pointer transition-all",
    "hover:bg-background-tertiary hover:border-border-subtle"
  );

  const variantClasses = {
    default: "",
    dora: "bg-gradient-to-br from-accent-blue/5 to-accent-purple/5 border-accent-blue/20 hover:border-accent-blue/40",
    correlation: "bg-gradient-to-br from-accent-green/5 to-accent-cyan/5 border-accent-green/20",
  };

  return (
    <div className={cn(baseClasses, variantClasses[variant], className)}>
      {/* Header */}
      {(title || value) && (
        <div className="flex items-start justify-between mb-2">
          <span className="text-[11px] font-medium text-foreground-secondary">
            {title}
          </span>
          {value !== undefined && (
            <span className={cn("text-[15px] font-bold", colors.text)}>
              {value}
            </span>
          )}
        </div>
      )}

      {/* Progress Bar */}
      {barPercent !== undefined && (
        <div className="h-1 bg-border rounded-sm overflow-hidden my-2">
          <div
            className={cn("h-full rounded-sm", colors.bar)}
            style={{ width: `${Math.min(barPercent, 100)}%` }}
          />
        </div>
      )}

      {/* Sparkline */}
      {sparkline && sparkline.length > 0 && (
        <Sparkline data={sparkline} color={colors.bar} />
      )}

      {/* Custom children */}
      {children}

      {/* Footer */}
      {(footerLeft || footerRight || change !== undefined || subtitle) && (
        <div className="flex items-center justify-between text-[10px] text-foreground-muted mt-2">
          <span>{footerLeft || subtitle}</span>
          {change !== undefined ? (
            <span
              className={cn(
                "font-medium",
                change >= 0 ? "text-accent-green" : "text-accent-red"
              )}
            >
              {change >= 0 ? "+" : ""}
              {change}%
            </span>
          ) : (
            <span>{footerRight}</span>
          )}
        </div>
      )}
    </div>
  );
}

export default KanbanCard;
