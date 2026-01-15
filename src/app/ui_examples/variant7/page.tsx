"use client";

import { CheckCircle2, Circle } from "lucide-react";

export default function Variant7Page() {
  const projects = [
    { name: "Frontend Core", progress: 85, status: "active" },
    { name: "Backend API", progress: 45, status: "active" },
    { name: "Auth Service", progress: 92, status: "completed" },
    { name: "Documentation", progress: 12, status: "active" },
    { name: "Analytics", progress: 67, status: "active" },
  ];

  return (
    <div className="min-h-[calc(100vh-57px)] bg-[#fafafa] p-8 flex justify-center">
      <div className="max-w-3xl w-full space-y-1">
        <header className="mb-6 flex justify-between items-end px-2">
          <h1 className="text-xl font-bold text-gray-900">Active Workstreams</h1>
          <span className="text-xs font-mono text-gray-500">SYNCED: 12:42PM</span>
        </header>

        {/* Metrics Strip */}
        <div className="grid grid-cols-4 gap-1 mb-8">
          {["Sessions: 1,248", "Lines: 45k", "Hours: 320h", "ROI: 340%"].map((txt, i) => (
            <div key={i} className="bg-white px-4 py-2 border-l-4 border-black shadow-sm">
              <span className="font-mono text-sm font-bold">{txt}</span>
            </div>
          ))}
        </div>

        {/* List Items */}
        {projects.map((p, i) => (
          <div key={i} className="group bg-white p-3 border border-gray-200 flex items-center justify-between hover:border-black transition-colors cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-12 text-xs font-mono text-gray-400">0{i+1}</div>
              <div className="font-medium text-gray-900">{p.name}</div>
            </div>
            
            <div className="flex items-center gap-8">
              {/* Dense Progress Bar */}
              <div className="w-32 h-2 bg-gray-100">
                <div 
                  className="h-full bg-black transition-all duration-500" 
                  style={{ width: `${p.progress}%` }} 
                />
              </div>
              
              <div className="w-16 text-right font-mono text-sm">
                {p.progress}%
              </div>

              <div className="text-gray-400">
                {p.status === "completed" ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
              </div>
            </div>
          </div>
        ))}

        <div className="mt-8 grid grid-cols-2 gap-1 h-48">
           <div className="bg-white border border-gray-200 p-4">
             <h3 className="font-mono text-xs font-bold mb-2">VELOCITY_CHART</h3>
             <div className="flex items-end justify-between h-32 gap-1">
               {Array.from({length:30}).map((_, i) => (
                 <div key={i} className="w-full bg-gray-900" style={{height: `${Math.random() * 100}%`}} />
               ))}
             </div>
           </div>
           <div className="bg-white border border-gray-200 p-4">
             <h3 className="font-mono text-xs font-bold mb-2">QUALITY_INDEX</h3>
             <div className="h-32 flex items-center justify-center">
               <div className="text-5xl font-black">A+</div>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}
