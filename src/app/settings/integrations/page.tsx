import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { IntegrationsGuide } from "@/components/settings/integrations-guide";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";

async function getUserData(userId: string, userName: string) {
  const apiKey = await db.query.apiKeys.findFirst({
    where: eq(schema.apiKeys.userId, userId),
  });

  return {
    apiKeyPreview: apiKey?.keyPrefix ? `${apiKey.keyPrefix}...` : null,
    userName: userName,
  };
}

export default async function IntegrationsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const { apiKeyPreview, userName } = await getUserData(user.id, user.name);

  return (
    <IntegrationsGuide apiKeyPreview={apiKeyPreview} userName={userName} />
  );
}
