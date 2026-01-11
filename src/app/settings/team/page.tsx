import { db } from "@/lib/db";
import { TeamManager } from "@/components/settings/team-manager";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";

async function getAllUsers() {
  const users = await db.query.users.findMany({
    orderBy: (users, { asc }) => [asc(users.name)],
  });
  return users;
}

async function getAllInvitations() {
  const invitations = await db.query.invitations.findMany({
    orderBy: (invitations, { desc }) => [desc(invitations.createdAt)],
  });

  // Get creator names
  const creators = await db.query.users.findMany();
  const creatorMap = new Map(creators.map((c) => [c.id, c.name]));

  return invitations.map((inv) => ({
    id: inv.id,
    email: inv.email,
    role: inv.role as "admin" | "developer" | "viewer",
    engineerLevel: inv.engineerLevel as
      | "junior"
      | "mid"
      | "senior"
      | "staff"
      | "principal",
    tokenPrefix: inv.tokenPrefix,
    status: inv.status as "pending" | "accepted" | "expired" | "revoked",
    createdBy: inv.createdBy,
    createdByName: creatorMap.get(inv.createdBy) ?? "Unknown",
    expiresAt: inv.expiresAt,
    createdAt: inv.createdAt,
  }));
}

export default async function TeamPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  // Check if user is admin
  if (currentUser.role !== "admin") {
    return (
      <Card className="max-w-md mx-auto mt-12">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-red/10 mx-auto mb-4">
              <ShieldAlert className="h-6 w-6 text-accent-red" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-sm text-foreground-muted">
              You need admin privileges to manage team members. Contact your
              administrator if you need access.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const [users, invitations] = await Promise.all([
    getAllUsers(),
    getAllInvitations(),
  ]);

  return (
    <TeamManager
      currentUser={{
        id: currentUser.id,
        role: currentUser.role as "admin" | "developer" | "viewer",
      }}
      initialUsers={users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role as "admin" | "developer" | "viewer",
        engineerLevel: u.engineerLevel as
          | "junior"
          | "mid"
          | "senior"
          | "staff"
          | "principal",
        isActive: u.isActive,
        createdAt: u.createdAt,
      }))}
      initialInvitations={invitations}
    />
  );
}
