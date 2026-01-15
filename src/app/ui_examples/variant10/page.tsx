"use client";

export default function Variant10Page() {
  return (
    <div className="min-h-[calc(100vh-57px)] bg-[#1e1e1e] p-8 font-mono text-gray-300">
      <div className="max-w-6xl mx-auto border border-gray-700 bg-[#252526] shadow-2xl">
        {/* Terminal Header */}
        <div className="bg-[#333333] px-4 py-2 flex items-center gap-2 border-b border-gray-700">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="ml-4 text-xs text-gray-400">admin@devmetrics:~/dashboard</span>
        </div>

        {/* Content */}
        <div className="p-6 grid grid-cols-3 gap-6">
          <div className="col-span-3 border border-gray-600 p-4 relative">
            <span className="absolute -top-3 left-4 bg-[#252526] px-2 text-xs text-gray-500">SUMMARY</span>
            <div className="flex justify-around text-center">
              <div>
                <p className="text-xs text-gray-500">SESSIONS</p>
                <p className="text-2xl text-blue-400">1,248</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">LINES</p>
                <p className="text-2xl text-green-400">45.2k</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">ERRORS</p>
                <p className="text-2xl text-red-400">0</p>
              </div>
            </div>
          </div>

          <div className="col-span-2 border border-gray-600 p-4 h-64 relative">
            <span className="absolute -top-3 left-4 bg-[#252526] px-2 text-xs text-gray-500">VISUALIZATION</span>
            <div className="h-full flex items-end gap-2 px-4 pb-2">
              {Array.from({length: 20}).map((_, i) => (
                <div key={i} className="flex-1 bg-gray-500" style={{ height: `${Math.random() * 80 + 10}%` }} />
              ))}
            </div>
          </div>

          <div className="col-span-1 border border-gray-600 p-4 h-64 relative">
            <span className="absolute -top-3 left-4 bg-[#252526] px-2 text-xs text-gray-500">LOGS</span>
            <div className="text-xs space-y-1 font-mono text-green-300">
              <p>{">"} init_system...</p>
              <p>{">"} loading modules... OK</p>
              <p>{">"} connecting to OTLP... OK</p>
              <p>{">"} stream started</p>
              <p className="text-gray-500">{">"} waiting for events...</p>
            </div>
          </div>

          <div className="col-span-3">
             <div className="flex text-xs text-gray-500 justify-between px-2">
               <span>CPU: 12%</span>
               <span>MEM: 430MB</span>
               <span>UPTIME: 14d 2h</span>
             </div>
             <div className="mt-1 h-2 bg-gray-700 w-full rounded-full overflow-hidden">
               <div className="h-full bg-blue-500 w-1/3" />
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
