"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, Mail, Plus, UserCheck } from "lucide-react";
import { UserRow } from "./team/user-row";
import { InvitationRow } from "./team/invitation-row";
import { InviteModal } from "./team/invite-modal";

type Role = "admin" | "developer" | "viewer";
type EngineerLevel = "junior" | "mid" | "senior" | "staff" | "principal";
type InvitationStatus = "pending" | "accepted" | "expired" | "revoked";

interface UserData {
  id: string;
  email: string;
  name: string;
  role: Role;
  engineerLevel: EngineerLevel;
  isActive: boolean;
  createdAt: Date;
}

interface InvitationData {
  id: string;
  email: string;
  role: Role;
  engineerLevel: EngineerLevel;
  tokenPrefix: string;
  status: InvitationStatus;
  createdBy: string;
  createdByName: string;
  expiresAt: Date;
  createdAt: Date;
}

interface TeamManagerProps {
  currentUser: {
    id: string;
    role: Role;
  };
  initialUsers: UserData[];
  initialInvitations: InvitationData[];
}

export function TeamManager({
  currentUser,
  initialUsers,
  initialInvitations,
}: TeamManagerProps) {
  const [users, setUsers] = useState<UserData[]>(initialUsers);
  const [invitations, setInvitations] =
    useState<InvitationData[]>(initialInvitations);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteLinks, setInviteLinks] = useState<Record<string, string>>({});

  const activeUsers = users.filter((u) => u.isActive);
  const inactiveUsers = users.filter((u) => !u.isActive);
  const pendingInvitations = invitations.filter(
    (i) => i.status === "pending" && new Date(i.expiresAt) > new Date()
  );

  const handleUpdateUser = async (
    userId: string,
    updates: Partial<UserData>
  ): Promise<boolean> => {
    try {
      const response = await fetch(`/api/v1/team/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (data.success) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId
              ? {
                  ...u,
                  ...updates,
                  updatedAt: new Date(),
                }
              : u
          )
        );
        return true;
      } else {
        console.error("Failed to update user:", data.error);
        return false;
      }
    } catch (error) {
      console.error("Error updating user:", error);
      return false;
    }
  };

  const handleCreateInvitation = async (data: {
    email: string;
    role: Role;
    engineerLevel: EngineerLevel;
    expiresInDays: number;
  }): Promise<{ success: boolean; inviteLink?: string; error?: string }> => {
    try {
      const response = await fetch("/api/v1/team/invitations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        const newInvitation: InvitationData = {
          id: result.invitation.id,
          email: data.email,
          role: data.role,
          engineerLevel: data.engineerLevel,
          tokenPrefix: result.invitation.tokenPrefix,
          status: "pending",
          createdBy: currentUser.id,
          createdByName: "You",
          expiresAt: new Date(result.invitation.expiresAt),
          createdAt: new Date(),
        };

        setInvitations((prev) => [newInvitation, ...prev]);
        setInviteLinks((prev) => ({
          ...prev,
          [result.invitation.id]: result.invitation.inviteLink,
        }));

        return { success: true, inviteLink: result.invitation.inviteLink };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error("Error creating invitation:", error);
      return { success: false, error: "Failed to create invitation" };
    }
  };

  const handleCreateUser = async (data: {
    email: string;
    name: string;
    role: Role;
    engineerLevel: EngineerLevel;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch("/api/v1/team/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        const newUser: UserData = {
          id: result.user.id,
          email: data.email,
          name: data.name,
          role: data.role,
          engineerLevel: data.engineerLevel,
          isActive: true,
          createdAt: new Date(),
        };

        setUsers((prev) => [...prev, newUser]);
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error("Error creating user:", error);
      return { success: false, error: "Failed to create user" };
    }
  };

  const handleRevokeInvitation = async (
    invitationId: string
  ): Promise<boolean> => {
    try {
      const response = await fetch(
        `/api/v1/team/invitations/${invitationId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (data.success) {
        setInvitations((prev) =>
          prev.map((i) =>
            i.id === invitationId ? { ...i, status: "revoked" as const } : i
          )
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error revoking invitation:", error);
      return false;
    }
  };

  const handleCopyInviteLink = (invitationId: string) => {
    const link = inviteLinks[invitationId];
    if (link) {
      navigator.clipboard.writeText(link);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Invite Modal */}
      {showInviteModal && (
        <InviteModal
          onClose={() => setShowInviteModal(false)}
          onCreateInvitation={handleCreateInvitation}
          onCreateUser={handleCreateUser}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Team Management</h2>
          <p className="text-sm text-foreground-secondary">
            Invite and manage team members
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 rounded-lg bg-accent-cyan px-4 py-2 text-sm font-medium text-white hover:bg-accent-cyan/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Member
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-cyan/10">
                <UserCheck className="h-5 w-5 text-accent-cyan" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeUsers.length}</p>
                <p className="text-sm text-foreground-muted">Active Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-yellow/10">
                <Mail className="h-5 w-5 text-accent-yellow" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingInvitations.length}</p>
                <p className="text-sm text-foreground-muted">
                  Pending Invitations
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-foreground-muted/10">
                <Users className="h-5 w-5 text-foreground-muted" />
              </div>
              <div>
                <p className="text-2xl font-bold">{inactiveUsers.length}</p>
                <p className="text-sm text-foreground-muted">Deactivated</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members ({activeUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeUsers.length === 0 ? (
            <div className="text-center py-8 text-foreground-muted">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No active team members</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeUsers.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  currentUserId={currentUser.id}
                  onUpdate={handleUpdateUser}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Pending Invitations ({pendingInvitations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingInvitations.map((invitation) => (
                <InvitationRow
                  key={invitation.id}
                  invitation={invitation}
                  onRevoke={handleRevokeInvitation}
                  onCopyLink={
                    inviteLinks[invitation.id]
                      ? handleCopyInviteLink
                      : undefined
                  }
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deactivated Users */}
      {inactiveUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground-muted">
              Deactivated Users ({inactiveUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {inactiveUsers.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  currentUserId={currentUser.id}
                  onUpdate={handleUpdateUser}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
