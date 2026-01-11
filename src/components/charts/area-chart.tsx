"use client";

import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface AreaChartProps {
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
  gradientFill?: boolean;
}

export function AreaChart({
  data,
  title,
  dataKeys,
  xAxisKey = "date",
  height = 300,
  showLegend = true,
  gradientFill = true,
}: AreaChartProps) {
  return (
    <Card>
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <RechartsAreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              {dataKeys.map((dk) => (
                <linearGradient key={`gradient-${dk.key}`} id={`gradient-${dk.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={dk.color} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={dk.color} stopOpacity={0.05} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey={xAxisKey}
              stroke="var(--foreground-muted)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => {
                if (typeof value === "string" && value.includes("-")) {
                  const date = new Date(value);
                  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                }
                return value;
              }}
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
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--background-card)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              labelStyle={{ color: "var(--foreground)" }}
              itemStyle={{ color: "var(--foreground-secondary)" }}
            />
            {showLegend && (
              <Legend
                verticalAlign="top"
                height={36}
                iconType="circle"
                wrapperStyle={{ fontSize: "12px" }}
              />
            )}
            {dataKeys.map((dk) => (
              <Area
                key={dk.key}
                type="monotone"
                dataKey={dk.key}
                name={dk.label}
                stroke={dk.color}
                strokeWidth={2}
                fill={gradientFill ? `url(#gradient-${dk.key})` : dk.color}
                fillOpacity={gradientFill ? 1 : 0.1}
              />
            ))}
          </RechartsAreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
