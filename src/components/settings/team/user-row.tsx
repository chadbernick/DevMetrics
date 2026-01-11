"use client";

import { useState } from "react";
import { User, ChevronDown, Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { RoleBadge } from "./role-badge";

type Role = "admin" | "developer" | "viewer";
type EngineerLevel = "junior" | "mid" | "senior" | "staff" | "principal";

interface UserData {
  id: string;
  email: string;
  name: string;
  role: Role;
  engineerLevel: EngineerLevel;
  isActive: boolean;
  createdAt: Date;
}

interface UserRowProps {
  user: UserData;
  currentUserId: string;
  onUpdate: (userId: string, updates: Partial<UserData>) => Promise<boolean>;
}

const engineerLevelLabels: Record<EngineerLevel, string> = {
  junior: "Junior",
  mid: "Mid",
  senior: "Senior",
  staff: "Staff",
  principal: "Principal",
};

export function UserRow({ user, currentUserId, onUpdate }: UserRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [role, setRole] = useState<Role>(user.role);
  const [engineerLevel, setEngineerLevel] = useState<EngineerLevel>(
    user.engineerLevel
  );
  const [isActive, setIsActive] = useState(user.isActive);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCurrentUser = user.id === currentUserId;
  const hasChanges =
    role !== user.role ||
    engineerLevel !== user.engineerLevel ||
    isActive !== user.isActive;

  const handleSave = async () => {
    if (!hasChanges) {
      setIsEditing(false);
      return;
    }

    setSaving(true);
    setError(null);

    const updates: Partial<UserData> = {};
    if (role !== user.role) updates.role = role;
    if (engineerLevel !== user.engineerLevel)
      updates.engineerLevel = engineerLevel;
    if (isActive !== user.isActive) updates.isActive = isActive;

    const success = await onUpdate(user.id, updates);

    if (success) {
      setIsEditing(false);
    } else {
      setError("Failed to save changes");
      // Revert to original values
      setRole(user.role);
      setEngineerLevel(user.engineerLevel);
      setIsActive(user.isActive);
    }

    setSaving(false);
  };

  const handleCancel = () => {
    setRole(user.role);
    setEngineerLevel(user.engineerLevel);
    setIsActive(user.isActive);
    setIsEditing(false);
    setError(null);
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border p-4 transition-colors",
        !user.isActive && "opacity-60 bg-background-secondary/50",
        isEditing && "border-accent-cyan/50 bg-background-secondary/30"
      )}
    >
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full",
            user.isActive
              ? "bg-accent-cyan/10 text-accent-cyan"
              : "bg-foreground-muted/10 text-foreground-muted"
          )}
        >
          <User className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium">{user.name}</p>
            {isCurrentUser && (
              <span className="text-xs text-foreground-muted">(you)</span>
            )}
            {!user.isActive && (
              <span className="text-xs text-accent-red">Deactivated</span>
            )}
          </div>
          <p className="text-sm text-foreground-muted">{user.email}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {isEditing ? (
          <>
            {/* Role Select */}
            <div className="relative">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                disabled={isCurrentUser}
                className="appearance-none rounded-lg border border-border bg-background pl-3 pr-8 py-1.5 text-sm focus:border-accent-cyan focus:outline-none focus:ring-1 focus:ring-accent-cyan disabled:opacity-50"
              >
                <option value="admin">Admin</option>
                <option value="developer">Developer</option>
                <option value="viewer">Viewer</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted pointer-events-none" />
            </div>

            {/* Engineer Level Select */}
            <div className="relative">
              <select
                value={engineerLevel}
                onChange={(e) =>
                  setEngineerLevel(e.target.value as EngineerLevel)
                }
                className="appearance-none rounded-lg border border-border bg-background pl-3 pr-8 py-1.5 text-sm focus:border-accent-cyan focus:outline-none focus:ring-1 focus:ring-accent-cyan"
              >
                <option value="junior">Junior</option>
                <option value="mid">Mid</option>
                <option value="senior">Senior</option>
                <option value="staff">Staff</option>
                <option value="principal">Principal</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted pointer-events-none" />
            </div>

            {/* Active Toggle */}
            <button
              onClick={() => setIsActive(!isActive)}
              disabled={isCurrentUser}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent-green/10 text-accent-green border border-accent-green/20"
                  : "bg-accent-red/10 text-accent-red border border-accent-red/20",
                isCurrentUser && "opacity-50 cursor-not-allowed"
              )}
            >
              {isActive ? "Active" : "Inactive"}
            </button>

            {/* Save/Cancel */}
            <div className="flex items-center gap-1 ml-2">
              <button
                onClick={handleSave}
                disabled={saving || !hasChanges}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-cyan text-white hover:bg-accent-cyan/90 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-background-secondary transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </>
        ) : (
          <>
            <span className="text-sm text-foreground-muted">
              {engineerLevelLabels[user.engineerLevel]}
            </span>
            <RoleBadge role={user.role} />
            <button
              onClick={() => setIsEditing(true)}
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-background-secondary transition-colors"
            >
              Edit
            </button>
          </>
        )}
      </div>

      {error && (
        <div className="absolute -bottom-6 right-0 text-xs text-accent-red">
          {error}
        </div>
      )}
    </div>
  );
}
