"use client";

import { cn } from "@/lib/utils/cn";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface DoraMiniCardProps {
  label: string;
  value: string;
  trend: "up" | "down" | "neutral";
  rating: "elite" | "high" | "medium" | "low";
  compact?: boolean;
  className?: string;
}

const ratingConfig = {
  elite: {
    bg: "bg-rating-elite/15",
    text: "text-rating-elite",
    label: "Elite",
  },
  high: {
    bg: "bg-rating-high/15",
    text: "text-rating-high",
    label: "High",
  },
  medium: {
    bg: "bg-rating-medium/15",
    text: "text-rating-medium",
    label: "Medium",
  },
  low: {
    bg: "bg-rating-low/15",
    text: "text-rating-low",
    label: "Low",
  },
};

const TrendIcon = ({ trend }: { trend: "up" | "down" | "neutral" }) => {
  switch (trend) {
    case "up":
      return <TrendingUp className="w-3 h-3 text-accent-green" />;
    case "down":
      return <TrendingDown className="w-3 h-3 text-accent-red" />;
    default:
      return <Minus className="w-3 h-3 text-foreground-muted" />;
  }
};

export function DoraMiniCard({
  label,
  value,
  trend,
  rating,
  compact = false,
  className,
}: DoraMiniCardProps) {
  const config = ratingConfig[rating];

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-md",
          config.bg,
          className
        )}
      >
        <span className={cn("text-xs font-medium", config.text)}>{value}</span>
        <span className="text-[10px] text-foreground-muted uppercase">
          {label}
        </span>
        <TrendIcon trend={trend} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-1 p-3 rounded-lg border border-border bg-background-card",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-foreground-muted uppercase tracking-wide">
          {label}
        </span>
        <span
          className={cn(
            "text-[9px] font-semibold px-1.5 py-0.5 rounded",
            config.bg,
            config.text
          )}
        >
          {config.label}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className={cn("text-lg font-bold", config.text)}>{value}</span>
        <TrendIcon trend={trend} />
      </div>
    </div>
  );
}

export default DoraMiniCard;
