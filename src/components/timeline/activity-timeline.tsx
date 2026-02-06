"use client";

import { cn } from "@/lib/utils/cn";
import {
  Terminal,
  GitPullRequest,
  Bug,
  Rocket,
  AlertTriangle,
  Sparkles,
} from "lucide-react";

interface ActivityEvent {
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

interface ActivityTimelineProps {
  events: ActivityEvent[];
  className?: string;
}

const eventConfig = {
  session: {
    icon: Terminal,
    color: "bg-accent-cyan",
    textColor: "text-accent-cyan",
  },
  feature: {
    icon: Sparkles,
    color: "bg-accent-purple",
    textColor: "text-accent-purple",
  },
  bug: {
    icon: Bug,
    color: "bg-accent-amber",
    textColor: "text-accent-amber",
  },
  pr: {
    icon: GitPullRequest,
    color: "bg-accent-blue",
    textColor: "text-accent-blue",
  },
  deploy: {
    icon: Rocket,
    color: "bg-accent-green",
    textColor: "text-accent-green",
  },
  alert: {
    icon: AlertTriangle,
    color: "bg-accent-red",
    textColor: "text-accent-red",
  },
};

const tagColors = {
  tokens: "bg-accent-cyan/15 text-accent-cyan",
  lines: "bg-accent-purple/15 text-accent-purple",
  cost: "bg-accent-green/15 text-accent-green",
  time: "bg-accent-amber/15 text-accent-amber",
  default: "bg-foreground-muted/15 text-foreground-secondary",
};

export function ActivityTimeline({ events, className }: ActivityTimelineProps) {
  if (events.length === 0) {
    return (
      <div className={cn("py-4 text-center", className)}>
        <span className="text-[11px] text-foreground-muted">
          No recent activity
        </span>
      </div>
    );
  }

  return (
    <div className={cn("relative py-3", className)}>
      {/* Timeline line */}
      <div className="timeline-line" />

      {/* Events */}
      <div className="flex flex-col gap-3 pl-6">
        {events.map((event) => {
          const config = eventConfig[event.type];
          const Icon = config.icon;

          return (
            <div key={event.id} className="relative flex items-start gap-3">
              {/* Timeline dot */}
              <div
                className={cn(
                  "absolute -left-6 top-1 timeline-dot",
                  config.color
                )}
              />

              {/* Event content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Icon className={cn("w-3.5 h-3.5 shrink-0", config.textColor)} />
                  <span className="text-[12px] font-medium text-foreground truncate">
                    {event.title}
                  </span>
                  <span className="text-[10px] text-foreground-muted shrink-0">
                    {event.timeAgo}
                  </span>
                </div>

                {event.description && (
                  <p className="text-[11px] text-foreground-secondary mt-0.5 truncate">
                    {event.description}
                  </p>
                )}

                {event.tags && event.tags.length > 0 && (
                  <div className="flex gap-1.5 mt-1.5">
                    {event.tags.map((tag, index) => (
                      <span
                        key={index}
                        className={cn(
                          "text-[9px] px-1.5 py-0.5 rounded font-medium",
                          tagColors[tag.type]
                        )}
                      >
                        {tag.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ActivityTimeline;
