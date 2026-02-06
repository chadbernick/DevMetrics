"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { User, Key, Plug, CreditCard, Users, Settings, ArrowLeft } from "lucide-react";
import { BottomNav } from "@/components/dashboard/bottom-nav";

const settingsTabs = [
  { name: "Profile", href: "/settings/profile", icon: User },
  { name: "Team", href: "/settings/team", icon: Users },
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
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <main className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Back link + Header */}
          <div className="mb-6">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Settings</h1>
                <p className="text-sm text-foreground-muted">
                  Manage your account and preferences
                </p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-border mb-6">
            <nav className="-mb-px flex gap-1 overflow-x-auto pb-px">
              {settingsTabs.map((tab) => {
                const isActive =
                  pathname === tab.href ||
                  (tab.href === "/settings/profile" && pathname === "/settings");
                return (
                  <Link
                    key={tab.name}
                    href={tab.href}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all whitespace-nowrap rounded-t-lg border-b-2",
                      isActive
                        ? "border-accent-cyan text-foreground bg-background-secondary"
                        : "border-transparent text-foreground-muted hover:text-foreground hover:bg-background-secondary"
                    )}
                  >
                    <tab.icon
                      className={cn(
                        "h-4 w-4",
                        isActive ? "text-accent-cyan" : ""
                      )}
                    />
                    {tab.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="settings-card bg-background-card border border-border rounded-xl p-6">
            {children}
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
