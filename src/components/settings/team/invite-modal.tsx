"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  X,
  Link as LinkIcon,
  UserPlus,
  Copy,
  Check,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Role = "admin" | "developer" | "viewer";
type EngineerLevel = "junior" | "mid" | "senior" | "staff" | "principal";
type TabType = "invite" | "create";

interface InviteModalProps {
  onClose: () => void;
  onCreateInvitation: (data: {
    email: string;
    role: Role;
    engineerLevel: EngineerLevel;
    expiresInDays: number;
  }) => Promise<{ success: boolean; inviteLink?: string; error?: string }>;
  onCreateUser: (data: {
    email: string;
    name: string;
    role: Role;
    engineerLevel: EngineerLevel;
  }) => Promise<{ success: boolean; error?: string }>;
}

export function InviteModal({
  onClose,
  onCreateInvitation,
  onCreateUser,
}: InviteModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("invite");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("developer");
  const [engineerLevel, setEngineerLevel] = useState<EngineerLevel>("mid");
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (activeTab === "invite") {
      const result = await onCreateInvitation({
        email,
        role,
        engineerLevel,
        expiresInDays,
      });

      if (result.success && result.inviteLink) {
        setInviteLink(result.inviteLink);
      } else {
        setError(result.error ?? "Failed to create invitation");
      }
    } else {
      const result = await onCreateUser({
        email,
        name,
        role,
        engineerLevel,
      });

      if (result.success) {
        setCreateSuccess(true);
      } else {
        setError(result.error ?? "Failed to create user");
      }
    }

    setLoading(false);
  };

  const copyToClipboard = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const resetForm = () => {
    setEmail("");
    setName("");
    setRole("developer");
    setEngineerLevel("mid");
    setExpiresInDays(7);
    setError(null);
    setInviteLink(null);
    setCreateSuccess(false);
  };

  // Show invite link success state
  if (inviteLink) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <Card className="w-full max-w-lg mx-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-accent-cyan" />
              Invitation Created
            </CardTitle>
            <button
              onClick={onClose}
              className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-background-secondary transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-accent-yellow/10 border border-accent-yellow/20 p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-accent-yellow shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-accent-yellow">
                    Share this link
                  </p>
                  <p className="text-foreground-secondary mt-1">
                    Send this invitation link to {email}. It expires in{" "}
                    {expiresInDays} days.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Invitation Link
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-lg bg-background-tertiary px-4 py-3 font-mono text-sm break-all">
                  {inviteLink}
                </code>
                <button
                  onClick={copyToClipboard}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-border hover:bg-background-secondary transition-colors shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-accent-green" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  resetForm();
                }}
                className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-background-secondary transition-colors"
              >
                Invite Another
              </button>
              <button
                onClick={onClose}
                className="flex-1 rounded-lg bg-accent-cyan px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-cyan/90 transition-colors"
              >
                Done
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show create user success state
  if (createSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <Card className="w-full max-w-lg mx-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-accent-green" />
              User Created
            </CardTitle>
            <button
              onClick={onClose}
              className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-background-secondary transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-accent-green/10 border border-accent-green/20 p-4">
              <p className="text-sm">
                <span className="font-medium">{name}</span> ({email}) has been
                added as a {role}.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  resetForm();
                }}
                className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-background-secondary transition-colors"
              >
                Add Another
              </button>
              <button
                onClick={onClose}
                className="flex-1 rounded-lg bg-accent-cyan px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-cyan/90 transition-colors"
              >
                Done
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-lg mx-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Add Team Member</CardTitle>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-background-secondary transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </CardHeader>
        <CardContent>
          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => {
                setActiveTab("invite");
                setError(null);
              }}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                activeTab === "invite"
                  ? "bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20"
                  : "border border-border hover:bg-background-secondary"
              )}
            >
              <LinkIcon className="h-4 w-4" />
              Invite Link
            </button>
            <button
              onClick={() => {
                setActiveTab("create");
                setError(null);
              }}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                activeTab === "create"
                  ? "bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20"
                  : "border border-border hover:bg-background-secondary"
              )}
            >
              <UserPlus className="h-4 w-4" />
              Create User
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-accent-red/10 border border-accent-red/20 p-3 text-sm text-accent-red">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@company.com"
                required
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-accent-cyan focus:outline-none focus:ring-1 focus:ring-accent-cyan"
              />
            </div>

            {activeTab === "create" && (
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium mb-2"
                >
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  required
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-accent-cyan focus:outline-none focus:ring-1 focus:ring-accent-cyan"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="role"
                  className="block text-sm font-medium mb-2"
                >
                  Role
                </label>
                <div className="relative">
                  <select
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as Role)}
                    className="w-full appearance-none rounded-lg border border-border bg-background pl-4 pr-10 py-2.5 text-sm focus:border-accent-cyan focus:outline-none focus:ring-1 focus:ring-accent-cyan"
                  >
                    <option value="developer">Developer</option>
                    <option value="viewer">Viewer</option>
                    <option value="admin">Admin</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted pointer-events-none" />
                </div>
              </div>

              <div>
                <label
                  htmlFor="engineerLevel"
                  className="block text-sm font-medium mb-2"
                >
                  Level
                </label>
                <div className="relative">
                  <select
                    id="engineerLevel"
                    value={engineerLevel}
                    onChange={(e) =>
                      setEngineerLevel(e.target.value as EngineerLevel)
                    }
                    className="w-full appearance-none rounded-lg border border-border bg-background pl-4 pr-10 py-2.5 text-sm focus:border-accent-cyan focus:outline-none focus:ring-1 focus:ring-accent-cyan"
                  >
                    <option value="junior">Junior</option>
                    <option value="mid">Mid</option>
                    <option value="senior">Senior</option>
                    <option value="staff">Staff</option>
                    <option value="principal">Principal</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted pointer-events-none" />
                </div>
              </div>
            </div>

            {activeTab === "invite" && (
              <div>
                <label
                  htmlFor="expires"
                  className="block text-sm font-medium mb-2"
                >
                  Expires In
                </label>
                <div className="relative">
                  <select
                    id="expires"
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(Number(e.target.value))}
                    className="w-full appearance-none rounded-lg border border-border bg-background pl-4 pr-10 py-2.5 text-sm focus:border-accent-cyan focus:outline-none focus:ring-1 focus:ring-accent-cyan"
                  >
                    <option value={1}>1 day</option>
                    <option value={3}>3 days</option>
                    <option value={7}>7 days</option>
                    <option value={14}>14 days</option>
                    <option value={30}>30 days</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted pointer-events-none" />
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-background-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !email || (activeTab === "create" && !name)}
                className="flex-1 rounded-lg bg-accent-cyan px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-cyan/90 transition-colors disabled:opacity-50"
              >
                {loading
                  ? activeTab === "invite"
                    ? "Creating..."
                    : "Creating..."
                  : activeTab === "invite"
                    ? "Create Invitation"
                    : "Create User"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
