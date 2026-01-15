"use client";

export default function Variant4Page() {
  return (
    <div className="min-h-[calc(100vh-57px)] bg-[#f5f5f7] p-12 text-[#1d1d1f]">
      <div className="max-w-6xl mx-auto">
        <header className="mb-16">
          <h1 className="text-2xl font-semibold mb-2">Developer Impact</h1>
          <p className="text-gray-500">Real-time metrics for AI utilization.</p>
        </header>

        {/* Big Numbers Grid */}
        <div className="grid grid-cols-3 gap-y-16 gap-x-12 mb-24">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-2">Total Sessions</p>
            <p className="text-7xl font-bold tracking-tight">1,248</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 mb-2">Lines of Code</p>
            <p className="text-7xl font-bold tracking-tight">45k</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 mb-2">Hours Saved</p>
            <p className="text-7xl font-bold tracking-tight text-blue-600">320h</p>
          </div>
          
          <div>
            <p className="text-sm font-medium text-gray-500 mb-2">ROI</p>
            <p className="text-5xl font-semibold tracking-tight">340%</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 mb-2">Cost</p>
            <p className="text-5xl font-semibold tracking-tight">$420</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 mb-2">Efficiency</p>
            <p className="text-5xl font-semibold tracking-tight">High</p>
          </div>
        </div>

        {/* Simple List */}
        <div className="border-t border-gray-200 pt-8">
          <h3 className="text-lg font-medium mb-6">Recent Activity</h3>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="font-medium">Session #842{i}</span>
                </div>
                <span className="text-gray-500 font-mono text-sm">Claude Code</span>
                <span className="text-gray-500">24 mins ago</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
