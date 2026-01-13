"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { WidgetGrid, type Widget } from "@/components/dashboard/widget-grid";
import { UserFilter } from "@/components/dashboard/user-filter";
import { RefreshControl } from "@/components/dashboard/refresh-control";
import { AreaChart } from "@/components/charts/area-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { BarChart } from "@/components/charts/bar-chart";
import { ProgressRing } from "@/components/charts/progress-ring";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Sparkles,
  Loader2,
  Pencil,
  Check,
  AlertCircle,
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
  widgets: Widget[];
  metricValues: Record<string, number>;
  metricChanges: Record<string, number | null>;
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
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(new Date());
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null);
  const [isEditingWidgets, setIsEditingWidgets] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async (userId: string | null, isAutoRefresh = false) => {
    // Don't show loading spinner for auto-refresh to avoid UI flicker
    if (!isAutoRefresh) {
      setIsLoading(true);
      setError(null);
    }
    try {
      const params = new URLSearchParams();
      if (userId) {
        params.set("userId", userId);
      }

      const response = await fetch(`/api/v1/dashboard?${params.toString()}`);

      if (!response.ok) {
        if (response.status === 401) {
          setError("Session expired. Please refresh the page to log in again.");
        } else if (response.status === 403) {
          setError("You don't have permission to view this data.");
        } else {
          setError("Failed to load dashboard data. Please try again.");
        }
        console.error(`Dashboard fetch failed: ${response.status} ${response.statusText}`);
        return;
      }

      const newData = await response.json();
      setData(newData);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      if (!isAutoRefresh) {
        setError("Network error. Please check your connection and try again.");
      }
    } finally {
      if (!isAutoRefresh) {
        setIsLoading(false);
      }
    }
  }, []);

  // Handle user filter changes
  useEffect(() => {
    if (selectedUserId !== null) {
      fetchData(selectedUserId);
    } else {
      // Reset to initial data when "All Team Members" is selected
      setData(initialData);
      setLastUpdated(new Date());
    }
  }, [selectedUserId, fetchData, initialData]);

  // Auto-refresh interval
  useEffect(() => {
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Set up new interval if auto-refresh is enabled
    if (refreshInterval !== null && refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        fetchData(selectedUserId, true);
      }, refreshInterval);
    }

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [refreshInterval, selectedUserId, fetchData]);

  const handleUserChange = (userId: string | null) => {
    setSelectedUserId(userId);
  };

  const handleManualRefresh = useCallback(() => {
    fetchData(selectedUserId);
  }, [fetchData, selectedUserId]);

  const handleIntervalChange = useCallback((intervalMs: number | null) => {
    setRefreshInterval(intervalMs);
  }, []);

  const handleWidgetReorder = useCallback(async (widgetId: string, newOrder: number) => {
    // Optimistically update local state
    setData((prev) => {
      const widgets = [...prev.widgets];
      const widgetIndex = widgets.findIndex((w) => w.id === widgetId);
      if (widgetIndex === -1) return prev;

      const widget = widgets[widgetIndex];
      const oldOrder = widget.displayOrder;

      // Update orders for affected widgets
      widgets.forEach((w) => {
        if (w.id === widgetId) {
          w.displayOrder = newOrder;
        } else if (oldOrder < newOrder) {
          // Moving down: decrease order of widgets in between
          if (w.displayOrder > oldOrder && w.displayOrder <= newOrder) {
            w.displayOrder--;
          }
        } else {
          // Moving up: increase order of widgets in between
          if (w.displayOrder >= newOrder && w.displayOrder < oldOrder) {
            w.displayOrder++;
          }
        }
      });

      // Sort by new order
      widgets.sort((a, b) => a.displayOrder - b.displayOrder);

      return { ...prev, widgets };
    });

    // Persist to database
    try {
      await fetch("/api/v1/dashboard-metrics", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metricId: widgetId,
          updates: { displayOrder: newOrder },
        }),
      });
    } catch (error) {
      console.error("Failed to save widget order:", error);
      // Refresh to restore correct state
      fetchData(selectedUserId);
    }
  }, [fetchData, selectedUserId]);

  const selectedUserName = selectedUserId
    ? users.find(u => u.id === selectedUserId)?.name
    : null;
  const workTypeData = [
    { name: "Features", value: data.totals.features, color: "var(--accent-cyan)" },
    { name: "Bug Fixes", value: data.totals.bugs, color: "var(--accent-purple)" },
    { name: "Refactors", value: data.totals.refactors, color: "var(--accent-pink)" },
  ];

  return (
    <DashboardLayout
      title={selectedUserName ? `${selectedUserName}'s Metrics` : "Team Dashboard"}
      onMetricsUpdated={handleManualRefresh}
    >
      <div className="space-y-6">
        {/* Filter Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
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
          <RefreshControl
            onRefresh={handleManualRefresh}
            onIntervalChange={handleIntervalChange}
            lastUpdated={lastUpdated}
            isLoading={isLoading}
          />
        </div>

        {/* Error Alert */}
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-500">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-500 hover:text-red-400"
              >
                <span className="sr-only">Dismiss</span>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Top Metrics Row */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground-muted">Key Metrics</h2>
            <button
              onClick={() => setIsEditingWidgets(!isEditingWidgets)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                isEditingWidgets
                  ? "bg-accent-cyan text-white"
                  : "bg-background-secondary text-foreground-muted hover:bg-background hover:text-foreground"
              }`}
            >
              {isEditingWidgets ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Done
                </>
              ) : (
                <>
                  <Pencil className="h-3.5 w-3.5" />
                  Edit Layout
                </>
              )}
            </button>
          </div>
          {isEditingWidgets && (
            <p className="text-xs text-foreground-muted">
              Drag widgets to reorder them. Use &quot;Add Data&quot; to enable more metrics.
            </p>
          )}
          <WidgetGrid
            widgets={data.widgets ?? []}
            metricValues={data.metricValues ?? {}}
            metricChanges={data.metricChanges ?? {}}
            onReorder={handleWidgetReorder}
            isEditing={isEditingWidgets}
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
                  {Number.isFinite(data.roi) ? data.roi.toFixed(0) : "0"}%
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
