"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { 
  FolderTree, 
  FileCode, 
  GitBranch, 
  Code2,
  CheckCircle,
  XCircle,
  AlertOctagon,
  Trash2
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  Legend
} from "recharts";

interface ProjectMetric {
  name: string;
  linesAdded: number;
  linesDeleted: number;
  netLines: number;
  filesChanged: number;
  lastActive: string;
  sessions: number;
  tools: string[];
}

interface FileHotspot {
  path: string;
  repo: string;
  count: number;
  lines: number;
}

interface QualityMetrics {
  acceptanceRate: number;
  rejectionRate: number;
  modificationRate: number;
  wasteRate: number;
  totalDecisions: number;
  history: { date: string; rate: number }[];
}

interface CodebaseData {
  projects: ProjectMetric[];
  hotspots: FileHotspot[];
}

export default function CodebasePage() {
  const [data, setData] = useState<CodebaseData | null>(null);
  const [quality, setQuality] = useState<QualityMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [codebaseRes, qualityRes] = await Promise.all([
          fetch("/api/v1/codebase?range=30"),
          fetch("/api/v1/codebase/quality?range=30")
        ]);

        if (codebaseRes.ok && qualityRes.ok) {
          const codebaseJson = await codebaseRes.json();
          const qualityJson = await qualityRes.json();
          setData(codebaseJson);
          setQuality(qualityJson);
        }
      } catch (error) {
        console.error("Failed to fetch metrics", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <DashboardLayout title="Codebase Intelligence">
        <div className="p-8 text-center text-foreground-muted">Loading codebase intelligence...</div>
      </DashboardLayout>
    );
  }

  if (!data || !quality) {
    return (
      <DashboardLayout title="Codebase Intelligence">
        <div className="p-8 text-center text-foreground-muted">Failed to load data.</div>
      </DashboardLayout>
    );
  }

  const totalLinesAdded = data.projects.reduce((acc, p) => acc + (p.linesAdded || 0), 0);
  const activeRepos = data.projects.length;
  
  const chartData = [...data.projects]
    .sort((a, b) => (b.linesAdded || 0) - (a.linesAdded || 0))
    .slice(0, 5);

  const COLORS = ["var(--accent-cyan)", "var(--accent-purple)", "var(--accent-pink)", "var(--accent-green)", "var(--accent-yellow)"];

  return (
    <DashboardLayout title="Codebase Intelligence">
      <div className="space-y-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Codebase Intelligence</h1>
          <p className="text-foreground-secondary">
            Analyze AI impact, saturation, and code quality across your repositories.
          </p>
        </div>

        {/* Overview Stats */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-foreground-secondary">
                Active Repositories
              </CardTitle>
              <GitBranch className="h-4 w-4 text-accent-cyan" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{activeRepos}</div>
              <p className="text-xs text-foreground-muted">
                Touched by AI in last 30 days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-foreground-secondary">
                Total AI Lines Added
              </CardTitle>
              <Code2 className="h-4 w-4 text-accent-purple" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalLinesAdded.toLocaleString()}</div>
              <p className="text-xs text-foreground-muted">
                Across all projects
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-foreground-secondary">
                Top Hotspot
              </CardTitle>
              <FileCode className="h-4 w-4 text-accent-pink" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold truncate">
                {data.hotspots[0]?.path ? data.hotspots[0].path.split('/').pop() : "None"}
              </div>
              <p className="text-xs text-foreground-muted truncate">
                {data.hotspots[0]?.repo || "No activity"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Code Quality Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">Code Quality & Churn</h2>
          <div className="grid gap-6 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-foreground-secondary">Acceptance Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-accent-green" />
                  <span className="text-2xl font-bold">{quality.acceptanceRate.toFixed(1)}%</span>
                </div>
                <p className="text-xs text-foreground-muted mt-1">Edits accepted without change</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-foreground-secondary">Modification Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <AlertOctagon className="h-4 w-4 text-accent-yellow" />
                  <span className="text-2xl font-bold">{quality.modificationRate.toFixed(1)}%</span>
                </div>
                <p className="text-xs text-foreground-muted mt-1">Edits required manual fix</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-foreground-secondary">Rejection Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-accent-red" />
                  <span className="text-2xl font-bold">{quality.rejectionRate.toFixed(1)}%</span>
                </div>
                <p className="text-xs text-foreground-muted mt-1">Edits completely discarded</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-foreground-secondary">AI Waste</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4 text-accent-pink" />
                  <span className="text-2xl font-bold">{quality.wasteRate.toFixed(1)}%</span>
                </div>
                <p className="text-xs text-foreground-muted mt-1">Estimated churned lines</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Activity Chart */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>AI Volume by Repository</CardTitle>
              <CardDescription>Lines of code added per project</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} opacity={0.5} />
                    <XAxis type="number" stroke="var(--foreground-muted)" fontSize={12} />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      stroke="var(--foreground-muted)" 
                      fontSize={12} 
                      width={100}
                      tickFormatter={(val) => val.length > 15 ? val.substring(0, 15) + '...' : val}
                    />
                    <Tooltip 
                      cursor={{fill: 'transparent'}}
                      contentStyle={{ backgroundColor: "var(--background-secondary)", borderColor: "var(--border)" }}
                      itemStyle={{ color: "var(--foreground)" }}
                    />
                    <Bar dataKey="linesAdded" radius={[0, 4, 4, 0]} name="Lines Added">
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Quality Trend Chart */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Acceptance Rate Trend</CardTitle>
              <CardDescription>Daily code acceptance percentage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={quality.history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                    <XAxis 
                      dataKey="date" 
                      stroke="var(--foreground-muted)" 
                      fontSize={12} 
                      tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                    />
                    <YAxis stroke="var(--foreground-muted)" fontSize={12} domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "var(--background-secondary)", borderColor: "var(--border)" }}
                      itemStyle={{ color: "var(--foreground)" }}
                    />
                    <Line type="monotone" dataKey="rate" stroke="var(--accent-green)" strokeWidth={2} dot={false} name="Acceptance %" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Projects Table */}
        <Card>
          <CardHeader>
            <CardTitle>Repository Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-foreground-muted">
                    <th className="pb-3 font-medium">Repository</th>
                    <th className="pb-3 font-medium">Tools Used</th>
                    <th className="pb-3 font-medium text-right">Sessions</th>
                    <th className="pb-3 font-medium text-right">Lines Added</th>
                    <th className="pb-3 font-medium text-right">Files Changed</th>
                    <th className="pb-3 font-medium text-right">Last Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {data.projects.map((project) => (
                    <tr key={project.name} className="group">
                      <td className="py-3 font-medium">
                        <div className="flex items-center gap-2">
                          <FolderTree className="h-4 w-4 text-accent-cyan" />
                          {project.name}
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="flex gap-1">
                          {project.tools.map((tool) => (
                            <span key={tool} className="inline-flex items-center rounded-full bg-background-secondary px-2 py-0.5 text-xs text-foreground-secondary">
                              {tool}
                            </span>
                          ))}
                          {project.tools.length === 0 && <span className="text-foreground-muted">-</span>}
                        </div>
                      </td>
                      <td className="py-3 text-right">{project.sessions}</td>
                      <td className="py-3 text-right font-mono text-accent-green">+{project.linesAdded.toLocaleString()}</td>
                      <td className="py-3 text-right">{project.filesChanged}</td>
                      <td className="py-3 text-right text-foreground-muted">
                        {project.lastActive ? new Date(project.lastActive).toLocaleDateString() : "-"}
                      </td>
                    </tr>
                  ))}
                  {data.projects.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-foreground-muted">
                        No repository activity found.
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
