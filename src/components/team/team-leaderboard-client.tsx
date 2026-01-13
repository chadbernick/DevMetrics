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
  if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-400" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
  if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />;
  return <span className="flex h-5 w-5 items-center justify-center text-sm font-medium text-foreground-muted">{rank}</span>;
}

function getRankBadgeClass(rank: number) {
  if (rank === 1) return "bg-yellow-500/10 border-yellow-500/30 text-yellow-400";
  if (rank === 2) return "bg-gray-400/10 border-gray-400/30 text-gray-400";
  if (rank === 3) return "bg-amber-600/10 border-amber-600/30 text-amber-600";
  return "bg-background border-border text-foreground-muted";
}

function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  return `${hours.toFixed(1)}h`;
}

export function TeamLeaderboardClient({ leaderboard, currentUserId }: TeamLeaderboardClientProps) {
  const [sortBy, setSortBy] = useState<SortKey>("linesOfCode");
  const [showSortMenu, setShowSortMenu] = useState(false);

  const sortedLeaderboard = [...leaderboard].sort((a, b) => b[sortBy] - a[sortBy]);

  const currentSortOption = sortOptions.find((o) => o.key === sortBy)!;

  return (
    <DashboardLayout title="Team Leaderboard">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Team Leaderboard</h1>
            <p className="text-foreground-muted">Last 30 days performance</p>
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="flex items-center gap-2 rounded-lg border border-border bg-background-secondary px-4 py-2 text-sm font-medium hover:bg-background transition-colors"
            >
              <currentSortOption.icon className="h-4 w-4 text-accent-cyan" />
              Sort by: {currentSortOption.label}
              <ChevronDown className={cn("h-4 w-4 transition-transform", showSortMenu && "rotate-180")} />
            </button>

            {showSortMenu && (
              <div className="absolute right-0 top-full z-10 mt-2 w-56 rounded-lg border border-border bg-background-secondary shadow-lg">
                {sortOptions.map((option) => (
                  <button
                    key={option.key}
                    onClick={() => {
                      setSortBy(option.key);
                      setShowSortMenu(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-background transition-colors first:rounded-t-lg last:rounded-b-lg",
                      sortBy === option.key && "text-accent-cyan bg-accent-cyan/10"
                    )}
                  >
                    <option.icon className="h-4 w-4" />
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top 3 Podium */}
        <div className="grid grid-cols-3 gap-4">
          {sortedLeaderboard.slice(0, 3).map((entry, index) => {
            const rank = index + 1;
            const isCurrentUser = entry.id === currentUserId;

            return (
              <div
                key={entry.id}
                className={cn(
                  "relative rounded-xl border p-6 text-center",
                  rank === 1
                    ? "border-yellow-500/30 bg-gradient-to-b from-yellow-500/10 to-transparent order-2"
                    : rank === 2
                    ? "border-gray-400/30 bg-gradient-to-b from-gray-400/10 to-transparent order-1"
                    : "border-amber-600/30 bg-gradient-to-b from-amber-600/10 to-transparent order-3",
                  isCurrentUser && "ring-2 ring-accent-cyan"
                )}
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-full border", getRankBadgeClass(rank))}>
                    {getRankIcon(rank)}
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background-secondary">
                      <User className="h-5 w-5 text-foreground-muted" />
                    </div>
                  </div>
                  <h3 className="mt-2 font-semibold">{entry.name}</h3>
                  <p className="text-xs text-foreground-muted capitalize">{entry.engineerLevel}</p>

                  <div className="mt-4 space-y-2">
                    <div className="text-2xl font-bold text-accent-cyan">
                      {sortBy === "linesOfCode" && formatNumber(entry.linesOfCode)}
                      {sortBy === "hoursSaved" && formatHours(entry.hoursSaved)}
                      {sortBy === "sessions" && formatNumber(entry.sessions)}
                      {sortBy === "tokens" && formatTokens(entry.tokens)}
                      {sortBy === "value" && formatCurrency(entry.value)}
                      {sortBy === "roi" && `${entry.roi.toFixed(0)}%`}
                    </div>
                    <p className="text-xs text-foreground-muted">{currentSortOption.label}</p>
                  </div>
                </div>

                {isCurrentUser && (
                  <div className="absolute -right-1 -top-1 rounded-full bg-accent-cyan px-2 py-0.5 text-xs font-medium text-white">
                    You
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Full Leaderboard Table */}
        <div className="rounded-xl border border-border bg-background-secondary">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-sm font-medium text-foreground-muted">
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">Developer</th>
                  <th className="px-4 py-3 text-right">Sessions</th>
                  <th className="px-4 py-3 text-right">Lines of Code</th>
                  <th className="px-4 py-3 text-right">Hours Saved</th>
                  <th className="px-4 py-3 text-right">Tokens Used</th>
                  <th className="px-4 py-3 text-right">Cost</th>
                  <th className="px-4 py-3 text-right">Value</th>
                  <th className="px-4 py-3 text-right">ROI</th>
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
                        "border-b border-border last:border-0 hover:bg-background transition-colors",
                        isCurrentUser && "bg-accent-cyan/5"
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className={cn("flex h-8 w-8 items-center justify-center rounded-full border", getRankBadgeClass(rank))}>
                          {getRankIcon(rank)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-background">
                            <User className="h-4 w-4 text-foreground-muted" />
                          </div>
                          <div>
                            <div className="font-medium">
                              {entry.name}
                              {isCurrentUser && (
                                <span className="ml-2 rounded bg-accent-cyan/20 px-1.5 py-0.5 text-xs text-accent-cyan">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-foreground-muted capitalize">{entry.engineerLevel}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm">{formatNumber(entry.sessions)}</td>
                      <td className={cn("px-4 py-3 text-right font-mono text-sm", sortBy === "linesOfCode" && "text-accent-cyan font-semibold")}>
                        {formatNumber(entry.linesOfCode)}
                      </td>
                      <td className={cn("px-4 py-3 text-right font-mono text-sm", sortBy === "hoursSaved" && "text-accent-cyan font-semibold")}>
                        {formatHours(entry.hoursSaved)}
                      </td>
                      <td className={cn("px-4 py-3 text-right font-mono text-sm", sortBy === "tokens" && "text-accent-cyan font-semibold")}>
                        {formatTokens(entry.tokens)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm">{formatCurrency(entry.cost)}</td>
                      <td className={cn("px-4 py-3 text-right font-mono text-sm", sortBy === "value" && "text-accent-cyan font-semibold")}>
                        {formatCurrency(entry.value)}
                      </td>
                      <td className={cn("px-4 py-3 text-right font-mono text-sm", sortBy === "roi" && "text-accent-cyan font-semibold")}>
                        <span className={entry.roi > 0 ? "text-green-400" : "text-foreground-muted"}>
                          {entry.roi > 0 ? "+" : ""}{entry.roi.toFixed(0)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
