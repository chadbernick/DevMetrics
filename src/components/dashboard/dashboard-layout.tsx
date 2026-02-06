"use client";

import { BottomNav } from "./bottom-nav";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

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
  onMetricsUpdated,
}: DashboardLayoutProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    startTransition(() => {
      router.refresh();
    });
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Main content - full width, no sidebar */}
      <main className="flex-1 overflow-auto p-6">{children}</main>

      {/* Bottom navigation bar */}
      <BottomNav onRefresh={handleRefresh} isRefreshing={isRefreshing || isPending} />
    </div>
  );
}
