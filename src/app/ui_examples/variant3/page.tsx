"use client";

import { 
  BarChart, 
  Bar, 
  ResponsiveContainer,
  XAxis
} from "recharts";

const data = Array.from({ length: 12 }, (_, i) => ({
  month: `M${i+1}`,
  value: Math.floor(Math.random() * 1000) + 500,
}));

export default function Variant3Page() {
  return (
    <div className="flex min-h-[calc(100vh-57px)] bg-white text-gray-900">
      {/* Main Content */}
      <div className="flex-1 p-12">
        <h1 className="text-4xl font-light tracking-tight mb-2">Dashboard</h1>
        <p className="text-gray-500 mb-12">Overview of development velocity.</p>

        <div className="h-[500px] w-full bg-gray-50 rounded-3xl p-8">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <Bar dataKey="value" fill="#18181b" radius={[4, 4, 4, 4]} />
              <XAxis dataKey="month" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Right Rail Stats */}
      <div className="w-80 border-l border-gray-100 bg-gray-50/50 p-8 space-y-12">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">Key Metrics</h3>
          <div className="space-y-6">
            <div>
              <p className="text-3xl font-bold">1,420</p>
              <p className="text-sm text-gray-500">Total Sessions</p>
            </div>
            <div>
              <p className="text-3xl font-bold">$12.5k</p>
              <p className="text-sm text-gray-500">Cost Savings</p>
            </div>
            <div>
              <p className="text-3xl font-bold">89%</p>
              <p className="text-sm text-gray-500">Acceptance Rate</p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">Active Tools</h3>
          <div className="space-y-3">
            {["Claude Code", "GitHub Copilot", "Cursor"].map(tool => (
              <div key={tool} className="flex items-center justify-between">
                <span className="text-sm font-medium">{tool}</span>
                <span className="text-xs text-gray-500">42%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
