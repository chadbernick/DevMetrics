"use client";

export default function Variant5Page() {
  return (
    <div className="min-h-[calc(100vh-57px)] bg-[#050505] text-[#00ff9d] font-mono p-8">
      <div className="border border-[#00ff9d]/20 h-full p-6 relative">
        {/* Corner Accents */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#00ff9d]" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#00ff9d]" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#00ff9d]" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#00ff9d]" />

        <header className="flex justify-between items-end mb-8 border-b border-[#00ff9d]/20 pb-4">
          <div>
            <h1 className="text-xl uppercase tracking-widest">Dev_Metrics_v2.0</h1>
            <p className="text-xs text-[#00ff9d]/60">System Status: ONLINE</p>
          </div>
          <div className="text-right">
            <p className="text-xs">UPLINK: 420ms</p>
          </div>
        </header>

        <div className="grid grid-cols-4 gap-6">
          <div className="col-span-1 border border-[#00ff9d]/20 p-4 bg-[#00ff9d]/5">
            <h3 className="text-xs border-b border-[#00ff9d]/20 pb-2 mb-2">SESSIONS</h3>
            <p className="text-4xl">1,248</p>
          </div>
          <div className="col-span-1 border border-[#00ff9d]/20 p-4">
            <h3 className="text-xs border-b border-[#00ff9d]/20 pb-2 mb-2">LINES_ADDED</h3>
            <p className="text-4xl">45,201</p>
          </div>
          <div className="col-span-1 border border-[#00ff9d]/20 p-4">
            <h3 className="text-xs border-b border-[#00ff9d]/20 pb-2 mb-2">ROI_FACTOR</h3>
            <p className="text-4xl">3.4x</p>
          </div>
          <div className="col-span-1 border border-[#00ff9d]/20 p-4">
            <h3 className="text-xs border-b border-[#00ff9d]/20 pb-2 mb-2">EST_SAVINGS</h3>
            <p className="text-4xl">$12.4k</p>
          </div>

          <div className="col-span-3 border border-[#00ff9d]/20 p-4 h-64 flex items-center justify-center">
            <p className="text-[#00ff9d]/40">[ VISUALIZATION_MATRIX_LOADING... ]</p>
          </div>

          <div className="col-span-1 border border-[#00ff9d]/20 p-4 h-64">
            <h3 className="text-xs border-b border-[#00ff9d]/20 pb-2 mb-2">LOG_STREAM</h3>
            <div className="text-xs space-y-2 text-[#00ff9d]/70">
              <p>{">"} session_start [id:8a2]</p>
              <p>{">"} token_usage [in:400 out:120]</p>
              <p>{">"} commit [feat: hud ui]</p>
              <p>{">"} session_end [dur: 12m]</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
