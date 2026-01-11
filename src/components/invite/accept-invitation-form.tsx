"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { UserPlus, Loader2, Check } from "lucide-react";
import { RoleBadge } from "@/components/settings/team/role-badge";

type Role = "admin" | "developer" | "viewer";
type EngineerLevel = "junior" | "mid" | "senior" | "staff" | "principal";

interface AcceptInvitationFormProps {
  token: string;
  invitation: {
    email: string;
    role: Role;
    engineerLevel: EngineerLevel;
    expiresAt: Date;
  };
}

const engineerLevelLabels: Record<EngineerLevel, string> = {
  junior: "Junior",
  mid: "Mid",
  senior: "Senior",
  staff: "Staff",
  principal: "Principal",
};

export function AcceptInvitationForm({
  token,
  invitation,
}: AcceptInvitationFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/team/invitations/accept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, name }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        // Redirect after a short delay
        setTimeout(() => {
          router.push("/settings/profile");
        }, 2000);
      } else {
        setError(data.error || "Failed to accept invitation");
      }
    } catch (err) {
      setError("Failed to accept invitation. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-green/10 mx-auto mb-4">
              <Check className="h-6 w-6 text-accent-green" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Welcome aboard!</h3>
            <p className="text-sm text-foreground-muted">
              Your account has been created. Redirecting you to your profile...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-accent-cyan" />
          Accept Invitation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6 space-y-3">
          <div className="flex items-center justify-between rounded-lg bg-background-secondary p-3">
            <span className="text-sm text-foreground-muted">Email</span>
            <span className="font-medium">{invitation.email}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-background-secondary p-3">
            <span className="text-sm text-foreground-muted">Role</span>
            <RoleBadge role={invitation.role} />
          </div>
          <div className="flex items-center justify-between rounded-lg bg-background-secondary p-3">
            <span className="text-sm text-foreground-muted">Level</span>
            <span className="font-medium">
              {engineerLevelLabels[invitation.engineerLevel]}
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-accent-red/10 border border-accent-red/20 p-3 text-sm text-accent-red">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2">
              Your Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              required
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-accent-cyan focus:outline-none focus:ring-1 focus:ring-accent-cyan"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full rounded-lg bg-accent-cyan px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-cyan/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              "Accept & Create Account"
            )}
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
