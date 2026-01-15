/**
 * Kiro Integration Types
 */

export interface KiroIngestRequest {
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
