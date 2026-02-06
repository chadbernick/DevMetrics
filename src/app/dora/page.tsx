"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import {
  Rocket,
  Clock,
  AlertTriangle,
  Wrench,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { cn } from "@/lib/utils/cn";

interface DoraApiResponse {
  deployFrequency: {
    value: string;
    rating: "elite" | "high" | "medium" | "low";
    trend: "up" | "down" | "neutral";
    previousValue?: string;
    raw: {
      perWeek: number;
      total: number;
      successful: number;
      failed: number;
      history: { date: string; count: number; success: number; failed: number }[];
    };
  };
  leadTime: {
    value: string;
    rating: "elite" | "high" | "medium" | "low";
    trend: "up" | "down" | "neutral";
    raw: {
      avgHours: number;
      avgMinutes: number;
      sampleSize: number;
    };
  };
  changeFailureRate: {
    value: string;
    rating: "elite" | "high" | "medium" | "low";
    trend: "up" | "down" | "neutral";
    previousValue?: string;
    raw: {
      percentage: number;
      totalDeployments: number;
      failedDeployments: number;
    };
  };
  mttr: {
    value: string;
    rating: "elite" | "high" | "medium" | "low";
    trend: "up" | "down" | "neutral";
    raw: {
      avgMinutes: number;
      resolvedIncidents: number;
      openIncidents: number;
    };
  };
  overallRating: "elite" | "high" | "medium" | "low";
  period: {
    days: number;
    startDate: string;
    endDate: string;
  };
}

const ratingColors = {
  elite: "text-emerald-400",
  high: "text-blue-400",
  medium: "text-amber-400",
  low: "text-red-400",
};

const ratingBgColors = {
  elite: "bg-emerald-400/10 border-emerald-400/30",
  high: "bg-blue-400/10 border-blue-400/30",
  medium: "bg-amber-400/10 border-amber-400/30",
  low: "bg-red-400/10 border-red-400/30",
};

const ratingLabels = {
  elite: "Elite",
  high: "High",
  medium: "Medium",
  low: "Low",
};

const ratingDescriptions = {
  elite: "Top performers worldwide",
  high: "Above industry average",
  medium: "Industry average",
  low: "Below industry average",
};

function TrendIcon({ trend }: { trend: "up" | "down" | "neutral" }) {
  if (trend === "up") return <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />;
  if (trend === "down") return <TrendingDown className="h-3.5 w-3.5 text-red-400" />;
  return <Minus className="h-3.5 w-3.5 text-foreground-muted" />;
}

