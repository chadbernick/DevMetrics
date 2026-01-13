"use client";

import { useState, useRef, useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils/cn";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, LucideIcon, Info } from "lucide-react";
import { formatNumber, formatCurrency, formatPercentage, formatDuration, formatTokens } from "@/lib/utils/format";

interface MetricCardProps {
  title: string;
  value: number;
  format?: "number" | "currency" | "percentage" | "duration" | "tokens";
  change?: number;
  changePeriod?: string;
  icon?: LucideIcon;
  color?: "cyan" | "purple" | "pink" | "green" | "yellow" | "red";
  size?: "sm" | "md" | "lg";
  tooltip?: string;
}

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export function MetricCard({
  title,
  value,
  format = "number",
  change,
  changePeriod = "vs last period",
  icon: Icon,
  color = "cyan",
  size = "md",
  tooltip,
}: MetricCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const updateTooltipPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setTooltipPosition({
        top: rect.bottom + 8,
        left: Math.min(rect.left, window.innerWidth - 300),
      });
    }
  };

  const handleMouseEnter = () => {
    updateTooltipPosition();
    setShowTooltip(true);
  };
  const formattedValue = (() => {
    switch (format) {
      case "currency":
        return formatCurrency(value);
      case "percentage":
        return `${value.toFixed(1)}%`;
      case "duration":
        return formatDuration(value);
      case "tokens":
        return formatTokens(value);
      default:
        return formatNumber(value);
    }
  })();

  const colorClasses = {
    cyan: "text-accent-cyan",
    purple: "text-accent-purple",
    pink: "text-accent-pink",
    green: "text-accent-green",
    yellow: "text-accent-yellow",
    red: "text-accent-red",
  };

  const bgColorClasses = {
    cyan: "bg-accent-cyan/10",
    purple: "bg-accent-purple/10",
    pink: "bg-accent-pink/10",
    green: "bg-accent-green/10",
    yellow: "bg-accent-yellow/10",
    red: "bg-accent-red/10",
  };

  const sizeClasses = {
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  const valueSizeClasses = {
    sm: "text-2xl",
    md: "text-3xl",
    lg: "text-4xl",
  };

  return (
    <Card className={cn("card-hover relative", sizeClasses[size])}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-foreground-secondary">{title}</p>
            {tooltip && (
              <>
                <button
                  ref={buttonRef}
                  type="button"
                  className="text-foreground-muted hover:text-foreground-secondary transition-colors"
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={() => setShowTooltip(false)}
                  onClick={() => {
                    updateTooltipPosition();
                    setShowTooltip(!showTooltip);
                  }}
                  aria-label="Show calculation info"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
                {showTooltip && mounted && createPortal(
                  <div
                    className="fixed z-[9999] w-72 rounded-lg border border-border bg-background p-3 shadow-xl pointer-events-none"
                    style={{
                      top: tooltipPosition.top,
                      left: tooltipPosition.left,
                      maxWidth: 'calc(100vw - 32px)'
                    }}
                  >
                    <p className="text-xs text-foreground-secondary whitespace-pre-line leading-relaxed">{tooltip}</p>
                  </div>,
                  document.body
                )}
              </>
            )}
          </div>
          <p className={cn("font-bold tracking-tight", valueSizeClasses[size], colorClasses[color])}>
            {formattedValue}
          </p>
          {change !== undefined && (
            <div className="flex items-center gap-1 text-sm">
              {change > 0 ? (
                <TrendingUp className="h-4 w-4 text-accent-green" />
              ) : change < 0 ? (
                <TrendingDown className="h-4 w-4 text-accent-red" />
              ) : (
                <Minus className="h-4 w-4 text-foreground-muted" />
              )}
              <span
                className={cn(
                  change > 0
                    ? "text-accent-green"
                    : change < 0
                    ? "text-accent-red"
                    : "text-foreground-muted"
                )}
              >
                {formatPercentage(change)}
              </span>
              <span className="text-foreground-muted">{changePeriod}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", bgColorClasses[color])}>
            <Icon className={cn("h-6 w-6", colorClasses[color])} />
          </div>
        )}
      </div>
    </Card>
  );
}
