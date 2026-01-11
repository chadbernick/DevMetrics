import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { ApiKeysManager } from "@/components/settings/api-keys-manager";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";

async function getApiKeys(userId: string) {
  const keys = await db.query.apiKeys.findMany({
    where: eq(schema.apiKeys.userId, userId),
    orderBy: (apiKeys, { desc }) => [desc(apiKeys.createdAt)],
  });

  return {
    keys: keys.map((k) => ({
      id: k.id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      createdAt: k.createdAt,
      lastUsedAt: k.lastUsedAt,
      isActive: k.isActive,
    })),
    userId,
  };
}

export default async function ApiKeysPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const { keys, userId } = await getApiKeys(user.id);

  return <ApiKeysManager initialKeys={keys} userId={userId} />;
}
