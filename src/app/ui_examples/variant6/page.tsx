"use client";

import { ArrowUp, ArrowDown } from "lucide-react";

export default function Variant6Page() {
  const metrics = [
    { label: "Sessions", value: "1,248", change: "+12%", trend: "up" },
    { label: "Lines", value: "45.2k", change: "+5%", trend: "up" },
    { label: "Hours", value: "320h", change: "+8%", trend: "up" },
    { label: "ROI", value: "340%", change: "+2%", trend: "up" },
    { label: "Cost", value: "$420", change: "-10%", trend: "down" },
    { label: "Tokens", value: "12M", change: "+15%", trend: "up" },
    { label: "Errors", value: "0.2%", change: "-1%", trend: "down" },
    { label: "Users", value: "14", change: "0%", trend: "flat" },
    { label: "Repos", value: "8", change: "+1", trend: "up" },
    { label: "Commits", value: "842", change: "+22%", trend: "up" },
    { label: "PRs", value: "64", change: "+5", trend: "up" },
    { label: "Issues", value: "12", change: "-3", trend: "down" },
  ];

  return (
    <div className="min-h-[calc(100vh-57px)] bg-gray-50 p-6">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {metrics.map((m, i) => (
          <div key={i} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">{m.label}</p>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-bold text-gray-900">{m.value}</span>
              <span className={`flex items-center text-xs font-medium ${
                m.trend === "up" ? "text-green-600" : m.trend === "down" ? "text-red-600" : "text-gray-400"
              }`}>
                {m.trend === "up" ? <ArrowUp className="w-3 h-3 mr-0.5" /> : m.trend === "down" ? <ArrowDown className="w-3 h-3 mr-0.5" /> : null}
                {m.change}
              </span>
            </div>
            {/* Sparkline placeholder */}
            <div className="mt-2 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${
                  m.trend === "up" ? "bg-green-500" : "bg-gray-300"
                }`} 
                style={{ width: `${Math.random() * 60 + 20}%` }} 
              />
            </div>
          </div>
        ))}
        
        {/* Large Chart Area spanning rows */}
        <div className="col-span-2 md:col-span-4 lg:col-span-4 row-span-2 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="h-full flex items-center justify-center text-gray-300 font-medium">
            Main Visualization Area (Dense)
          </div>
        </div>

        {/* More small cards filling gaps */}
        <div className="col-span-1 md:col-span-2 bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
           <p className="text-[10px] font-bold text-gray-400 mb-1">ACTIVITY</p>
           <div className="flex gap-1 h-12 items-end">
             {Array.from({length: 20}).map((_, j) => (
               <div key={j} className="flex-1 bg-blue-500 rounded-sm" style={{ height: `${Math.random() * 100}%` }} />
             ))}
           </div>
        </div>
        <div className="col-span-1 md:col-span-2 bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
           <p className="text-[10px] font-bold text-gray-400 mb-1">QUALITY</p>
           <div className="flex gap-1 h-12 items-end">
             {Array.from({length: 20}).map((_, j) => (
               <div key={j} className="flex-1 bg-purple-500 rounded-sm" style={{ height: `${Math.random() * 100}%` }} />
             ))}
           </div>
        </div>
      </div>
    </div>
  );
}
