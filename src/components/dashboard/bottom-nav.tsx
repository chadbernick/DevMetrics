"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import {
  Settings,
  Sun,
  Moon,
  BarChart3,
  Users,
  Activity,
  RefreshCw,
} from "lucide-react";

interface BottomNavProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function BottomNav({ onRefresh, isRefreshing }: BottomNavProps) {
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(true);

  const toggleTheme = () => {
    const html = document.documentElement;
    if (isDark) {
      html.classList.remove("dark");
    } else {
      html.classList.add("dark");
    }
    setIsDark(!isDark);
  };

  const navItems = [
    { href: "/", icon: BarChart3, label: "Dashboard" },
    { href: "/dora", icon: Activity, label: "DORA" },
    { href: "/team", icon: Users, label: "Team" },
    { href: "/settings/profile", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-background-secondary">
      {/* Left: Navigation */}
      <nav className="flex items-center gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href === "/" && pathname === "/") ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors",
                isActive
                  ? "bg-accent-blue/10 text-accent-blue"
                  : "text-foreground-muted hover:text-foreground hover:bg-background-tertiary"
              )}
            >
              <item.icon className="w-3.5 h-3.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Refresh */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
            Refresh
          </button>
        )}

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-colors"
        >
          {isDark ? (
            <>
              <Sun className="w-3.5 h-3.5" />
              Light
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5" />
              Dark
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default BottomNav;
