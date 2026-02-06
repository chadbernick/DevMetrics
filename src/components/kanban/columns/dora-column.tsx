"use client";

import { KanbanColumn } from "../kanban-column";
import { KanbanCard } from "../kanban-card";
import { cn } from "@/lib/utils/cn";

interface DoraMetric {
  value: string;
  rating: "elite" | "high" | "medium" | "low";
  trend: "up" | "down" | "neutral";
  previousValue?: string;
  changePercent?: number;
}

interface AIImpactData {
  velocityMultiplier: number | null;
  aiAssistRate: number;
  aiSuccessRate: number;
  nonAISuccessRate: number;
  avgTimeToProduction: string | null;
}

interface DoraColumnProps {
  deployFrequency: DoraMetric;
  leadTime: DoraMetric;
  changeFailureRate: DoraMetric;
  mttr: DoraMetric;
  overallRating?: "elite" | "high" | "medium" | "low";
  aiImpact?: AIImpactData;
}

const ratingLabels = {
  elite: "Elite performer",
  high: "High performer",
  medium: "Medium performer",
  low: "Low performer",
};

const ratingColors = {
  elite: "text-accent-green",
  high: "text-accent-blue",
  medium: "text-accent-amber",
  low: "text-accent-red",
};

function TrendIndicator({ trend, label }: { trend: "up" | "down" | "neutral"; label?: string }) {
  const arrows = { up: "↑", down: "↓", neutral: "→" };
  return (
    <div className="flex items-center gap-1.5 mt-2">
      <span className={cn("text-sm", trend === "neutral" ? "text-foreground-muted" : "text-accent-green")}>
        {arrows[trend]}
      </span>
      {label && <span className="text-[10px] text-foreground-secondary">{label}</span>}
    </div>
  );
}

export function DoraColumn({
  deployFrequency,
  leadTime,
  changeFailureRate,
  mttr,
  overallRating = "medium",
  aiImpact,
}: DoraColumnProps) {
  // Build AI impact display
  const hasAIImpactData = aiImpact && (aiImpact.velocityMultiplier || aiImpact.aiAssistRate > 0);

  let aiImpactValue = "—";
  let aiImpactDescription = "Track AI-assisted deployments to see impact on velocity.";

  if (aiImpact) {
    if (aiImpact.velocityMultiplier && aiImpact.velocityMultiplier > 1) {
      aiImpactValue = `${aiImpact.velocityMultiplier.toFixed(1)}x`;
      aiImpactDescription = `AI-assisted deploys are ${aiImpact.velocityMultiplier.toFixed(1)}x faster than non-AI deploys.`;
    } else if (aiImpact.aiAssistRate > 0) {
      aiImpactValue = `${aiImpact.aiAssistRate.toFixed(0)}%`;
      aiImpactDescription = `${aiImpact.aiAssistRate.toFixed(0)}% of deployments are AI-assisted.`;
    }
  }

  // Calculate success rate difference
  const successRateDiff = aiImpact
    ? aiImpact.aiSuccessRate - aiImpact.nonAISuccessRate
    : 0;

  return (
    <KanbanColumn
      title="DORA Metrics"
      color="indigo"
      headerCount="Engineering Velocity"
      wide
      footerLeft="30-day trend"
      footerRight="vs. industry benchmarks"
    >
      {/* Lead Time */}
      <KanbanCard
        title="Lead Time for Changes"
        value={leadTime.value}
        color="green"
        variant="dora"
      >
        <TrendIndicator
          trend={leadTime.trend}
          label={leadTime.previousValue ? `Down from ${leadTime.previousValue}` : undefined}
        />
        <div className="flex items-center justify-between text-[10px] text-foreground-muted mt-2">
          <span>Commit to production</span>
          <span className={ratingColors[leadTime.rating]}>{ratingLabels[leadTime.rating]}</span>
        </div>
      </KanbanCard>

      {/* Deploy Frequency */}
      <KanbanCard
        title="Deployment Frequency"
        value={deployFrequency.value}
        color="blue"
        variant="dora"
      >
        <TrendIndicator
          trend={deployFrequency.trend}
          label={deployFrequency.previousValue ? `Up from ${deployFrequency.previousValue}` : undefined}
        />
        <div className="flex items-center justify-between text-[10px] text-foreground-muted mt-2">
          <span>Production deploys</span>
          <span className={ratingColors[deployFrequency.rating]}>{ratingLabels[deployFrequency.rating]}</span>
        </div>
      </KanbanCard>

      {/* Change Failure Rate */}
      <KanbanCard
        title="Change Failure Rate"
        value={changeFailureRate.value}
        color="green"
        variant="dora"
      >
        <TrendIndicator
          trend={changeFailureRate.trend}
          label={changeFailureRate.previousValue ? `Down from ${changeFailureRate.previousValue}` : undefined}
        />
        <div className="flex items-center justify-between text-[10px] text-foreground-muted mt-2">
          <span>Deploys causing issues</span>
          <span className={ratingColors[changeFailureRate.rating]}>{ratingLabels[changeFailureRate.rating]}</span>
        </div>
      </KanbanCard>

      {/* MTTR */}
      <KanbanCard
        title="Mean Time to Recovery"
        value={mttr.value}
        color="cyan"
        variant="dora"
      >
        <TrendIndicator
          trend={mttr.trend}
          label={mttr.previousValue ? `Down from ${mttr.previousValue}` : undefined}
        />
        <div className="flex items-center justify-between text-[10px] text-foreground-muted mt-2">
          <span>Incident resolution</span>
          <span className={ratingColors[mttr.rating]}>{ratingLabels[mttr.rating]}</span>
        </div>
      </KanbanCard>

      {/* AI Impact Correlation */}
      <KanbanCard
        title=""
        variant="correlation"
      >
        <div className="text-[10px] text-foreground-muted uppercase tracking-wider mb-2">
          AI Impact Correlation
        </div>
        <div className={cn(
          "text-xl font-bold mb-1",
          hasAIImpactData ? "text-accent-green" : "text-foreground-muted"
        )}>
          {aiImpactValue}
        </div>
        <div className="text-[11px] text-foreground-secondary leading-relaxed">
          {aiImpactDescription}
        </div>
        {hasAIImpactData && successRateDiff !== 0 && (
          <div className="mt-2 pt-2 border-t border-border">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-foreground-muted">Success Rate</span>
              <span className={successRateDiff > 0 ? "text-accent-green" : "text-foreground-muted"}>
                {successRateDiff > 0 ? "+" : ""}{successRateDiff.toFixed(0)}% vs non-AI
              </span>
            </div>
          </div>
        )}
        {aiImpact?.avgTimeToProduction && (
          <div className="mt-1 flex items-center justify-between text-[10px]">
            <span className="text-foreground-muted">Avg Time to Prod</span>
            <span className="text-foreground-secondary">{aiImpact.avgTimeToProduction}</span>
          </div>
        )}
      </KanbanCard>
    </KanbanColumn>
  );
}

export default DoraColumn;
