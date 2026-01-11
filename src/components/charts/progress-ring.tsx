"use client";

import { cn } from "@/lib/utils/cn";

interface ProgressRingProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  color?: "cyan" | "purple" | "pink" | "green" | "yellow";
  className?: string;
}

const colorMap = {
  cyan: "var(--accent-cyan)",
  purple: "var(--accent-purple)",
  pink: "var(--accent-pink)",
  green: "var(--accent-green)",
  yellow: "var(--accent-yellow)",
};

export function ProgressRing({
  value,
  max = 100,
  size = 120,
  strokeWidth = 8,
  label,
  sublabel,
  color = "cyan",
  className,
}: ProgressRingProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={colorMap[color]}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transition: "stroke-dashoffset 0.5s ease",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-xl font-bold"
            style={{ color: colorMap[color] }}
          >
            {typeof value === "number" ? value.toLocaleString() : value}
          </span>
          {sublabel && (
            <span className="text-xs text-foreground-muted">{sublabel}</span>
          )}
        </div>
      </div>
      {label && (
        <span className="mt-2 text-sm font-medium text-foreground-secondary">
          {label}
        </span>
      )}
    </div>
  );
}
