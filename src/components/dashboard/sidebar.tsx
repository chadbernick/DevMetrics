"use client";

import { cn } from "@/lib/utils/cn";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  Settings,
  Zap,
  Search,
  LogOut,
  Activity,
  FolderTree,
} from "lucide-react";
import { logoutAction } from "@/app/actions";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "ROI & Value", href: "/roi", icon: TrendingUp },
  { name: "DORA & Speed", href: "/dora", icon: Activity },
  { name: "Codebase", href: "/codebase", icon: FolderTree },
  { name: "Team", href: "/team", icon: Users },
];

const secondaryNavigation = [
  { name: "Tools", href: "/tools", icon: Zap },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-56 flex-col border-r border-border bg-background-secondary">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b border-border px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent-cyan to-accent-purple">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-semibold">DevMetrics</span>
        </div>

        {/* Search */}
        <div className="px-4 py-4">
          <div className="flex items-center gap-2 rounded-lg bg-background px-3 py-2 text-foreground-muted">
            <Search className="h-4 w-4" />
            <span className="text-sm">Search...</span>
          </div>
        </div>

        {/* Primary Navigation */}
        <nav className="flex-1 space-y-1 px-3">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent-cyan/10 text-accent-cyan"
                    : "text-foreground-secondary hover:bg-background hover:text-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Secondary Navigation */}
        <div className="border-t border-border px-3 py-4">
          <nav className="space-y-1">
            {secondaryNavigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-accent-cyan/10 text-accent-cyan"
                      : "text-foreground-secondary hover:bg-background hover:text-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
            <button
              onClick={() => logoutAction()}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-background hover:text-red-300"
            >
              <LogOut className="h-5 w-5" />
              Logout
            </button>
          </nav>
        </div>
      </div>
    </aside>
  );
}
