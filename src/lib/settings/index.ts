/**
 * Settings Service
 *
 * Type-safe accessors for application settings stored in the settings table.
 * Removes hardcoded settings keys and provides consistent default values.
 */

import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

/**
 * Get a setting by key with a typed default value
 */
export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const setting = await db.query.settings.findFirst({
      where: eq(schema.settings.key, key),
    });

    if (!setting?.value) {
      return defaultValue;
    }

    // The value is already parsed as JSON by drizzle (mode: "json")
    return setting.value as T;
  } catch (error) {
    console.error(`Failed to get setting "${key}":`, error);
    return defaultValue;
  }
}

/**
 * Set a setting value (upsert)
 */
export async function setSetting<T>(key: string, value: T, description?: string): Promise<void> {
  try {
    await db
      .insert(schema.settings)
      .values({
        key,
        value: value as object,
        description,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: schema.settings.key,
        set: {
          value: value as object,
          description: description ?? undefined,
          updatedAt: new Date(),
        },
      });
  } catch (error) {
    console.error(`Failed to set setting "${key}":`, error);
    throw error;
  }
}

/**
 * Delete a setting by key
 */
export async function deleteSetting(key: string): Promise<void> {
  try {
    await db.delete(schema.settings).where(eq(schema.settings.key, key));
  } catch (error) {
    console.error(`Failed to delete setting "${key}":`, error);
    throw error;
  }
}

/**
 * Get all settings matching a key prefix
 */
export async function getSettingsByPrefix(prefix: string): Promise<Record<string, unknown>> {
  try {
    const settings = await db.query.settings.findMany();
    const result: Record<string, unknown> = {};

    for (const setting of settings) {
      if (setting.key.startsWith(prefix)) {
        result[setting.key] = setting.value;
      }
    }

    return result;
  } catch (error) {
    console.error(`Failed to get settings with prefix "${prefix}":`, error);
    return {};
  }
}
