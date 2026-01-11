import { db, schema } from "@/lib/db";
import { ProfileForm } from "@/components/settings/profile-form";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";

async function getTeams() {
  const teams = await db.query.teams.findMany();
  return teams;
}

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const teams = await getTeams();

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
