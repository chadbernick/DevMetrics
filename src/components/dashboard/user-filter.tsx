"use client";

import { useState, useRef, useEffect } from "react";
import { Users, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface User {
  id: string;
  name: string;
  email: string;
  engineerLevel: string;
}

interface UserFilterProps {
  users: User[];
  selectedUserId: string | null;
  onUserChange: (userId: string | null) => void;
}

export function UserFilter({ users, selectedUserId, onUserChange }: UserFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedUser = selectedUserId ? users.find((u) => u.id === selectedUserId) : null;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getLevelBadgeColor = (level: string) => {
    switch (level) {
      case "junior":
        return "bg-accent-green/20 text-accent-green";
      case "mid":
        return "bg-accent-cyan/20 text-accent-cyan";
      case "senior":
        return "bg-accent-purple/20 text-accent-purple";
      case "staff":
        return "bg-accent-pink/20 text-accent-pink";
      case "principal":
        return "bg-accent-yellow/20 text-accent-yellow";
      default:
        return "bg-foreground-muted/20 text-foreground-muted";
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors",
          selectedUserId
            ? "border-accent-cyan bg-accent-cyan/10 text-accent-cyan"
            : "border-border bg-background hover:bg-background-secondary"
        )}
      >
        <Users className="h-4 w-4" />
        <span className="min-w-[120px] text-left">
          {selectedUser ? selectedUser.name : "All Team Members"}
        </span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-2 w-72 rounded-lg border border-border bg-background shadow-lg">
          <div className="p-2">
            {/* All Team Members option */}
            <button
              onClick={() => {
                onUserChange(null);
                setIsOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
                !selectedUserId
                  ? "bg-accent-cyan/10 text-accent-cyan"
                  : "hover:bg-background-secondary"
              )}
            >
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>All Team Members</span>
              </div>
              {!selectedUserId && <Check className="h-4 w-4" />}
            </button>

            <div className="my-2 h-px bg-border" />

            {/* Individual users */}
            <div className="max-h-64 overflow-y-auto">
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => {
                    onUserChange(user.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
                    selectedUserId === user.id
                      ? "bg-accent-cyan/10 text-accent-cyan"
                      : "hover:bg-background-secondary"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-background-tertiary text-xs font-medium">
                      {user.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </div>
                    <div className="text-left">
                      <div className="font-medium">{user.name}</div>
                      <div className="text-xs text-foreground-muted">{user.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("rounded-full px-2 py-0.5 text-xs", getLevelBadgeColor(user.engineerLevel))}>
                      {user.engineerLevel}
                    </span>
                    {selectedUserId === user.id && <Check className="h-4 w-4" />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
