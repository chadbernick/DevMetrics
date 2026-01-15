"use client";

import { Activity, Clock, Code, GitCommit } from "lucide-react";

export default function Variant9Page() {
  const events = Array.from({length: 12}).map((_, i) => ({
    id: i,
    type: ["session", "commit", "review"][i % 3],
    title: `Event #${1000+i}`,
    desc: "AI generated 42 lines of code in src/app/utils.ts",
    time: `${i*5}m ago`
  }));

  return (
    <div className="min-h-[calc(100vh-57px)] bg-[#f3f4f6] p-4 flex gap-4">
      {/* Metrics Ticker (Vertical) */}
      <div className="w-64 flex flex-col gap-2">
        <div className="bg-white p-4 rounded shadow-sm border border-gray-200">
          <span className="text-xs font-bold text-gray-400 uppercase">Velocity</span>
          <div className="text-2xl font-bold text-gray-800 mt-1">124 <span className="text-sm text-gray-400 font-normal">/day</span></div>
        </div>
        <div className="bg-white p-4 rounded shadow-sm border border-gray-200">
          <span className="text-xs font-bold text-gray-400 uppercase">Quality</span>
          <div className="text-2xl font-bold text-gray-800 mt-1">98% <span className="text-sm text-gray-400 font-normal">pass</span></div>
        </div>
        <div className="bg-white p-4 rounded shadow-sm border border-gray-200 flex-1">
          <span className="text-xs font-bold text-gray-400 uppercase">Top Files</span>
          <ul className="mt-4 space-y-2 text-sm text-gray-600">
            <li>utils.ts (45)</li>
            <li>page.tsx (32)</li>
            <li>api/route.ts (12)</li>
          </ul>
        </div>
      </div>

      {/* Main Feed */}
      <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col">
        <header className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="font-bold text-gray-800">Live Activity Feed</h2>
          <div className="flex gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs text-gray-500">LIVE</span>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {events.map((e) => (
            <div key={e.id} className="p-3 hover:bg-gray-50 rounded border border-transparent hover:border-gray-200 transition-all cursor-pointer flex items-center gap-4">
              <div className={`p-2 rounded-full ${
                e.type === "session" ? "bg-blue-100 text-blue-600" :
                e.type === "commit" ? "bg-purple-100 text-purple-600" :
                "bg-orange-100 text-orange-600"
              }`}>
                {e.type === "session" ? <Activity className="w-4 h-4" /> :
                 e.type === "commit" ? <GitCommit className="w-4 h-4" /> :
                 <Code className="w-4 h-4" />}
              </div>
              <div className="flex-1">
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-900 text-sm">{e.title}</span>
                  <span className="text-xs text-gray-400">{e.time}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{e.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail Panel */}
      <div className="w-80 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="h-32 bg-gray-100 rounded mb-6 flex items-center justify-center text-gray-400 text-xs">
          [Mini Chart]
        </div>
        <h3 className="font-bold text-gray-800 mb-2">Session Analysis</h3>
        <p className="text-sm text-gray-600 leading-relaxed">
          Recent activity shows a 12% increase in AI utilization during afternoon hours. Code quality remains stable.
        </p>
      </div>
    </div>
  );
}
