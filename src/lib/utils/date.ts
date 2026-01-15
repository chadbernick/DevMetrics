/**
 * Date Utilities
 *
 * Single source of truth for date formatting and parsing.
 * Used across ingest routes, webhooks, OTLP parsing, and integration handlers.
 */

/**
 * Get date string in YYYY-MM-DD format using local timezone.
 * This ensures metrics are aggregated to the correct day from the user's perspective.
 */
export function getDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parse a YYYY-MM-DD date string back to a Date object.
 * Returns the date at midnight local time.
 */
export function getDateFromString(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Get the start of day (midnight) for a given date.
 */
export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Get the end of day (23:59:59.999) for a given date.
 */
export function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}
