/**
 * GitHub Webhook Signature Verification
 *
 * Verifies GitHub webhook signatures using timing-safe comparison.
 */

import { createHmac, timingSafeEqual } from "crypto";

/**
 * Verify GitHub webhook signature using timing-safe comparison
 *
 * @param payload - The raw request body as a string
 * @param signature - The X-Hub-Signature-256 header value
 * @param secret - The webhook secret configured in GitHub
 * @returns true if signature is valid, false otherwise
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  // If no secret configured, log warning and reject (fail closed)
  if (!secret) {
    console.warn("GITHUB_WEBHOOK_SECRET not configured - rejecting webhook");
    return false;
  }

  // Signature is required when secret is configured
  if (!signature) {
    return false;
  }

  const expected = `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;

  // Use timing-safe comparison to prevent timing attacks
  try {
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);

    // Buffers must be same length for timingSafeEqual
    if (sigBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(sigBuffer, expectedBuffer);
  } catch {
    return false;
  }
}