export default function DoraPage() {
  const [metrics, setMetrics] = useState<DoraApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(30);

  useEffect(() => {
    async function fetchMetrics() {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/dora?range=${range}`);
        if (res.ok) {
          const data = await res.json();
          setMetrics(data);
        }
      } catch (error) {
        console.error("Failed to fetch DORA metrics", error);
      } finally {
        setLoading(false);
      }
    }
    fetchMetrics();
  }, [range]);

  if (loading) {
    return (
      <DashboardLayout title="DORA Metrics">
        <div className="flex items-center justify-center h-64 text-foreground-muted">
          <div className="animate-pulse">Loading DORA metrics...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!metrics) {
    return (
      <DashboardLayout title="DORA Metrics">
        <div className="flex flex-col items-center justify-center h-64 text-foreground-muted gap-2">
          <AlertTriangle className="h-8 w-8" />
          <p>Failed to load DORA metrics</p>
        </div>
      </DashboardLayout>
    );
  }

  const metricCards = [
    {
      title: "Deploy Frequency",
      description: "How often code is deployed to production",
      icon: Rocket,
      iconColor: "text-accent-cyan",
      value: metrics.deployFrequency.value,
      rating: metrics.deployFrequency.rating,
      trend: metrics.deployFrequency.trend,
      detail: `${metrics.deployFrequency.raw.total} total (${metrics.deployFrequency.raw.successful} success, ${metrics.deployFrequency.raw.failed} failed)`,
      benchmark: "Elite: 7+/wk, High: 1-7/wk",
    },
    {
      title: "Lead Time",
      description: "Time from first commit to production",
      icon: Clock,
      iconColor: "text-accent-purple",
      value: metrics.leadTime.value,
      rating: metrics.leadTime.rating,
      trend: metrics.leadTime.trend,
      detail: `Based on ${metrics.leadTime.raw.sampleSize} deployments`,
      benchmark: "Elite: <1d, High: 1d-1wk",
    },
    {
      title: "Change Failure Rate",
      description: "Percentage of deployments causing failures",
      icon: AlertTriangle,
      iconColor: "text-accent-pink",
      value: metrics.changeFailureRate.value,
      rating: metrics.changeFailureRate.rating,
      trend: metrics.changeFailureRate.trend,
      detail: `${metrics.changeFailureRate.raw.failedDeployments}/${metrics.changeFailureRate.raw.totalDeployments} deployments failed`,
      benchmark: "Elite: <5%, High: 5-10%",
    },
    {
      title: "Mean Time to Recovery",
      description: "Average time to restore service after failure",
      icon: Wrench,
      iconColor: "text-accent-green",
      value: metrics.mttr.value,
      rating: metrics.mttr.rating,
      trend: metrics.mttr.trend,
      detail: `${metrics.mttr.raw.resolvedIncidents} resolved, ${metrics.mttr.raw.openIncidents} open`,
      benchmark: "Elite: <1h, High: <1d",
    },
  ];

  return (
    <DashboardLayout title="DORA Metrics">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">DORA Metrics</h1>
            <p className="text-sm text-foreground-muted mt-1">
              Software delivery performance based on DORA research
            </p>
          </div>

          {/* Range Selector */}
          <div className="flex items-center gap-2">
            {[7, 14, 30, 90].map((days) => (
              <button
                key={days}
                onClick={() => setRange(days)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                  range === days
                    ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30"
                    : "bg-background-secondary text-foreground-muted hover:text-foreground border border-transparent"
                )}
              >
                {days}d
              </button>
            ))}
          </div>
        </div>

        {/* Overall Rating Banner */}
        <div className={cn(
          "rounded-lg border p-4 flex items-center justify-between",
          ratingBgColors[metrics.overallRating]
        )}>
          <div className="flex items-center gap-4">
            <div className={cn("text-3xl font-bold", ratingColors[metrics.overallRating])}>
              {ratingLabels[metrics.overallRating]}
            </div>
            <div className="text-sm">
              <div className="font-medium">Overall DORA Rating</div>
              <div className="text-foreground-muted">{ratingDescriptions[metrics.overallRating]}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-foreground-muted">
            <Info className="h-3.5 w-3.5" />
            <span>
              {new Date(metrics.period.startDate).toLocaleDateString()} – {new Date(metrics.period.endDate).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {metricCards.map((metric) => (
            <div
              key={metric.title}
              className="rounded-lg border border-border bg-background-secondary p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <metric.icon className={cn("h-4 w-4", metric.iconColor)} />
                  <span className="text-xs font-medium text-foreground-muted">{metric.title}</span>
                </div>
                <TrendIcon trend={metric.trend} />
              </div>

              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-bold">{metric.value}</span>
                <span className={cn(
                  "text-xs font-medium px-1.5 py-0.5 rounded",
                  ratingBgColors[metric.rating],
                  ratingColors[metric.rating]
                )}>
                  {ratingLabels[metric.rating]}
                </span>
              </div>

              <p className="text-xs text-foreground-muted mb-2">{metric.description}</p>
              <p className="text-xs text-foreground-muted/70">{metric.detail}</p>

              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-[10px] text-foreground-muted/50">{metric.benchmark}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Deployment History Chart */}
        {metrics.deployFrequency.raw.history.length > 0 && (
          <div className="rounded-lg border border-border bg-background-secondary p-4">
            <div className="mb-4">
              <h3 className="text-sm font-medium">Deployment Activity</h3>
              <p className="text-xs text-foreground-muted">Daily deployments over the selected period</p>
            </div>

            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.deployFrequency.raw.history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                  <XAxis
                    dataKey="date"
                    stroke="var(--foreground-muted)"
                    fontSize={10}
                    tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  />
                  <YAxis
                    stroke="var(--foreground-muted)"
                    fontSize={10}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--background-secondary)",
                      borderColor: "var(--border)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelStyle={{ color: "var(--foreground)" }}
                    itemStyle={{ color: "var(--foreground-muted)" }}
                    labelFormatter={(val) => new Date(val).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  />
                  <Bar
                    dataKey="success"
                    stackId="a"
                    fill="var(--accent-cyan)"
                    radius={[0, 0, 0, 0]}
                    name="Successful"
                  />
                  <Bar
                    dataKey="failed"
                    stackId="a"
                    fill="var(--accent-pink)"
                    radius={[4, 4, 0, 0]}
                    name="Failed"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* DORA Benchmarks Reference */}
        <div className="rounded-lg border border-border bg-background-secondary p-4">
          <div className="mb-4">
            <h3 className="text-sm font-medium">DORA Performance Benchmarks</h3>
            <p className="text-xs text-foreground-muted">Based on State of DevOps research</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-foreground-muted font-medium">Metric</th>
                  <th className={cn("py-2 px-3 text-center font-medium", ratingColors.elite)}>Elite</th>
                  <th className={cn("py-2 px-3 text-center font-medium", ratingColors.high)}>High</th>
                  <th className={cn("py-2 px-3 text-center font-medium", ratingColors.medium)}>Medium</th>
                  <th className={cn("py-2 px-3 text-center font-medium", ratingColors.low)}>Low</th>
                </tr>
              </thead>
              <tbody className="text-foreground-muted">
                <tr className="border-b border-border/50">
                  <td className="py-2 px-3 font-medium text-foreground">Deploy Frequency</td>
                  <td className="py-2 px-3 text-center">On-demand (7+/wk)</td>
                  <td className="py-2 px-3 text-center">1-7/week</td>
                  <td className="py-2 px-3 text-center">1-4/month</td>
                  <td className="py-2 px-3 text-center">&lt;1/month</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 px-3 font-medium text-foreground">Lead Time</td>
                  <td className="py-2 px-3 text-center">&lt;1 day</td>
                  <td className="py-2 px-3 text-center">1 day - 1 week</td>
                  <td className="py-2 px-3 text-center">1 week - 1 month</td>
                  <td className="py-2 px-3 text-center">&gt;1 month</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 px-3 font-medium text-foreground">Change Failure Rate</td>
                  <td className="py-2 px-3 text-center">0-5%</td>
                  <td className="py-2 px-3 text-center">5-10%</td>
                  <td className="py-2 px-3 text-center">10-15%</td>
                  <td className="py-2 px-3 text-center">&gt;15%</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-medium text-foreground">MTTR</td>
                  <td className="py-2 px-3 text-center">&lt;1 hour</td>
                  <td className="py-2 px-3 text-center">&lt;1 day</td>
                  <td className="py-2 px-3 text-center">1 day - 1 week</td>
                  <td className="py-2 px-3 text-center">&gt;1 week</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
