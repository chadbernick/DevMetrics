"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog } from "@/components/ui/dialog";
import {
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Code2,
  Clock,
  GitCommit,
  GitPullRequest,
  CheckCircle,
  TrendingUp,
  Check,
  AlertCircle,
  Loader2,
} from "lucide-react";

// Static color classes map - Tailwind can't detect dynamic classes
const colorClasses: Record<string, { bg: string; text: string }> = {
  cyan: { bg: "bg-accent-cyan/20", text: "text-accent-cyan" },
  purple: { bg: "bg-accent-purple/20", text: "text-accent-purple" },
  green: { bg: "bg-accent-green/20", text: "text-accent-green" },
  pink: { bg: "bg-accent-pink/20", text: "text-accent-pink" },
  yellow: { bg: "bg-accent-yellow/20", text: "text-accent-yellow" },
  red: { bg: "bg-accent-red/20", text: "text-accent-red" },
};

interface MetricConfig {
  id: string;
  metricKey: string;
  displayName: string;
  description: string | null;
  category: "usage" | "cost" | "productivity" | "code" | "activity";
  dataSource: "otlp_metric" | "otlp_log" | "computed" | "github";
  otlpMetricName: string | null;
  format: string;
  icon: string | null;
  color: string | null;
  isEnabled: boolean;
  displayOrder: number;
  showInTopRow: boolean;
  showInChart: boolean;
}

interface AddDataModalProps {
  open: boolean;
  onClose: () => void;
  onMetricsUpdated?: () => void;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Code2,
  Clock,
  GitCommit,
  GitPullRequest,
  CheckCircle,
  TrendingUp,
};

const categoryLabels: Record<string, string> = {
  usage: "Usage Metrics",
  cost: "Cost Metrics",
  productivity: "Productivity Metrics",
  code: "Code Metrics",
  activity: "Activity Metrics",
};

const categoryOrder = ["usage", "cost", "code", "productivity", "activity"];

export function AddDataModal({ open, onClose, onMetricsUpdated }: AddDataModalProps) {
  const [metrics, setMetrics] = useState<MetricConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/v1/dashboard-metrics");
      if (!response.ok) {
        throw new Error("Failed to fetch metrics");
      }
      const data = await response.json();
      setMetrics(data.metrics);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load metrics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchMetrics();
    }
  }, [open, fetchMetrics]);

  const toggleMetric = async (metric: MetricConfig) => {
    try {
      setSaving(metric.id);
      setError(null);

      const response = await fetch("/api/v1/dashboard-metrics", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metricId: metric.id,
          updates: { isEnabled: !metric.isEnabled },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update metric");
      }

      // Update local state
      setMetrics((prev) =>
        prev.map((m) =>
          m.id === metric.id ? { ...m, isEnabled: !m.isEnabled } : m
        )
      );

      onMetricsUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update metric");
    } finally {
      setSaving(null);
    }
  };

  const groupedMetrics = categoryOrder.reduce((acc, category) => {
    const categoryMetrics = metrics.filter((m) => m.category === category);
    if (categoryMetrics.length > 0) {
      acc[category] = categoryMetrics;
    }
    return acc;
  }, {} as Record<string, MetricConfig[]>);

  const enabledCount = metrics.filter((m) => m.isEnabled).length;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Configure Dashboard Widgets"
      description="Select which metrics to display on your dashboard. Enabled widgets can be dragged and rearranged."
      maxWidth="2xl"
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-accent-cyan" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <AlertCircle className="h-8 w-8 text-accent-red" />
          <p className="text-foreground-muted">{error}</p>
          <button
            onClick={fetchMetrics}
            className="rounded-lg bg-accent-cyan px-4 py-2 text-sm font-medium text-white hover:bg-accent-cyan/90"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary */}
          <div className="flex items-center justify-between rounded-lg bg-background p-4">
            <p className="text-sm text-foreground-muted">
              {enabledCount} widget{enabledCount !== 1 ? "s" : ""} enabled
            </p>
            <div className="text-xs text-foreground-muted">
              Data source: <span className="text-accent-cyan">OpenTelemetry</span>
            </div>
          </div>

          {/* Metrics by category */}
          <div className="max-h-[50vh] space-y-6 overflow-y-auto pr-2">
            {Object.entries(groupedMetrics).map(([category, categoryMetrics]) => (
              <div key={category}>
                <h3 className="mb-3 text-sm font-medium text-foreground-muted">
                  {categoryLabels[category] ?? category}
                </h3>
                <div className="space-y-2">
                  {categoryMetrics.map((metric) => {
                    const IconComponent = metric.icon
                      ? iconMap[metric.icon]
                      : Zap;
                    const isSaving = saving === metric.id;

                    return (
                      <div
                        key={metric.id}
                        className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                          metric.isEnabled
                            ? "border-accent-cyan/30 bg-accent-cyan/5"
                            : "border-border bg-background"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                              metric.isEnabled
                                ? `${colorClasses[metric.color ?? "cyan"]?.bg ?? "bg-accent-cyan/20"} ${colorClasses[metric.color ?? "cyan"]?.text ?? "text-accent-cyan"}`
                                : "bg-background-secondary text-foreground-muted"
                            }`}
                          >
                            {IconComponent && <IconComponent className="h-5 w-5" />}
                          </div>
                          <div>
                            <p className="font-medium">{metric.displayName}</p>
                            <p className="text-xs text-foreground-muted">
                              {metric.description ?? metric.otlpMetricName}
                            </p>
                          </div>
                        </div>

                        {/* Enable/Disable toggle */}
                        <button
                          onClick={() => toggleMetric(metric)}
                          disabled={isSaving}
                          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                            metric.isEnabled
                              ? "bg-accent-cyan text-white"
                              : "bg-background-secondary text-foreground-muted hover:bg-background"
                          }`}
                        >
                          {isSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : metric.isEnabled ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <div className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* OTLP Setup Info */}
          <div className="rounded-lg border border-border bg-background p-4">
            <h4 className="mb-2 font-medium">OpenTelemetry Setup</h4>
            <p className="mb-3 text-sm text-foreground-muted">
              Configure Claude Code to send metrics to this dashboard:
            </p>
            <pre className="overflow-x-auto rounded-lg bg-background-secondary p-3 text-xs">
              <code>{`# Add to your shell profile (~/.zshrc or ~/.bashrc)
export CLAUDE_CODE_ENABLE_TELEMETRY=1
export OTEL_METRICS_EXPORTER=otlp
export OTEL_LOGS_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_PROTOCOL=http/json
export OTEL_EXPORTER_OTLP_ENDPOINT=${typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/api/v1/otlp`}</code>
            </pre>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-foreground-muted transition-colors hover:bg-background-secondary"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
