"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface DonutChartProps {
  data: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  title?: string;
  centerLabel?: string;
  centerValue?: string | number;
  height?: number;
  showLegend?: boolean;
}

export function DonutChart({
  data,
  title,
  centerLabel,
  centerValue,
  height = 250,
  showLegend = true,
}: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card>
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <div className="relative">
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--background-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value) => {
                  const numValue = typeof value === 'number' ? value : 0;
                  return [`${numValue.toLocaleString()} (${((numValue / total) * 100).toFixed(1)}%)`];
                }}
              />
              {showLegend && (
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  wrapperStyle={{ fontSize: "12px", paddingTop: "16px" }}
                />
              )}
            </PieChart>
          </ResponsiveContainer>
          {(centerLabel || centerValue) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {centerValue && (
                <span className="text-2xl font-bold text-accent-cyan">{centerValue}</span>
              )}
              {centerLabel && (
                <span className="text-sm text-foreground-muted">{centerLabel}</span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
