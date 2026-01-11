"use client";

import { useState, useRef, useEffect, useSyncExternalStore } from "react";
import { RefreshCw, ChevronDown, Check, Clock } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface RefreshInterval {
  label: string;
  value: number | null; // milliseconds, null = manual only
}

const REFRESH_INTERVALS: RefreshInterval[] = [
  { label: "Manual", value: null },
  { label: "1 min", value: 60 * 1000 },
  { label: "2 min", value: 2 * 60 * 1000 },
  { label: "5 min", value: 5 * 60 * 1000 },
  { label: "10 min", value: 10 * 60 * 1000 },
  { label: "15 min", value: 15 * 60 * 1000 },
  { label: "30 min", value: 30 * 60 * 1000 },
  { label: "1 hour", value: 60 * 60 * 1000 },
  { label: "2 hours", value: 2 * 60 * 60 * 1000 },
];

const DEFAULT_INTERVAL = 5 * 60 * 1000; // 5 minutes

const STORAGE_KEY = "dashboard-refresh-interval";

// Custom hook to read localStorage safely (SSR-compatible)
function useLocalStorageInterval(): number | null {
  const getSnapshot = () => {
    if (typeof window === "undefined") return DEFAULT_INTERVAL;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === null) return DEFAULT_INTERVAL;
    return saved === "null" ? null : parseInt(saved, 10);
  };

  const getServerSnapshot = () => DEFAULT_INTERVAL;

  const subscribe = (callback: () => void) => {
    window.addEventListener("storage", callback);
    return () => window.removeEventListener("storage", callback);
  };

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

interface RefreshControlProps {
  onRefresh: () => void;
  onIntervalChange: (intervalMs: number | null) => void;
  lastUpdated: Date | null;
  isLoading: boolean;
}

export function RefreshControl({
  onRefresh,
  onIntervalChange,
  lastUpdated,
  isLoading,
}: RefreshControlProps) {
  const [isOpen, setIsOpen] = useState(false);
  const storedInterval = useLocalStorageInterval();
  const [selectedInterval, setSelectedInterval] = useState<number | null>(storedInterval);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);

  // Notify parent of initial interval on mount
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      onIntervalChange(storedInterval);
    }
  }, [storedInterval, onIntervalChange]);

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleIntervalSelect = (interval: RefreshInterval) => {
    setSelectedInterval(interval.value);
    localStorage.setItem(STORAGE_KEY, String(interval.value));
    onIntervalChange(interval.value);
    setIsOpen(false);
  };

  const selectedLabel = REFRESH_INTERVALS.find((i) => i.value === selectedInterval)?.label || "5 min";

  const formatLastUpdated = (date: Date | null) => {
    if (!date) return "Never";
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);

    if (seconds < 10) return "Just now";
    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex items-center gap-3">
      {/* Last Updated */}
      <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
        <Clock className="h-3 w-3" />
        <span>Updated {formatLastUpdated(lastUpdated)}</span>
      </div>

      {/* Manual Refresh Button */}
      <button
        onClick={onRefresh}
        disabled={isLoading}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg border border-border transition-colors",
          "hover:bg-background-secondary disabled:opacity-50",
          isLoading && "cursor-not-allowed"
        )}
        title="Refresh now"
      >
        <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
      </button>

      {/* Interval Selector */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition-colors",
            selectedInterval !== null
              ? "border-accent-cyan/50 bg-accent-cyan/10 text-accent-cyan"
              : "border-border bg-background hover:bg-background-secondary"
          )}
        >
          <span>{selectedLabel}</span>
          <ChevronDown className={cn("h-3 w-3 transition-transform", isOpen && "rotate-180")} />
        </button>

        {isOpen && (
          <div className="absolute top-full right-0 z-50 mt-1 w-32 rounded-lg border border-border bg-background shadow-lg">
            <div className="p-1">
              {REFRESH_INTERVALS.map((interval) => (
                <button
                  key={interval.label}
                  onClick={() => handleIntervalSelect(interval)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs transition-colors",
                    selectedInterval === interval.value
                      ? "bg-accent-cyan/10 text-accent-cyan"
                      : "hover:bg-background-secondary"
                  )}
                >
                  <span>{interval.label}</span>
                  {selectedInterval === interval.value && <Check className="h-3 w-3" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
