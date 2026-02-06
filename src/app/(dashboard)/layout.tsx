"use client";

import { BottomNav } from "@/components/dashboard/bottom-nav";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export default function HybridDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
      <main className="flex-1 overflow-hidden">{children}</main>

      {/* Bottom navigation bar */}
      <BottomNav onRefresh={handleRefresh} isRefreshing={isRefreshing || isPending} />
    </div>
  );
}
