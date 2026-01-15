/**
 * GitHub Copilot Integration Types
 */

export interface CopilotMetricsResponse {
  date: string;
  total_active_users: number;
  total_engaged_users: number;
  copilot_ide_code_completions?: {
    total_engaged_users: number;
    editors?: Array<{
      name: string;
      total_engaged_users: number;
      models?: Array<{
        name: string;
        total_engaged_users: number;
        languages?: Array<{
          name: string;
          total_code_suggestions: number;
          total_code_acceptances: number;
          total_code_lines_suggested: number;
          total_code_lines_accepted: number;
        }>;
      }>;
    }>;
  };
  copilot_ide_chat?: {
    total_engaged_users: number;
    editors?: Array<{
      name: string;
      total_engaged_users: number;
      models?: Array<{
        name: string;
        total_chats: number;
        total_chat_insertion_events: number;
        total_chat_copy_events: number;
      }>;
    }>;
  };
}

export interface SyncResult {
  success: boolean;
  daysProcessed: number;
  error?: string;
}
