"use client";

import { cn } from "@/lib/utils/cn";

type Role = "admin" | "developer" | "viewer";

interface RoleBadgeProps {
  role: Role;
  size?: "sm" | "md";
}

const roleConfig: Record<Role, { label: string; className: string }> = {
  admin: {
    label: "Admin",
    className: "bg-accent-purple/10 text-accent-purple border-accent-purple/20",
  },
  developer: {
    label: "Developer",
    className: "bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20",
  },
  viewer: {
    label: "Viewer",
    className: "bg-accent-yellow/10 text-accent-yellow border-accent-yellow/20",
  },
};

export function RoleBadge({ role, size = "sm" }: RoleBadgeProps) {
  const config = roleConfig[role];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        config.className,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
      )}
    >
      {config.label}
    </span>
  );
}
