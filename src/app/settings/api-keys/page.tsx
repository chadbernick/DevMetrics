import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { ApiKeysManager } from "@/components/settings/api-keys-manager";

async function getApiKeys() {
  // For MVP, get first user's keys
  const user = await db.query.users.findFirst();
  if (!user) return { keys: [], userId: null };

  const keys = await db.query.apiKeys.findMany({
    where: eq(schema.apiKeys.userId, user.id),
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
    userId: user.id,
  };
}

export default async function ApiKeysPage() {
  const { keys, userId } = await getApiKeys();

  if (!userId) {
    return (
      <div className="text-center py-12 text-foreground-muted">
        No user found. Please run the seed script first.
      </div>
    );
  }

  return <ApiKeysManager initialKeys={keys} userId={userId} />;
}
