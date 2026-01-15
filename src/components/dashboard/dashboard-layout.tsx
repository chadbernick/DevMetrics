"use client";

import { Sidebar } from "./sidebar";
import { Header } from "./header";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  showAddData?: boolean;
  onMetricsUpdated?: () => void;
}

export function DashboardLayout({ 
  children, 
  title, 
  showAddData,
  onMetricsUpdated 
}: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col pl-56">
        <Header 
          title={title} 
          showAddData={showAddData} 
          onMetricsUpdated={onMetricsUpdated} 
        />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
