"use client";

import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { User, Key, Plug, CreditCard } from "lucide-react";

const settingsTabs = [
  { name: "Profile", href: "/settings/profile", icon: User },
  { name: "API Keys", href: "/settings/api-keys", icon: Key },
  { name: "Integrations", href: "/settings/integrations", icon: Plug },
  { name: "Cost Config", href: "/settings/cost-config", icon: CreditCard },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <DashboardLayout title="Settings">
      <div className="space-y-6">
        {/* Tabs */}
        <div className="border-b border-border">
          <nav className="-mb-px flex space-x-8">
            {settingsTabs.map((tab) => {
              const isActive = pathname === tab.href ||
                (tab.href === "/settings/profile" && pathname === "/settings");
              return (
                <Link
                  key={tab.name}
                  href={tab.href}
                  className={cn(
                    "flex items-center gap-2 border-b-2 px-1 py-4 text-sm font-medium transition-colors",
                    isActive
                      ? "border-accent-cyan text-accent-cyan"
                      : "border-transparent text-foreground-secondary hover:border-border hover:text-foreground"
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div>{children}</div>
      </div>
    </DashboardLayout>
  );
}
