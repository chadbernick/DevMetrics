"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { 
  GitPullRequest, 
  Clock, 
  AlertTriangle, 
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";

interface DoraMetrics {
  deploymentFrequency: {
    value: number;
    unit: string;
    total: number;
    history: { date: string; count: number }[];
  };
  leadTime: {
    value: number;
    unit: string;
    sampleSize: number;
  };
  changeFailureRate: {
    value: number;
    unit: string;
    totalCommits: number;
    bugFixes: number;
  };
}

export default function DoraPage() {
  const [metrics, setMetrics] = useState<DoraMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const res = await fetch("/api/v1/dora?range=30");
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
  }, []);

  if (loading) {
    return (
      <DashboardLayout title="DORA & Speed">
        <div className="p-8 text-center text-foreground-muted">Loading metrics...</div>
      </DashboardLayout>
    );
  }

  if (!metrics) {
    return (
      <DashboardLayout title="DORA & Speed">
        <div className="p-8 text-center text-foreground-muted">Failed to load metrics.</div>
      </DashboardLayout>
    );
  }

  const getRating = (metric: "deploy" | "lead" | "failure", value: number) => {
    if (metric === "deploy") {
      if (value > 7) return { label: "Elite", color: "text-green-400" };
      if (value > 1) return { label: "High", color: "text-blue-400" };
      return { label: "Medium", color: "text-yellow-400" };
    }
    if (metric === "lead") {
      if (value < 24) return { label: "Elite", color: "text-green-400" };
      if (value < 168) return { label: "High", color: "text-blue-400" };
      return { label: "Medium", color: "text-yellow-400" };
    }
    if (metric === "failure") {
      if (value < 15) return { label: "Elite", color: "text-green-400" };
      if (value < 30) return { label: "High", color: "text-blue-400" };
      return { label: "Low", color: "text-red-400" };
    }
    return { label: "Unknown", color: "text-gray-400" };
  };

  const deployRating = getRating("deploy", metrics.deploymentFrequency.value);
  const leadRating = getRating("lead", metrics.leadTime.value);
  const failureRating = getRating("failure", metrics.changeFailureRate.value);

  return (
    <DashboardLayout title="DORA & Speed">
      <div className="space-y-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">DORA & Speed Metrics</h1>
          <p className="text-foreground-secondary">
            Measuring software delivery performance and AI impact on velocity.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-foreground-secondary">
                Deployment Frequency
              </CardTitle>
              <GitPullRequest className="h-4 w-4 text-accent-cyan" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics.deploymentFrequency.value}</div>
              <p className="text-xs text-foreground-muted mb-2">{metrics.deploymentFrequency.unit}</p>
              <div className={`flex items-center text-sm font-medium ${deployRating.color}`}>
                {deployRating.label} Performer
              </div>
              <p className="text-xs text-foreground-muted mt-4">
                Total: {metrics.deploymentFrequency.total} deploys (30d)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-foreground-secondary">
                Lead Time for Changes
              </CardTitle>
              <Clock className="h-4 w-4 text-accent-purple" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics.leadTime.value}</div>
              <p className="text-xs text-foreground-muted mb-2">{metrics.leadTime.unit}</p>
              <div className={`flex items-center text-sm font-medium ${leadRating.color}`}>
                {leadRating.label} Performer
              </div>
              <p className="text-xs text-foreground-muted mt-4">
                AI Session → Merge (n={metrics.leadTime.sampleSize})
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-foreground-secondary">
                Change Failure Rate
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-accent-pink" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics.changeFailureRate.value}%</div>
              <p className="text-xs text-foreground-muted mb-2">bug fix ratio</p>
              <div className={`flex items-center text-sm font-medium ${failureRating.color}`}>
                {failureRating.label} Performer
              </div>
              <p className="text-xs text-foreground-muted mt-4">
                {metrics.changeFailureRate.bugFixes} fixes / {metrics.changeFailureRate.totalCommits} commits
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Deployment Activity</CardTitle>
            <CardDescription>Merges to main over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.deploymentFrequency.history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                  <XAxis 
                    dataKey="date" 
                    stroke="var(--foreground-muted)" 
                    fontSize={12} 
                    tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                  />
                  <YAxis stroke="var(--foreground-muted)" fontSize={12} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "var(--background-secondary)", borderColor: "var(--border)" }}
                    itemStyle={{ color: "var(--foreground)" }}
                  />
                  <Bar dataKey="count" fill="var(--accent-cyan)" radius={[4, 4, 0, 0]} name="Deploys" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
