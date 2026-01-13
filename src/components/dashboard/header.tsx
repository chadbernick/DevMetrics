"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, Bell, Plus } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { AddDataModal } from "./add-data-modal";

interface HeaderProps {
  title?: string;
  onMetricsUpdated?: () => void;
}

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export function Header({ title = "Dashboard", onMetricsUpdated }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [addDataOpen, setAddDataOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">{title}</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Add new button */}
          <button
            onClick={() => setAddDataOpen(true)}
            className="flex h-9 items-center gap-2 rounded-lg bg-accent-cyan px-4 text-sm font-medium text-white transition-colors hover:bg-accent-cyan/90"
          >
            <Plus className="h-4 w-4" />
            Add Data
          </button>

        {/* Notifications */}
        <button className="relative flex h-9 w-9 items-center justify-center rounded-lg text-foreground-secondary transition-colors hover:bg-background-secondary hover:text-foreground">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent-red" />
        </button>

        {/* Theme Toggle */}
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground-secondary transition-colors hover:bg-background-secondary hover:text-foreground"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>
        )}

        {/* User Avatar */}
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-accent-purple to-accent-pink text-sm font-medium text-white">
          A
        </div>
      </div>
    </header>

      <AddDataModal
        open={addDataOpen}
        onClose={() => setAddDataOpen(false)}
        onMetricsUpdated={onMetricsUpdated}
      />
    </>
  );
}
