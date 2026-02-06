"use client";

import { useState, useEffect, useCallback } from "react";
import { ExecutiveBar } from "@/components/zones/executive-bar";
import { KanbanZone } from "@/components/zones/kanban-zone";
import { ActivityStream } from "@/components/zones/activity-stream";
import {
  SessionsColumn,
  TokensColumn,
  ProductivityColumn,
  CostColumn,
  DoraColumn,
} from "@/components/kanban";
import { Loader2 } from "lucide-react";

interface DashboardData {
  // Executive metrics
  roi: number;
  roiChange?: number;
  valueGenerated: number;
  totalCost: number;
  costChange?: number;

  // Session metrics
  totalSessions: number;
  activeSessions: number;
  avgDuration: number;
  sessionsByTool: Array<{ tool: string; count: number }>;
  sessionsChange?: number;

  // Token metrics
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cacheTokens: number;
  thinkingTokens: number;
  tokensChange?: number;
  tokenSparkline?: number[];

  // Productivity metrics
  linesOfCode: number;
  linesChange?: number;
  features: number;
  bugs: number;
  prs: number;
  hoursSaved: number;
  hoursSavedChange?: number;

  // Cost sparkline
  costSparkline?: number[];

  // DORA metrics
  dora: {
    deployFrequency: {
      value: string;
      rating: "elite" | "high" | "medium" | "low";
      trend: "up" | "down" | "neutral";
    };
    leadTime: {
      value: string;
      rating: "elite" | "high" | "medium" | "low";
      trend: "up" | "down" | "neutral";
    };
    changeFailureRate: {
      value: string;
      rating: "elite" | "high" | "medium" | "low";
      trend: "up" | "down" | "neutral";
    };
    mttr: {
      value: string;
      rating: "elite" | "high" | "medium" | "low";
      trend: "up" | "down" | "neutral";
    };
    overallRating: "elite" | "high" | "medium" | "low";
  };
}

interface ActivityData {
  events: Array<{
    id: string;
    type: "session" | "feature" | "bug" | "pr" | "deploy" | "alert";
    title: string;
    description?: string;
    timestamp: string;
    timeAgo: string;
    tags?: Array<{
      label: string;
      type: "tokens" | "lines" | "cost" | "time" | "default";
    }>;
  }>;
  activeSessions: Array<{
    id: string;
    name: string;
    tool: string;
    tokens: string;
    status: "active" | "idle" | "waiting";
    duration?: string;
  }>;
  eventCount: number;
}

interface HybridDashboardProps {
  initialData: DashboardData;
  initialActivity?: ActivityData;
}

interface AIImpactData {
  velocityMultiplier: number | null;
  aiAssistRate: number;
  aiSuccessRate: number;
  nonAISuccessRate: number;
  avgTimeToProduction: string | null;
}

export function HybridDashboard({
  initialData,
  initialActivity,
}: HybridDashboardProps) {
  const [data, setData] = useState<DashboardData>(initialData);
  const [activity, setActivity] = useState<ActivityData>(
    initialActivity || { events: [], activeSessions: [], eventCount: 0 }
  );
  const [aiImpact, setAIImpact] = useState<AIImpactData | undefined>(undefined);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Fetch activity stream data
  const fetchActivity = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/activity-stream");
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setActivity(result.data);
        }
      }
    } catch (error) {
      console.error("Failed to fetch activity:", error);
    }
  }, []);

  // Fetch AI impact data
  const fetchAIImpact = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/analytics/ai-impact?range=30");
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const d = result.data;
          setAIImpact({
            velocityMultiplier: d.summary.velocityMultiplier,
            aiAssistRate: d.summary.aiAssistRate,
            aiSuccessRate: d.successRates.ai,
            nonAISuccessRate: d.successRates.nonAI,
            avgTimeToProduction: d.velocity.aiLeadTime?.formatted || null,
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch AI impact:", error);
    }
  }, []);

  // Fetch AI impact on mount
  useEffect(() => {
    fetchAIImpact();
  }, [fetchAIImpact]);

  // Auto-refresh activity every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchActivity, 30000);
    return () => clearInterval(interval);
  }, [fetchActivity]);

  // Build executive metrics
  const execMetrics = [
    {
      label: "ROI",
      value: `${data.roi.toFixed(0)}%`,
      change: data.roiChange,
      color: "green" as const,
      icon: "📈",
    },
    {
      label: "Value",
      value: `$${data.valueGenerated >= 1000 ? `${(data.valueGenerated / 1000).toFixed(1)}K` : data.valueGenerated.toFixed(0)}`,
      color: "cyan" as const,
      icon: "💎",
    },
    {
      label: "Cost",
      value: `$${data.totalCost.toFixed(2)}`,
      change: data.costChange,
      color: "amber" as const,
      icon: "💰",
    },
  ];

  // Build DORA summary for executive bar
  const doraMetrics = [
    {
      label: "DF",
      value: data.dora.deployFrequency.value,
      trend: data.dora.deployFrequency.trend,
      rating: data.dora.deployFrequency.rating,
    },
    {
      label: "LT",
      value: data.dora.leadTime.value,
      trend: data.dora.leadTime.trend,
      rating: data.dora.leadTime.rating,
    },
  ];

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-background/50 z-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-accent-cyan" />
        </div>
      )}

      {/* Zone 1: Executive Bar */}
      <ExecutiveBar
        metrics={execMetrics}
        doraMetrics={doraMetrics}
        isLive={activity.activeSessions.length > 0}
        lastUpdated={lastUpdated.toLocaleTimeString()}
        period="Last 30 days"
      />

      {/* Zone 2: Kanban Columns */}
      <KanbanZone className="flex-1 min-h-0">
        <SessionsColumn
          totalSessions={data.totalSessions}
          activeSessions={data.activeSessions}
          avgDuration={data.avgDuration}
          sessionsByTool={data.sessionsByTool}
          change={data.sessionsChange}
        />

        <TokensColumn
          totalTokens={data.totalTokens}
          inputTokens={data.inputTokens}
          outputTokens={data.outputTokens}
          cacheTokens={data.cacheTokens}
          thinkingTokens={data.thinkingTokens}
          tokensChange={data.tokensChange}
          sparklineData={data.tokenSparkline}
        />

        <ProductivityColumn
          linesOfCode={data.linesOfCode}
          linesChange={data.linesChange}
          features={data.features}
          bugs={data.bugs}
          prs={data.prs}
          hoursSaved={data.hoursSaved}
          hoursSavedChange={data.hoursSavedChange}
        />

        <CostColumn
          totalCost={data.totalCost}
          costChange={data.costChange}
          valueGenerated={data.valueGenerated}
          roi={data.roi}
          roiChange={data.roiChange}
        />

        <DoraColumn
          deployFrequency={data.dora.deployFrequency}
          leadTime={data.dora.leadTime}
          changeFailureRate={data.dora.changeFailureRate}
          mttr={data.dora.mttr}
          overallRating={data.dora.overallRating}
          aiImpact={aiImpact}
        />
      </KanbanZone>

      {/* Zone 3: Activity Stream */}
      <ActivityStream
        activeSessions={activity.activeSessions}
        events={activity.events}
        eventCount={activity.eventCount}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />
    </div>
  );
}

export default HybridDashboard;
