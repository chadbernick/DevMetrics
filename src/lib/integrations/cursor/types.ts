/**
 * Cursor Integration Types
 */

export interface CursorIngestRequest {
  sessions?: number;
  inputTokens?: number;
  outputTokens?: number;
  linesAdded?: number;
  date?: string;
}

export interface IngestResult {
  success: boolean;
  error?: string;
}
