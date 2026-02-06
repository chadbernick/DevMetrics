"use client";

import { KanbanColumn } from "../kanban-column";
import { KanbanCard } from "../kanban-card";

interface TokensColumnProps {
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cacheTokens: number;
  thinkingTokens: number;
  tokensChange?: number;
  avgPerSession?: number;
  sparklineData?: number[];
}

function formatTokens(tokens: number): string {
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
  return tokens.toString();
}

export function TokensColumn({
  totalTokens,
  inputTokens,
  outputTokens,
  cacheTokens,
  thinkingTokens,
  tokensChange,
  avgPerSession = 0,
  sparklineData,
}: TokensColumnProps) {
  const inputPercent = totalTokens > 0 ? Math.round((inputTokens / totalTokens) * 100) : 0;
  const outputPercent = totalTokens > 0 ? Math.round((outputTokens / totalTokens) * 100) : 0;
  const cachePercent = totalTokens > 0 ? Math.round((cacheTokens / totalTokens) * 100) : 0;

  return (
    <KanbanColumn
      title="Tokens"
      color="purple"
      headerCount={`${formatTokens(totalTokens)} total`}
      summaryValue={formatTokens(totalTokens)}
      summaryColor="purple"
      summaryMeta={`${formatTokens(avgPerSession)} avg per session`}
      footerLeft={`Cost: $${((totalTokens / 1000) * 0.003).toFixed(3)}/1K`}
    >
      {/* Input Tokens */}
      <KanbanCard
        title="Input Tokens"
        value={formatTokens(inputTokens)}
        color="purple"
        barPercent={inputPercent}
        footerLeft={`${inputPercent}% of total`}
        change={tokensChange}
      />

      {/* Output Tokens */}
      <KanbanCard
        title="Output Tokens"
        value={formatTokens(outputTokens)}
        color="indigo"
        barPercent={outputPercent}
        footerLeft={`${outputPercent}% of total`}
      />

      {/* Cache Hits */}
      {cacheTokens > 0 && (
        <KanbanCard
          title="Cache Hits"
          value={formatTokens(cacheTokens)}
          color="green"
          barPercent={cachePercent}
          footerLeft={`${cachePercent}% hit rate`}
        />
      )}
    </KanbanColumn>
  );
}

export default TokensColumn;
