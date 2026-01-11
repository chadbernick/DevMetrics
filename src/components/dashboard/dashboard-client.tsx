"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { MetricCard } from "@/components/dashboard/metric-card";
import { UserFilter } from "@/components/dashboard/user-filter";
import { AreaChart } from "@/components/charts/area-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { BarChart } from "@/components/charts/bar-chart";
import { ProgressRing } from "@/components/charts/progress-ring";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Zap,
  Code2,
  Clock,
  TrendingUp,
  Sparkles,
  Loader2,
} from "lucide-react";

interface DashboardData {
  totals: {
    sessions: number;
    minutes: number;
    tokens: number;
    cost: number;
    linesAdded: number;
    linesModified: number;
    features: number;
    bugs: number;
    refactors: number;
    prs: number;
    hoursSaved: number;
    value: number;
  };
  changes: {
    sessions: number | null;
    linesOfCode: number | null;
    hoursSaved: number | null;
    roi: number | null;
  };
  timeSeries: Array<{ date: string; tokens: number; cost: number; lines: number }>;
  toolUsage: Array<{ name: string; sessions: number; color: string }>;
  recentSessions: Array<{
    id: string;
    userId: string;
    tool: string;
    model: string | null;
    startedAt: Date;
    endedAt: Date | null;
    durationMinutes: number | null;
    status: string;
    projectName: string | null;
    userName: string;
  }>;
  roi: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  engineerLevel: string;
}

interface DashboardClientProps {
  initialData: DashboardData;
  users: User[];
}

export function DashboardClient({ initialData, users }: DashboardClientProps) {
  const [data, setData] = useState<DashboardData>(initialData);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = useCallback(async (userId: string | null) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (userId) {
        params.set("userId", userId);
      }

      const response = await fetch(`/api/v1/dashboard?${params.toString()}`);
      if (response.ok) {
        const newData = await response.json();
        setData(newData);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedUserId !== null || selectedUserId === null) {
      // Only fetch if user changed from initial state
      if (selectedUserId !== null) {
        fetchData(selectedUserId);
      } else {
        // Reset to initial data when "All Team Members" is selected
        setData(initialData);
      }
    }
  }, [selectedUserId, fetchData, initialData]);

  const handleUserChange = (userId: string | null) => {
    setSelectedUserId(userId);
  };

  const selectedUserName = selectedUserId
    ? users.find(u => u.id === selectedUserId)?.name
    : null;
  const workTypeData = [
    { name: "Features", value: data.totals.features, color: "var(--accent-cyan)" },
    { name: "Bug Fixes", value: data.totals.bugs, color: "var(--accent-purple)" },
    { name: "Refactors", value: data.totals.refactors, color: "var(--accent-pink)" },
  ];

  return (
    <DashboardLayout title={selectedUserName ? `${selectedUserName}'s Metrics` : "Team Dashboard"}>
      <div className="space-y-6">
        {/* Filter Row */}
        <div className="flex items-center justify-between">
          <UserFilter
            users={users}
            selectedUserId={selectedUserId}
            onUserChange={handleUserChange}
          />
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-foreground-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </div>
          )}
        </div>

        {/* Top Metrics Row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Sessions"
            value={data.totals.sessions}
            format="number"
            change={data.changes.sessions ?? undefined}
            icon={Zap}
            color="cyan"
          />
          <MetricCard
            title="Lines of Code"
            value={data.totals.linesAdded + data.totals.linesModified}
            format="number"
            change={data.changes.linesOfCode ?? undefined}
            icon={Code2}
            color="purple"
          />
          <MetricCard
            title="Hours Saved"
            value={data.totals.hoursSaved}
            format="duration"
            change={data.changes.hoursSaved ?? undefined}
            icon={Clock}
            color="green"
          />
          <MetricCard
            title="ROI"
            value={data.roi}
            format="percentage"
            change={data.changes.roi ?? undefined}
            icon={TrendingUp}
            color="cyan"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <AreaChart
              title="Token Usage Over Time"
              data={data.timeSeries}
              dataKeys={[
                { key: "tokens", label: "Total Tokens", color: "var(--accent-cyan)" },
              ]}
              xAxisKey="date"
              height={300}
            />
          </div>
          <DonutChart
            title="Work by Type"
            data={workTypeData}
            centerValue={`${data.totals.features + data.totals.bugs + data.totals.refactors}`}
            centerLabel="Total"
            height={300}
          />
        </div>

        {/* Second Row */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* ROI Summary */}
          <Card>
            <CardHeader>
              <CardTitle>ROI Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground-secondary">AI Tool Cost</span>
                <span className="font-medium text-accent-red">
                  ${data.totals.cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground-secondary">Value Generated</span>
                <span className="font-medium text-accent-green">
                  ${data.totals.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Net Savings</span>
                <span className="text-lg font-bold text-accent-cyan">
                  ${(data.totals.value - data.totals.cost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="mt-4 rounded-lg bg-accent-cyan/10 p-4 text-center">
                <span className="text-3xl font-bold text-accent-cyan">
                  {data.roi.toFixed(0)}%
                </span>
                <p className="mt-1 text-sm text-foreground-secondary">Return on Investment</p>
              </div>
            </CardContent>
          </Card>

          {/* Work Items Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Work Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-around">
                <ProgressRing
                  value={data.totals.features}
                  max={50}
                  label="Features"
                  sublabel="completed"
                  color="cyan"
                  size={100}
                />
                <ProgressRing
                  value={data.totals.bugs}
                  max={30}
                  label="Bugs Fixed"
                  sublabel="resolved"
                  color="purple"
                  size={100}
                />
                <ProgressRing
                  value={data.totals.prs}
                  max={40}
                  label="PRs"
                  sublabel="created"
                  color="green"
                  size={100}
                />
              </div>
            </CardContent>
          </Card>

          {/* Tool Usage */}
          <BarChart
            title="Sessions by Tool"
            data={data.toolUsage}
            dataKeys={[{ key: "sessions", label: "Sessions", color: "var(--accent-cyan)" }]}
            xAxisKey="name"
            height={220}
            showLegend={false}
          />
        </div>

        {/* Recent Sessions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left text-sm text-foreground-secondary">
                    <th className="pb-3 font-medium">User</th>
                    <th className="pb-3 font-medium">Tool</th>
                    <th className="pb-3 font-medium">Duration</th>
                    <th className="pb-3 font-medium">Project</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {data.recentSessions.map((session) => (
                    <tr key={session.id} className="border-b border-border/50">
                      <td className="py-3">{session.userName}</td>
                      <td className="py-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-accent-cyan/10 px-2 py-1 text-xs text-accent-cyan">
                          <Sparkles className="h-3 w-3" />
                          {session.tool.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3 text-foreground-secondary">
                        {session.durationMinutes ? `${session.durationMinutes}m` : "—"}
                      </td>
                      <td className="py-3 text-foreground-secondary">
                        {session.projectName || "—"}
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs ${
                            session.status === "completed"
                              ? "bg-accent-green/10 text-accent-green"
                              : session.status === "active"
                              ? "bg-accent-yellow/10 text-accent-yellow"
                              : "bg-foreground-muted/10 text-foreground-muted"
                          }`}
                        >
                          {session.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {data.recentSessions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-foreground-muted">
                        No sessions yet. Run the seed script to generate sample data.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
