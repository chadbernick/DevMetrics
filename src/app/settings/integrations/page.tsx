import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { IntegrationsGuide } from "@/components/settings/integrations-guide";

async function getUserData() {
  const user = await db.query.users.findFirst();
  if (!user) return { apiKeyPreview: null, userName: null };

  const apiKey = await db.query.apiKeys.findFirst({
    where: eq(schema.apiKeys.userId, user.id),
  });

  return {
    apiKeyPreview: apiKey?.keyPrefix ? `${apiKey.keyPrefix}...` : null,
    userName: user.name,
  };
}

export default async function IntegrationsPage() {
  const { apiKeyPreview, userName } = await getUserData();

  return (
    <IntegrationsGuide apiKeyPreview={apiKeyPreview} userName={userName} />
  );
}
