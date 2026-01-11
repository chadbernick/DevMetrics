import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { IntegrationsGuide } from "@/components/settings/integrations-guide";

async function getUserApiKey() {
  const user = await db.query.users.findFirst();
  if (!user) return null;

  const apiKey = await db.query.apiKeys.findFirst({
    where: eq(schema.apiKeys.userId, user.id),
  });

  return apiKey?.keyPrefix ? `${apiKey.keyPrefix}...` : null;
}

export default async function IntegrationsPage() {
  const apiKeyPreview = await getUserApiKey();

  return <IntegrationsGuide apiKeyPreview={apiKeyPreview} />;
}
