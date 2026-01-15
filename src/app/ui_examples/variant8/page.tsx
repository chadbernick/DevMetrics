"use client";

export default function Variant8Page() {
  return (
    <div className="min-h-[calc(100vh-57px)] bg-[#09090b] p-4 flex items-center justify-center">
      <div className="max-w-5xl w-full aspect-video grid grid-cols-12 grid-rows-6 gap-2">
        
        {/* Row 1 */}
        <div className="col-span-3 row-span-2 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10 rounded-lg p-4 flex flex-col justify-between">
          <span className="text-xs text-white/50 font-medium">TOTAL SESSIONS</span>
          <span className="text-4xl font-light text-white">1,248</span>
        </div>
        
        <div className="col-span-3 row-span-1 bg-white/5 border border-white/10 rounded-lg p-3 flex items-center justify-between">
          <span className="text-xs text-white/50">ROI</span>
          <span className="text-xl font-medium text-green-400">340%</span>
        </div>
        
        <div className="col-span-6 row-span-3 bg-white/5 border border-white/10 rounded-lg p-4">
          <div className="h-full w-full flex items-end gap-1">
             {Array.from({length: 40}).map((_, i) => (
               <div key={i} className="flex-1 bg-white/20 rounded-t-sm hover:bg-white/40 transition-colors" style={{ height: `${Math.random() * 80 + 20}%` }} />
             ))}
          </div>
        </div>

        {/* Row 2 */}
        <div className="col-span-3 row-span-1 bg-white/5 border border-white/10 rounded-lg p-3 flex items-center justify-between">
          <span className="text-xs text-white/50">COST</span>
          <span className="text-xl font-medium text-white">$420</span>
        </div>

        {/* Row 3 */}
        <div className="col-span-2 row-span-2 bg-white/5 border border-white/10 rounded-lg p-4 flex flex-col justify-center text-center">
          <div className="w-12 h-12 mx-auto rounded-full border-4 border-indigo-500 mb-2" />
          <span className="text-xs text-white/50">Completion</span>
        </div>
        
        <div className="col-span-4 row-span-2 bg-white/5 border border-white/10 rounded-lg p-4 relative overflow-hidden">
          <span className="text-xs text-white/50 absolute top-4 left-4">ACTIVITY STREAM</span>
          <div className="absolute inset-0 top-10 p-4 space-y-2 opacity-50">
            <div className="h-2 w-3/4 bg-white/20 rounded" />
            <div className="h-2 w-1/2 bg-white/20 rounded" />
            <div className="h-2 w-5/6 bg-white/20 rounded" />
          </div>
        </div>

        {/* Row 4 (Chart continues) */}

        {/* Row 4-6 Filler */}
        <div className="col-span-3 row-span-3 bg-indigo-600 rounded-lg p-6 flex flex-col justify-between text-white">
          <h3 className="font-bold text-lg leading-tight">AI Impact Report Available</h3>
          <button className="bg-white text-indigo-600 py-2 px-4 rounded text-sm font-bold mt-4">View Report</button>
        </div>

        <div className="col-span-3 row-span-3 bg-white/5 border border-white/10 rounded-lg p-4">
           <h3 className="text-xs text-white/50 mb-4">CONTRIBUTORS</h3>
           <div className="space-y-3">
             {[1,2,3,4].map(i => (
               <div key={i} className="flex items-center gap-3">
                 <div className="w-6 h-6 rounded-full bg-white/10" />
                 <div className="h-2 w-20 bg-white/10 rounded" />
               </div>
             ))}
           </div>
        </div>

        <div className="col-span-6 row-span-1 bg-white/5 border border-white/10 rounded-lg flex items-center px-4 justify-between">
           <span className="text-xs text-white/50">SYSTEM STATUS</span>
           <span className="text-xs text-green-400 font-mono">OPERATIONAL</span>
        </div>

      </div>
    </div>
  );
}
