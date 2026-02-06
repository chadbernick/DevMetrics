"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import {
  Trophy,
  Medal,
  Award,
  Code2,
  Clock,
  DollarSign,
  TrendingUp,
  Zap,
  ChevronDown,
  User,
  GitPullRequest,
  Bug,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatNumber, formatCurrency, formatTokens } from "@/lib/utils/format";

interface LeaderboardEntry {
  id: string;
  name: string;
  email: string;
  engineerLevel: string;
  sessions: number;
  tokens: number;
  cost: number;
  linesOfCode: number;
  hoursSaved: number;
  value: number;
  roi: number;
  features: number;
  bugs: number;
  prs: number;
}

interface TeamLeaderboardClientProps {
  leaderboard: LeaderboardEntry[];
  currentUserId: string;
}

type SortKey = "linesOfCode" | "hoursSaved" | "sessions" | "tokens" | "roi" | "value";

const sortOptions: { key: SortKey; label: string; icon: React.ElementType }[] = [
  { key: "linesOfCode", label: "Lines of Code", icon: Code2 },
  { key: "hoursSaved", label: "Hours Saved", icon: Clock },
  { key: "sessions", label: "Sessions", icon: Zap },
  { key: "tokens", label: "Tokens Used", icon: TrendingUp },
  { key: "value", label: "Value Generated", icon: DollarSign },
  { key: "roi", label: "ROI", icon: TrendingUp },
];

function getRankIcon(rank: number) {
  if (rank === 1) return <Trophy className="h-4 w-4 text-yellow-400" />;
  if (rank === 2) return <Medal className="h-4 w-4 text-gray-400" />;
  if (rank === 3) return <Award className="h-4 w-4 text-amber-600" />;
  return <span className="text-[10px] font-medium text-foreground-muted">{rank}</span>;
}

function getRankBadgeClass(rank: number) {
  if (rank === 1) return "bg-yellow-500/10 border-yellow-500/30";
  if (rank === 2) return "bg-gray-400/10 border-gray-400/30";
  if (rank === 3) return "bg-amber-600/10 border-amber-600/30";
  return "bg-background border-border";
}

function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  return `${hours.toFixed(1)}h`;
}

function getFormattedValue(entry: LeaderboardEntry, sortBy: SortKey): string {
  switch (sortBy) {
    case "linesOfCode": return formatNumber(entry.linesOfCode);
    case "hoursSaved": return formatHours(entry.hoursSaved);
    case "sessions": return formatNumber(entry.sessions);
    case "tokens": return formatTokens(entry.tokens);
    case "value": return formatCurrency(entry.value);
    case "roi": return `${entry.roi.toFixed(0)}%`;
    default: return "";
  }
}

