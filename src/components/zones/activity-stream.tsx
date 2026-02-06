"use client";

import { cn } from "@/lib/utils/cn";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { SessionBar } from "@/components/timeline/session-bar";
import { ActivityTimeline } from "@/components/timeline/activity-timeline";

export interface ActiveSession {
  id: string;
  name: string;
  tool: string;
  tokens: string;
  status: "active" | "idle" | "waiting";
  duration?: string;
}

export interface ActivityEvent {
  id: string;
  type: "session" | "feature" | "bug" | "pr" | "deploy" | "alert";
  title: string;
  description?: string;
  timestamp: string;
  timeAgo: string;
  tags?: Array<{
    label: string;
    type: "tokens" | "lines" | "cost" | "time" | "default";
  }>;
}

interface ActivityStreamProps {
  activeSessions: ActiveSession[];
  events: ActivityEvent[];
  eventCount?: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

export function ActivityStream({
  activeSessions,
  events,
  eventCount,
  isCollapsed: controlledCollapsed,
  onToggleCollapse,
  className,
}: ActivityStreamProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);

  const isCollapsed = controlledCollapsed ?? internalCollapsed;
  const toggleCollapse = onToggleCollapse ?? (() => setInternalCollapsed(!internalCollapsed));

  return (
    <div
      className={cn(
        "zone-activity flex flex-col",
        isCollapsed ? "max-h-[52px]" : "max-h-[280px]",
        "transition-all duration-300 ease-in-out",
        className
      )}
    >
      {/* Active Sessions Bar */}
      <SessionBar sessions={activeSessions} />

      {/* Collapsible Header */}
      <div
        className="flex items-center justify-between px-5 py-2.5 border-b border-border cursor-pointer hover:bg-background-card/50 transition-colors"
        onClick={toggleCollapse}
      >
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-foreground-secondary uppercase tracking-wide">
            Activity Stream
          </span>
          {eventCount !== undefined && (
            <span className="bg-accent-blue text-white text-[9px] px-1.5 py-0.5 rounded-full font-medium">
              {eventCount} today
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-foreground-muted">
          {isCollapsed ? (
            <>
              <ChevronDown className="w-3 h-3" />
              <span>Expand</span>
            </>
          ) : (
            <>
              <ChevronUp className="w-3 h-3" />
              <span>Collapse</span>
            </>
          )}
        </div>
      </div>

      {/* Timeline Content */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto px-5">
          <ActivityTimeline events={events} />
        </div>
      )}
    </div>
  );
}

export default ActivityStream;
