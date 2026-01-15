/**
 * Authentication Utilities - Shared Across All Integrations
 *
 * Provides consistent user authentication for all integration endpoints.
 */

import { NextRequest } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

/**
 * Authentication result
 */
export interface AuthResult {
  success: true;
  userId: string;
}

/**
 * Authentication error
 */
export interface AuthError {
  success: false;
  error: string;
  status: 401;
}

/**
 * Authenticate a user from request parameters
 *
 * Checks for user ID in:
 * 1. Query parameter: ?user=<uuid>
 * 2. Header: x-user-id
 *
 * @param request - The incoming request
 * @returns AuthResult on success, AuthError on failure
 */
export async function authenticateUser(
  request: NextRequest
): Promise<AuthResult | AuthError> {
  const url = new URL(request.url);
  const userIdParam =
    url.searchParams.get("user") ?? request.headers.get("x-user-id");

  if (!userIdParam) {
    return {
      success: false,
      error:
        "Authentication required. Include ?user=<uuid> parameter in endpoint URL. Find your UUID in Settings > Integrations.",
      status: 401,
    };
  }

  // Look up user by UUID
  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, userIdParam),
  });

  if (!user) {
    return {
      success: false,
      error: `User with ID '${userIdParam}' not found`,
      status: 401,
    };
  }

  return {
    success: true,
    userId: user.id,
  };
}

/**
 * Generate a unique request ID with integration prefix
 *
 * @param integrationPrefix - Short prefix for the integration (e.g., "claude", "gemini")
 * @returns A unique request ID
 */
export function generateRequestId(integrationPrefix: string): string {
  return `${integrationPrefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}
