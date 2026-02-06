"use client";

import { KanbanColumn } from "../kanban-column";
import { KanbanCard } from "../kanban-card";

interface ProductivityColumnProps {
  linesOfCode: number;
  linesChange?: number;
  features: number;
  bugs: number;
  prs: number;
  hoursSaved: number;
  hoursSavedChange?: number;
  linesPerSession?: number;
  peakLines?: number;
  avgHourlyRate?: number;
}

function formatNumber(num: number): string {
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export function ProductivityColumn({
  linesOfCode,
  linesChange,
  features,
  bugs,
  prs,
  hoursSaved,
  hoursSavedChange,
  linesPerSession = 0,
  peakLines = 0,
  avgHourlyRate = 65,
}: ProductivityColumnProps) {
  const valueGenerated = hoursSaved * avgHourlyRate;

  return (
    <KanbanColumn
      title="Output"
      color="green"
      headerCount="Productivity"
      summaryValue={formatNumber(linesOfCode)}
      summaryColor="green"
      summaryMeta={`lines of code • ${Math.round(linesOfCode / Math.max(hoursSaved, 1))}/hour`}
      footerLeft={`${linesPerSession} lines/session`}
      footerRight={`Peak: ${peakLines}`}
    >
      {/* Features Shipped */}
      <KanbanCard
        title="Features Shipped"
        value={features}
        color="green"
        footerLeft="this month"
        change={linesChange}
      />

      {/* Bugs Fixed */}
      <KanbanCard
        title="Bugs Fixed"
        value={bugs}
        color="cyan"
        footerLeft="resolved"
      />

      {/* PRs Merged */}
      <KanbanCard
        title="PRs Merged"
        value={prs}
        color="purple"
        footerLeft="avg review: 2.3h"
      />

      {/* Hours Saved */}
      <KanbanCard
        title="Hours Saved"
        value={`${hoursSaved.toFixed(1)}h`}
        color="cyan"
        footerLeft={`@ $${avgHourlyRate}/hr = $${valueGenerated.toFixed(0)}`}
        change={hoursSavedChange}
      />
    </KanbanColumn>
  );
}

export default ProductivityColumn;
