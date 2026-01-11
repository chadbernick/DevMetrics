"use client";

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface BarChartProps {
  data: Array<Record<string, unknown>>;
  title?: string;
  dataKeys: Array<{
    key: string;
    label: string;
    color: string;
  }>;
  xAxisKey?: string;
  height?: number;
  showLegend?: boolean;
  layout?: "horizontal" | "vertical";
  stacked?: boolean;
}

export function BarChart({
  data,
  title,
  dataKeys,
  xAxisKey = "name",
  height = 300,
  showLegend = true,
  layout = "vertical",
  stacked = false,
}: BarChartProps) {
  return (
    <Card>
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <RechartsBarChart
            data={data}
            layout={layout}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={layout === "vertical"} vertical={layout === "horizontal"} />
            {layout === "vertical" ? (
              <>
                <XAxis
                  type="number"
                  stroke="var(--foreground-muted)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => {
                    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                    return value;
                  }}
                />
                <YAxis
                  type="category"
                  dataKey={xAxisKey}
                  stroke="var(--foreground-muted)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={80}
                />
              </>
            ) : (
              <>
                <XAxis
                  dataKey={xAxisKey}
                  stroke="var(--foreground-muted)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--foreground-muted)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => {
                    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                    return value;
                  }}
                />
              </>
            )}
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--background-card)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              labelStyle={{ color: "var(--foreground)" }}
              cursor={{ fill: "var(--border)", opacity: 0.3 }}
            />
            {showLegend && dataKeys.length > 1 && (
              <Legend
                verticalAlign="top"
                height={36}
                iconType="circle"
                wrapperStyle={{ fontSize: "12px" }}
              />
            )}
            {dataKeys.map((dk) => (
              <Bar
                key={dk.key}
                dataKey={dk.key}
                name={dk.label}
                fill={dk.color}
                radius={[4, 4, 4, 4]}
                stackId={stacked ? "stack" : undefined}
              />
            ))}
          </RechartsBarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
