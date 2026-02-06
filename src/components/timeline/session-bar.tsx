"use client";

import { cn } from "@/lib/utils/cn";

interface ActiveSession {
  id: string;
  name: string;
  tool: string;
  tokens: string;
  status: "active" | "idle" | "waiting";
  duration?: string;
}

interface SessionBarProps {
  sessions: ActiveSession[];
  className?: string;
}

const statusConfig = {
  active: {
    dot: "bg-accent-green",
    text: "text-accent-green",
    pulse: true,
  },
  idle: {
    dot: "bg-accent-amber",
    text: "text-accent-amber",
    pulse: false,
  },
  waiting: {
    dot: "bg-accent-blue",
    text: "text-accent-blue",
    pulse: true,
  },
};

const toolIcons: Record<string, string> = {
  "Claude Code": "🤖",
  "Cursor": "⌨️",
  "Copilot": "🚀",
  "Gemini": "✨",
  "Codex": "📝",
  "Kiro": "🎯",
};

export function SessionBar({ sessions, className }: SessionBarProps) {
  if (sessions.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center px-5 py-2 border-b border-border",
          className
        )}
      >
        <span className="text-[11px] text-foreground-muted">
          No active sessions
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-5 py-2 border-b border-border overflow-x-auto",
        className
      )}
    >
      <span className="text-[10px] text-foreground-muted uppercase tracking-wide shrink-0">
        Active Sessions
      </span>
      <div className="flex gap-2">
        {sessions.map((session) => {
          const config = statusConfig[session.status];
          return (
            <div key={session.id} className="session-chip">
              <span className="text-sm">
                {toolIcons[session.tool] || "💻"}
              </span>
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    config.dot,
                    config.pulse && "live-pulse"
                  )}
                />
                <span className="text-foreground font-medium">
                  {session.name}
                </span>
              </div>
              <span className="text-foreground-muted">{session.tokens}</span>
              {session.duration && (
                <span className="text-foreground-muted text-[10px]">
                  {session.duration}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default SessionBar;
