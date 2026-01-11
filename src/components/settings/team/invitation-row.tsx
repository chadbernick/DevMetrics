"use client";

import { useState } from "react";
import { Mail, Copy, Check, Trash2, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { RoleBadge } from "./role-badge";

type Role = "admin" | "developer" | "viewer";
type Status = "pending" | "accepted" | "expired" | "revoked";

interface InvitationData {
  id: string;
  email: string;
  role: Role;
  tokenPrefix: string;
  status: Status;
  createdByName: string;
  expiresAt: Date;
  createdAt: Date;
}

interface InvitationRowProps {
  invitation: InvitationData;
  onRevoke: (invitationId: string) => Promise<boolean>;
  onCopyLink?: (invitationId: string) => void;
}

const statusConfig: Record<Status, { label: string; className: string }> = {
  pending: {
    label: "Pending",
    className: "bg-accent-yellow/10 text-accent-yellow border-accent-yellow/20",
  },
  accepted: {
    label: "Accepted",
    className: "bg-accent-green/10 text-accent-green border-accent-green/20",
  },
  expired: {
    label: "Expired",
    className: "bg-foreground-muted/10 text-foreground-muted border-foreground-muted/20",
  },
  revoked: {
    label: "Revoked",
    className: "bg-accent-red/10 text-accent-red border-accent-red/20",
  },
};

function formatTimeRemaining(expiresAt: Date): string {
  const now = new Date();
  const diff = expiresAt.getTime() - now.getTime();

  if (diff <= 0) return "Expired";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h remaining`;
  return "< 1h remaining";
}

export function InvitationRow({
  invitation,
  onRevoke,
  onCopyLink,
}: InvitationRowProps) {
  const [revoking, setRevoking] = useState(false);
  const [copied, setCopied] = useState(false);

  const isPending = invitation.status === "pending";
  const isExpired =
    invitation.status === "expired" ||
    (isPending && new Date(invitation.expiresAt) < new Date());
  const status = isExpired ? "expired" : invitation.status;
  const statusStyle = statusConfig[status];

  const handleRevoke = async () => {
    setRevoking(true);
    await onRevoke(invitation.id);
    setRevoking(false);
  };

  const handleCopyLink = () => {
    if (onCopyLink) {
      onCopyLink(invitation.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border p-4",
        status !== "pending" && "opacity-60"
      )}
    >
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full",
            isPending && !isExpired
              ? "bg-accent-yellow/10 text-accent-yellow"
              : "bg-foreground-muted/10 text-foreground-muted"
          )}
        >
          <Mail className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium">{invitation.email}</p>
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                statusStyle.className
              )}
            >
              {statusStyle.label}
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm text-foreground-muted">
            <span>Invited by {invitation.createdByName}</span>
            <span>
              {new Date(invitation.createdAt).toLocaleDateString()}
            </span>
            {isPending && !isExpired && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTimeRemaining(new Date(invitation.expiresAt))}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <RoleBadge role={invitation.role} />

        {isPending && !isExpired && (
          <>
            {onCopyLink && (
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-background-secondary transition-colors"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-accent-green" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? "Copied!" : "Copy Link"}
              </button>
            )}
            <button
              onClick={handleRevoke}
              disabled={revoking}
              className="flex items-center gap-2 rounded-lg border border-accent-red/20 px-3 py-1.5 text-sm text-accent-red hover:bg-accent-red/10 transition-colors disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              {revoking ? "Revoking..." : "Revoke"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
