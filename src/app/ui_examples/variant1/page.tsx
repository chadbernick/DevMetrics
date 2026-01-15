"use client";

import { 
  Zap, 
  Code2, 
  TrendingUp, 
  DollarSign, 
  Clock,
  ArrowUpRight
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";

const data = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  value: Math.floor(Math.random() * 100) + 50,
}));

export default function Variant1Page() {
  return (
    <div className="flex flex-col h-[calc(100vh-57px)] bg-[#0f1115] text-gray-300">
      {/* The Ribbon */}
      <div className="flex items-center justify-between px-6 py-2 border-b border-gray-800 bg-[#16181d]">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-blue-500/10 text-blue-400">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">Sessions</p>
              <p className="text-sm font-bold text-white">1,248 <span className="text-green-400 text-xs">+12%</span></p>
            </div>
          </div>

          <div className="w-px h-8 bg-gray-800" />

          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-purple-500/10 text-purple-400">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">Lines</p>
              <p className="text-sm font-bold text-white">45.2k <span className="text-green-400 text-xs">+5%</span></p>
            </div>
          </div>

          <div className="w-px h-8 bg-gray-800" />

          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-green-500/10 text-green-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">ROI</p>
              <p className="text-sm font-bold text-white">340%</p>
            </div>
          </div>

          <div className="w-px h-8 bg-gray-800" />

          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-yellow-500/10 text-yellow-400">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">Saved</p>
              <p className="text-sm font-bold text-white">$12.4k</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>Last 30 Days</span>
          <ArrowUpRight className="w-3 h-3" />
        </div>
      </div>

      {/* Main Content - Frameless */}
      <div className="flex-1 p-6 grid grid-cols-3 gap-6">
        <div className="col-span-2 relative">
          <h2 className="text-lg font-medium text-white mb-4">Activity Volume</h2>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="day" hide />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: "8px" }}
                  itemStyle={{ color: "#e5e7eb" }}
                />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-lg font-medium text-white">Top Contributors</h2>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between group cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                    U{i}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-300 group-hover:text-white">User {i}</p>
                    <p className="text-xs text-gray-600">Frontend Team</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-white">{Math.floor(Math.random() * 500)}</p>
                  <p className="text-xs text-gray-600">commits</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
