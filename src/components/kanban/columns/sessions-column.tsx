"use client";

import { KanbanColumn } from "../kanban-column";
import { KanbanCard } from "../kanban-card";

interface SessionsColumnProps {
  totalSessions: number;
  activeSessions: number;
  avgDuration: number;
  sessionsByTool: Array<{ tool: string; count: number }>;
  change?: number;
  todayCount?: number;
  weekCount?: number;
  peakDaily?: number;
  sparklineData?: number[];
}

const toolColors: Record<string, string> = {
  claude_code: "blue",
  cursor: "amber",
  copilot: "purple",
  gemini: "green",
  codex: "pink",
  kiro: "cyan",
  other: "indigo",
};

export function SessionsColumn({
  totalSessions,
  activeSessions,
  avgDuration,
  sessionsByTool,
  change,
  todayCount = 0,
  weekCount = 0,
  peakDaily = 0,
  sparklineData,
}: SessionsColumnProps) {
  const maxToolCount = Math.max(...sessionsByTool.map((t) => t.count), 1);

  return (
    <KanbanColumn
      title="Sessions"
      color="blue"
      headerCount={`${totalSessions} total`}
      summaryValue={totalSessions}
      summaryColor="blue"
      summaryMeta={`${todayCount} today • ${weekCount} this week`}
      footerLeft={`Avg duration: ${avgDuration}m`}
      footerRight={`Peak: ${peakDaily}/day`}
    >
      {/* By Tool */}
      <KanbanCard title="By Tool" color="blue">
        <div className="flex flex-col gap-1.5 mt-1">
          {sessionsByTool.slice(0, 4).map((tool) => (
            <div key={tool.tool}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-foreground-secondary">
                  {tool.tool.replace("_", " ")}
                </span>
                <span className={`text-[12px] font-semibold text-accent-${toolColors[tool.tool] || "blue"}`}>
                  {tool.count}
                </span>
              </div>
              <div className="h-1 bg-border rounded-sm overflow-hidden">
                <div
                  className={`h-full bg-accent-${toolColors[tool.tool] || "blue"} rounded-sm`}
                  style={{ width: `${(tool.count / maxToolCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </KanbanCard>

      {/* Daily Trend */}
      <KanbanCard
        title="Daily Trend"
        value={(totalSessions / 30).toFixed(1)}
        color="blue"
        sparkline={sparklineData || [50, 65, 45, 80, 60, 90, 70]}
        footerLeft="sessions/day avg"
        change={change}
      />
    </KanbanColumn>
  );
}

export default SessionsColumn;
