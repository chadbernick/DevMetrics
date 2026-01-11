import { db, schema } from "@/lib/db";
import { ProfileForm } from "@/components/settings/profile-form";

async function getDefaultUser() {
  const user = await db.query.users.findFirst();
  return user;
}

async function getTeams() {
  const teams = await db.query.teams.findMany();
  return teams;
}

export default async function ProfilePage() {
  const [user, teams] = await Promise.all([getDefaultUser(), getTeams()]);

  if (!user) {
    return (
      <div className="text-center py-12 text-foreground-muted">
        No user found. Please run the seed script first.
      </div>
    );
  }

  return (
    <ProfileForm
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        engineerLevel: user.engineerLevel,
        teamId: user.teamId,
      }}
      teams={teams.map((t) => ({ id: t.id, name: t.name }))}
    />
  );
}
