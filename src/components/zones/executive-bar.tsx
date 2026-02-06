"use client";

import { cn } from "@/lib/utils/cn";
import { DoraMiniCard } from "@/components/dora/dora-mini-card";

interface ExecMetric {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  color: "green" | "cyan" | "amber" | "blue" | "purple" | "red";
  icon?: string;
}

interface DoraMetric {
  label: string;
  value: string;
  trend: "up" | "down" | "neutral";
  rating: "elite" | "high" | "medium" | "low";
}

interface ExecutiveBarProps {
  metrics: ExecMetric[];
  doraMetrics?: DoraMetric[];
  isLive?: boolean;
  lastUpdated?: string;
  period?: string;
  className?: string;
}

const colorClasses = {
  green: "bg-accent-green/15 text-accent-green",
  cyan: "bg-accent-cyan/15 text-accent-cyan",
  amber: "bg-accent-amber/15 text-accent-amber",
  blue: "bg-accent-blue/15 text-accent-blue",
  purple: "bg-accent-purple/15 text-accent-purple",
  red: "bg-accent-red/15 text-accent-red",
};

const valueColorClasses = {
  green: "text-accent-green",
  cyan: "text-accent-cyan",
  amber: "text-accent-amber",
  blue: "text-accent-blue",
  purple: "text-accent-purple",
  red: "text-accent-red",
};

export function ExecutiveBar({
  metrics,
  doraMetrics,
  isLive = true,
  lastUpdated,
  period = "Last 30 days",
  className,
}: ExecutiveBarProps) {
  return (
    <div
      className={cn(
        "zone-executive flex items-center justify-between px-5 py-3",
        className
      )}
    >
      {/* Left section: Logo + Metrics */}
      <div className="flex items-center gap-6">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-accent-blue to-accent-purple" />
          <span className="font-semibold text-sm text-foreground">
            DevMetrics
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-border" />

        {/* Executive Metrics */}
        <div className="flex gap-4">
          {metrics.map((metric, index) => (
            <div key={index} className="exec-metric">
              <div
                className={cn(
                  "w-8 h-8 rounded-md flex items-center justify-center text-sm",
                  colorClasses[metric.color]
                )}
              >
                {metric.icon || "📊"}
              </div>
              <div className="flex flex-col">
                <div className="flex items-baseline gap-1">
                  <span
                    className={cn(
                      "text-lg font-bold leading-tight",
                      valueColorClasses[metric.color]
                    )}
                  >
                    {metric.value}
                  </span>
                  {metric.change !== undefined && (
                    <span
                      className={cn(
                        "text-[10px] font-medium",
                        metric.change >= 0 ? "text-accent-green" : "text-accent-red"
                      )}
                    >
                      {metric.change >= 0 ? "+" : ""}
                      {metric.change}%
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-foreground-muted uppercase tracking-wide">
                  {metric.label}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* DORA Summary Section */}
        {doraMetrics && doraMetrics.length > 0 && (
          <>
            <div className="w-px h-8 bg-border" />
            <div className="flex gap-4">
              {doraMetrics.map((dora, index) => (
                <DoraMiniCard key={index} {...dora} compact />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Right section: Live indicator + Period */}
      <div className="flex items-center gap-3 text-xs text-foreground-muted">
        {isLive && (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-accent-green live-pulse" />
            <span>Live</span>
            <span className="text-border">|</span>
          </>
        )}
        <span>{period}</span>
        {lastUpdated && (
          <>
            <span className="text-border">|</span>
            <span suppressHydrationWarning>Updated {lastUpdated}</span>
          </>
        )}
      </div>
    </div>
  );
}

// Default export for convenience
export default ExecutiveBar;