export function TeamLeaderboardClient({ leaderboard, currentUserId }: TeamLeaderboardClientProps) {
  const [sortBy, setSortBy] = useState<SortKey>("linesOfCode");
  const [showSortMenu, setShowSortMenu] = useState(false);

  const sortedLeaderboard = [...leaderboard].sort((a, b) => b[sortBy] - a[sortBy]);

  const currentSortOption = sortOptions.find((o) => o.key === sortBy)!;

  // Team totals
  const teamTotals = leaderboard.reduce((acc, entry) => ({
    sessions: acc.sessions + entry.sessions,
    linesOfCode: acc.linesOfCode + entry.linesOfCode,
    hoursSaved: acc.hoursSaved + entry.hoursSaved,
    value: acc.value + entry.value,
    cost: acc.cost + entry.cost,
  }), { sessions: 0, linesOfCode: 0, hoursSaved: 0, value: 0, cost: 0 });

  const teamRoi = teamTotals.cost > 0
    ? ((teamTotals.value - teamTotals.cost) / teamTotals.cost) * 100
    : 0;

  return (
    <DashboardLayout title="Team">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Team Leaderboard</h1>
            <p className="text-sm text-foreground-muted mt-1">Last 30 days performance</p>
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="flex items-center gap-2 rounded-lg border border-border bg-background-secondary px-3 py-1.5 text-xs font-medium hover:bg-background transition-colors"
            >
              <currentSortOption.icon className="h-3.5 w-3.5 text-accent-cyan" />
              {currentSortOption.label}
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showSortMenu && "rotate-180")} />
            </button>

            {showSortMenu && (
              <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-lg border border-border bg-background-secondary shadow-lg">
                {sortOptions.map((option) => (
                  <button
                    key={option.key}
                    onClick={() => {
                      setSortBy(option.key);
                      setShowSortMenu(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-background transition-colors first:rounded-t-lg last:rounded-b-lg",
                      sortBy === option.key && "text-accent-cyan bg-accent-cyan/10"
                    )}
                  >
                    <option.icon className="h-3.5 w-3.5" />
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Team Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="rounded-lg border border-border bg-background-secondary p-3">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-3.5 w-3.5 text-accent-cyan" />
              <span className="text-[10px] font-medium text-foreground-muted">Team Sessions</span>
            </div>
            <div className="text-lg font-bold">{formatNumber(teamTotals.sessions)}</div>
          </div>
          <div className="rounded-lg border border-border bg-background-secondary p-3">
            <div className="flex items-center gap-2 mb-1">
              <Code2 className="h-3.5 w-3.5 text-accent-purple" />
              <span className="text-[10px] font-medium text-foreground-muted">Lines of Code</span>
            </div>
            <div className="text-lg font-bold">{formatNumber(teamTotals.linesOfCode)}</div>
          </div>
          <div className="rounded-lg border border-border bg-background-secondary p-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-3.5 w-3.5 text-accent-pink" />
              <span className="text-[10px] font-medium text-foreground-muted">Hours Saved</span>
            </div>
            <div className="text-lg font-bold">{formatHours(teamTotals.hoursSaved)}</div>
          </div>
          <div className="rounded-lg border border-border bg-background-secondary p-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-3.5 w-3.5 text-accent-green" />
              <span className="text-[10px] font-medium text-foreground-muted">Team Value</span>
            </div>
            <div className="text-lg font-bold">{formatCurrency(teamTotals.value)}</div>
          </div>
          <div className="rounded-lg border border-border bg-background-secondary p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-[10px] font-medium text-foreground-muted">Team ROI</span>
            </div>
            <div className={cn("text-lg font-bold", teamRoi > 0 ? "text-emerald-400" : "text-foreground-muted")}>
              {teamRoi > 0 ? "+" : ""}{teamRoi.toFixed(0)}%
            </div>
          </div>
        </div>

        {/* Top 3 Podium */}
        {sortedLeaderboard.length >= 3 && (
          <div className="grid grid-cols-3 gap-3">
            {sortedLeaderboard.slice(0, 3).map((entry, index) => {
              const rank = index + 1;
              const isCurrentUser = entry.id === currentUserId;
              const podiumOrder = rank === 1 ? "order-2" : rank === 2 ? "order-1" : "order-3";
              const heightClass = rank === 1 ? "pt-0" : rank === 2 ? "pt-4" : "pt-6";

              return (
                <div
                  key={entry.id}
                  className={cn("relative", podiumOrder)}
                >
                  <div className={cn(
                    "rounded-lg border p-4 text-center",
                    rank === 1 ? "border-yellow-500/30 bg-gradient-to-b from-yellow-500/10 to-transparent" :
                    rank === 2 ? "border-gray-400/30 bg-gradient-to-b from-gray-400/10 to-transparent" :
                    "border-amber-600/30 bg-gradient-to-b from-amber-600/10 to-transparent",
                    isCurrentUser && "ring-1 ring-accent-cyan",
                    heightClass
                  )}>
                    {/* Rank Badge */}
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                      <div className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full border",
                        getRankBadgeClass(rank)
                      )}>
                        {getRankIcon(rank)}
                      </div>
                    </div>

                    {/* User Info */}
                    <div className="mt-3">
                      <div className="flex justify-center mb-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background-secondary border border-border">
                          <User className="h-5 w-5 text-foreground-muted" />
                        </div>
                      </div>
                      <h3 className="font-medium text-sm truncate">
                        {entry.name}
                        {isCurrentUser && (
                          <span className="ml-1 text-accent-cyan text-[10px]">(You)</span>
                        )}
                      </h3>
                      <p className="text-[10px] text-foreground-muted capitalize">{entry.engineerLevel}</p>

                      {/* Primary Metric */}
                      <div className="mt-3">
                        <div className="text-xl font-bold text-accent-cyan">
                          {getFormattedValue(entry, sortBy)}
                        </div>
                        <p className="text-[10px] text-foreground-muted">{currentSortOption.label}</p>
                      </div>

                      {/* Secondary Stats */}
                      <div className="mt-3 pt-3 border-t border-border grid grid-cols-3 gap-1 text-[10px]">
                        <div>
                          <div className="font-medium">{entry.features}</div>
                          <div className="text-foreground-muted">Features</div>
                        </div>
                        <div>
                          <div className="font-medium">{entry.bugs}</div>
                          <div className="text-foreground-muted">Bugs</div>
                        </div>
                        <div>
                          <div className="font-medium">{entry.prs}</div>
                          <div className="text-foreground-muted">PRs</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Full Leaderboard Table */}
        <div className="rounded-lg border border-border bg-background-secondary overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-left text-foreground-muted">
                  <th className="px-3 py-2.5 font-medium w-12">#</th>
                  <th className="px-3 py-2.5 font-medium">Developer</th>
                  <th className="px-3 py-2.5 font-medium text-right">Sessions</th>
                  <th className="px-3 py-2.5 font-medium text-right">Lines</th>
                  <th className="px-3 py-2.5 font-medium text-right">Hours Saved</th>
                  <th className="px-3 py-2.5 font-medium text-right">Tokens</th>
                  <th className="px-3 py-2.5 font-medium text-right">Cost</th>
                  <th className="px-3 py-2.5 font-medium text-right">Value</th>
                  <th className="px-3 py-2.5 font-medium text-right">ROI</th>
                </tr>
              </thead>
              <tbody>
                {sortedLeaderboard.map((entry, index) => {
                  const rank = index + 1;
                  const isCurrentUser = entry.id === currentUserId;

                  return (
                    <tr
                      key={entry.id}
                      className={cn(
                        "border-b border-border/50 last:border-0 hover:bg-background/50 transition-colors",
                        isCurrentUser && "bg-accent-cyan/5"
                      )}
                    >
                      <td className="px-3 py-2.5">
                        <div className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full border",
                          getRankBadgeClass(rank)
                        )}>
                          {getRankIcon(rank)}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-background border border-border">
                            <User className="h-3 w-3 text-foreground-muted" />
                          </div>
                          <div>
                            <div className="font-medium">
                              {entry.name}
                              {isCurrentUser && (
                                <span className="ml-1.5 rounded bg-accent-cyan/20 px-1 py-0.5 text-[9px] text-accent-cyan">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-foreground-muted capitalize">{entry.engineerLevel}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono">
                        {formatNumber(entry.sessions)}
                      </td>
                      <td className={cn(
                        "px-3 py-2.5 text-right font-mono",
                        sortBy === "linesOfCode" && "text-accent-cyan font-semibold"
                      )}>
                        {formatNumber(entry.linesOfCode)}
                      </td>
                      <td className={cn(
                        "px-3 py-2.5 text-right font-mono",
                        sortBy === "hoursSaved" && "text-accent-cyan font-semibold"
                      )}>
                        {formatHours(entry.hoursSaved)}
                      </td>
                      <td className={cn(
                        "px-3 py-2.5 text-right font-mono",
                        sortBy === "tokens" && "text-accent-cyan font-semibold"
                      )}>
                        {formatTokens(entry.tokens)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-foreground-muted">
                        {formatCurrency(entry.cost)}
                      </td>
                      <td className={cn(
                        "px-3 py-2.5 text-right font-mono",
                        sortBy === "value" && "text-accent-cyan font-semibold"
                      )}>
                        {formatCurrency(entry.value)}
                      </td>
                      <td className={cn(
                        "px-3 py-2.5 text-right font-mono",
                        sortBy === "roi" && "font-semibold",
                        entry.roi > 0 ? "text-emerald-400" : "text-foreground-muted"
                      )}>
                        {entry.roi > 0 ? "+" : ""}{entry.roi.toFixed(0)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Empty State */}
        {sortedLeaderboard.length === 0 && (
          <div className="rounded-lg border border-border bg-background-secondary p-8 text-center">
            <User className="h-10 w-10 mx-auto text-foreground-muted mb-3" />
            <h3 className="font-medium mb-1">No team data yet</h3>
            <p className="text-xs text-foreground-muted">
              Team metrics will appear once members start using AI coding tools.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
