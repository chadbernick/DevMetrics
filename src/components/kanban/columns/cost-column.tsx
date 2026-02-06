"use client";

import { KanbanColumn } from "../kanban-column";
import { KanbanCard } from "../kanban-card";

interface CostColumnProps {
  totalCost: number;
  costChange?: number;
  valueGenerated: number;
  roi: number;
  roiChange?: number;
  costByTool?: Array<{ tool: string; cost: number }>;
  budget?: number;
  avgPerSession?: number;
}

function formatCurrency(amount: number): string {
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
  return `$${amount.toFixed(2)}`;
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

export function CostColumn({
  totalCost,
  costChange,
  valueGenerated,
  roi,
  roiChange,
  costByTool = [],
  budget = 200,
  avgPerSession = 0,
}: CostColumnProps) {
  const budgetPercent = (totalCost / budget) * 100;
  const remaining = budget - totalCost;
  const maxToolCost = Math.max(...costByTool.map((t) => t.cost), 1);

  return (
    <KanbanColumn
      title="Cost"
      color="amber"
      headerCount={`Budget: $${budget}`}
      summaryValue={formatCurrency(totalCost)}
      summaryColor="amber"
      summaryMeta={`${budgetPercent.toFixed(0)}% of budget used`}
      footerLeft={`$${avgPerSession.toFixed(2)}/session avg`}
      footerRight={`$${remaining.toFixed(2)} remaining`}
    >
      {/* Cost by Tool */}
      {costByTool.slice(0, 4).map((tool) => (
        <KanbanCard
          key={tool.tool}
          title={tool.tool.replace("_", " ")}
          value={formatCurrency(tool.cost)}
          color={(toolColors[tool.tool] as "blue" | "purple" | "green" | "amber") || "blue"}
          barPercent={(tool.cost / totalCost) * 100}
          footerLeft={`${Math.round((tool.cost / totalCost) * 100)}% of spend`}
          change={costChange}
        />
      ))}

      {/* If no tool breakdown, show simple cost card */}
      {costByTool.length === 0 && (
        <KanbanCard
          title="Total Spend"
          value={formatCurrency(totalCost)}
          color="amber"
          footerLeft="this month"
          change={costChange}
        />
      )}
    </KanbanColumn>
  );
}

export default CostColumn;
